import { json, type LoaderFunction } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';

import { requireAuth } from '~/lib/.server/auth';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.check-env-key');

export const loader: LoaderFunction = async ({ context, request }) => {
  try {
    // Require authentication — prevents probing which server API keys are configured
    const authResult = await requireAuth(request, context);

    if (authResult instanceof Response) {
      return authResult;
    }

    const url = new URL(request.url);
    const provider = url.searchParams.get('provider');

    if (!provider) {
      return json({ isSet: false });
    }

    const processEnv = typeof process !== 'undefined' ? process.env : {};
    const serverEnv = Object.assign({}, processEnv, context?.cloudflare?.env || {}) as any;
    const llmManager = LLMManager.getInstance(serverEnv);
    const providerInstance = llmManager.getProvider(provider);

    if (!providerInstance || !providerInstance.config.apiTokenKey) {
      return json({ isSet: false });
    }

    const envVarName = providerInstance.config.apiTokenKey;

    /*
     * Check server-side env vars only — never check user cookies here to avoid leaking key presence info
     * Safe process.env access — Cloudflare Workers doesn't define `process`
     */
    const processEnvValue = (() => {
      try {
        return typeof process !== 'undefined' ? process.env[envVarName] : undefined;
      } catch {
        return undefined;
      }
    })();

    const isSet = !!(
      (context?.cloudflare?.env as Record<string, any>)?.[envVarName] ||
      processEnvValue ||
      llmManager.env[envVarName]
    );

    return json({ isSet });
  } catch (error) {
    logger.error('Unexpected error in check-env-key:', error);

    return json({ error: 'Internal server error', isSet: false }, { status: 500 });
  }
};
