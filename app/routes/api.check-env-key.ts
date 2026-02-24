import { getMergedServerEnv, getSystemEnv } from '~/utils/env';
import { json, type LoaderFunction } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';

import { requireAuth } from '~/lib/.server/auth';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.check-env-key');

type EnvValueState = 'missing' | 'empty' | 'present';

function getEnvValueState(value: unknown): EnvValueState {
  if (value === null || value === undefined) {
    return 'missing';
  }

  if (typeof value !== 'string') {
    return 'present';
  }

  if (value.trim().length === 0) {
    return 'empty';
  }

  return 'present';
}

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

    const serverEnv = getMergedServerEnv(context) as any;
    const llmManager = LLMManager.getInstance(serverEnv);
    const providerInstance = llmManager.getProvider(provider);

    if (!providerInstance || !providerInstance.config.apiTokenKey) {
      return json({ isSet: false });
    }

    const envVarName = providerInstance.config.apiTokenKey;

    /*
     * Check server-side env vars only — never check user cookies here to avoid leaking key presence info
     * Use getSystemEnv() for safe process access — Cloudflare Workers may not define `process`
     */
    const cloudflareEnvValue = (context?.cloudflare?.env as Record<string, any>)?.[envVarName];
    const processEnvValue = getSystemEnv()[envVarName];
    const llmManagerEnvValue = llmManager.env[envVarName];

    const isSet = !!(cloudflareEnvValue || processEnvValue || llmManagerEnvValue);

    if (!isSet) {
      logger.warn('Env key check failed (diagnostic):', {
        provider,
        envVarName,
        cloudflareEnv: getEnvValueState(cloudflareEnvValue),
        processEnv: getEnvValueState(processEnvValue),
        llmManagerEnv: getEnvValueState(llmManagerEnvValue),
      });
    }

    return json({ isSet });
  } catch (error) {
    logger.error('Unexpected error in check-env-key:', error);

    return json({ error: 'Internal server error', isSet: false }, { status: 500 });
  }
};
