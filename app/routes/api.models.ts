import { getMergedServerEnv } from '~/utils/env';
import { json } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { ProviderInfo } from '~/types/model';
import { getProviderSettingsFromCookie } from '~/lib/api/cookies';
import { requireAuth } from '~/lib/.server/auth';

interface ModelsResponse {
  modelList: ModelInfo[];
  providers: ProviderInfo[];
  defaultProvider: ProviderInfo;
}

let cachedProviders: ProviderInfo[] | null = null;
let cachedDefaultProvider: ProviderInfo | null = null;

function getProviderInfo(llmManager: LLMManager) {
  if (!cachedProviders) {
    cachedProviders = llmManager.getAllProviders().map((provider) => ({
      name: provider.name,
      staticModels: provider.staticModels,
      getApiKeyLink: provider.getApiKeyLink,
      labelForGetApiKey: provider.labelForGetApiKey,
      icon: provider.icon,
    }));
  }

  if (!cachedDefaultProvider) {
    const defaultProvider = llmManager.getDefaultProvider();
    cachedDefaultProvider = {
      name: defaultProvider.name,
      staticModels: defaultProvider.staticModels,
      getApiKeyLink: defaultProvider.getApiKeyLink,
      labelForGetApiKey: defaultProvider.labelForGetApiKey,
      icon: defaultProvider.icon,
    };
  }

  return { providers: cachedProviders, defaultProvider: cachedDefaultProvider };
}

export async function loader({
  request,
  params,
  context,
}: {
  request: Request;
  params: { provider?: string };
  context: {
    cloudflare?: {
      env: Record<string, string>;
    };
  };
}): Promise<Response> {
  // Require authentication — model listing reveals what providers are configured
  const authResult = await requireAuth(request, context);

  if (authResult instanceof Response) {
    return authResult;
  }

  const serverEnv = getMergedServerEnv(context) as any;
  const llmManager = LLMManager.getInstance(serverEnv);

  // Get client side maintained API keys and provider settings from cookies
  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = {}; // Force empty to prevent user-supplied keys from overriding server keys
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);

  const { providers, defaultProvider } = getProviderInfo(llmManager);

  let modelList: ModelInfo[] = [];

  if (params.provider) {
    // Only update models for the specific provider
    const provider = llmManager.getProvider(params.provider);

    if (provider) {
      modelList = await llmManager.getModelListFromProvider(provider, {
        apiKeys,
        providerSettings,
        serverEnv,
      });
    }
  } else {
    // Update all models
    modelList = await llmManager.updateModelList({
      apiKeys,
      providerSettings,
      serverEnv,
    });
  }

  return json<ModelsResponse>({
    modelList,
    providers,
    defaultProvider,
  });
}
