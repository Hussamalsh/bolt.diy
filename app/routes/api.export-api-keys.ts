import type { LoaderFunction } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';
import { getApiKeysFromCookie } from '~/lib/api/cookies';

/**
 * Mask a server-side secret so only the last 4 characters are visible.
 */
function maskKey(key: string): string {
  if (key.length <= 4) {
    return '****';
  }

  return '*'.repeat(key.length - 4) + key.slice(-4);
}

export const loader: LoaderFunction = async ({ context, request }) => {
  /*
   * User-provided API keys stored in cookies — these belong to the user and
   * are already accessible client-side, so returning them in plaintext is fine.
   */
  const cookieHeader = request.headers.get('Cookie');
  const apiKeysFromCookie = getApiKeysFromCookie(cookieHeader);

  const llmManager = LLMManager.getInstance(context?.cloudflare?.env as any);
  const providers = llmManager.getAllProviders();

  // Start with the user's own cookie-sourced keys (unmasked)
  const apiKeys: Record<string, string> = { ...apiKeysFromCookie };

  /*
   * For providers whose keys come from *server-side* environment variables,
   * only expose a masked representation — never send raw server secrets.
   */
  for (const provider of providers) {
    if (!provider.config.apiTokenKey) {
      continue;
    }

    // Skip if the user already supplied this key via cookie
    if (apiKeys[provider.name]) {
      continue;
    }

    const envVarName = provider.config.apiTokenKey;

    const envValue =
      (context?.cloudflare?.env as Record<string, any>)?.[envVarName] ||
      process.env[envVarName] ||
      llmManager.env[envVarName];

    if (envValue) {
      // Server secret — mask it so the client only sees that it's configured
      apiKeys[provider.name] = maskKey(envValue);
    }
  }

  return Response.json(apiKeys);
};
