import { json, type LoaderFunction } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';
import { requireAuth } from '~/lib/.server/auth';

/**
 * Replace any server-side secret with a non-sensitive placeholder.
 */
function maskKey(key: string): string {
  if (!key) {
    return '[SERVER_MANAGED]';
  }

  return '[SERVER_MANAGED]';
}

export const loader: LoaderFunction = async ({ context, request }) => {
  // Require authentication — user cookie keys belong to the owner; server keys must stay masked
  const authResult = await requireAuth(request, context);

  if (authResult instanceof Response) {
    return authResult;
  }

  /*
   * User-provided API keys stored in cookies are ignored in SaaS mode.
   * We no longer export them, to avoid confusion.
   */

  const llmManager = LLMManager.getInstance(context?.cloudflare?.env as any);
  const providers = llmManager.getAllProviders();

  // Start with empty keys (ignoring any user-supplied cookies)
  const apiKeys: Record<string, string> = {};

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

  return json(apiKeys);
};
