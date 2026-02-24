import { json, type LoaderFunction } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';
import { requireAdmin } from '~/lib/.server/auth';
import { getMergedServerEnv, getSystemEnv } from '~/utils/env';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.env-key-diagnostic');

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
    const authResult = await requireAdmin(request, context);

    if (authResult instanceof Response) {
      return authResult;
    }

    const url = new URL(request.url);
    const provider = url.searchParams.get('provider');

    if (!provider) {
      return json(
        {
          error: 'Missing provider query parameter',
          example: '/api/env-key-diagnostic?provider=OpenAI',
        },
        { status: 400 },
      );
    }

    const cloudflareEnv = ((context?.cloudflare?.env as unknown as Record<string, unknown> | undefined) ||
      {}) as Record<string, unknown>;

    const processEnv = getSystemEnv();
    const serverEnv = getMergedServerEnv(context);
    const llmManager = LLMManager.getInstance(serverEnv);
    const providerInstance = llmManager.getProvider(provider);
    const resolvedEnvVarName = providerInstance?.config.apiTokenKey ?? null;

    const cloudflareValue = resolvedEnvVarName ? cloudflareEnv[resolvedEnvVarName] : undefined;
    const processValue = resolvedEnvVarName ? processEnv[resolvedEnvVarName] : undefined;
    const mergedServerEnvValue = resolvedEnvVarName ? serverEnv[resolvedEnvVarName] : undefined;
    const llmManagerEnvValue = resolvedEnvVarName ? llmManager.env[resolvedEnvVarName] : undefined;

    const beforeLlmManager = {
      cloudflareEnv: getEnvValueState(cloudflareValue),
      processEnv: getEnvValueState(processValue),
      anyVisible: resolvedEnvVarName ? !!(cloudflareValue || processValue) : false,
    };

    const afterLlmManager = {
      mergedServerEnv: getEnvValueState(mergedServerEnvValue),
      llmManagerEnv: getEnvValueState(llmManagerEnvValue),
      anyVisible: resolvedEnvVarName ? !!(mergedServerEnvValue || llmManagerEnvValue) : false,
    };

    const diagnostic = {
      provider,
      providerFound: !!providerInstance,
      providerHasApiTokenKey: !!providerInstance?.config.apiTokenKey,
      resolvedEnvVarName,
      beforeLlmManager,
      afterLlmManager,
      isSetUsingCheckEnvKeyLogic: resolvedEnvVarName
        ? !!(cloudflareValue || processValue || llmManagerEnvValue)
        : false,
    };

    logger.info('Env key diagnostic result:', diagnostic);

    return json(diagnostic);
  } catch (error) {
    logger.error('Unexpected error in env key diagnostic:', error);

    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
