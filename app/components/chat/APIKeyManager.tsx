import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { IconButton } from '~/components/ui/IconButton';
import type { ProviderInfo } from '~/types/model';
import { getAuthHeaders } from '~/lib/auth-client';
import { authLoadingStore, userStore } from '~/lib/stores/auth';

interface APIKeyManagerProps {
  provider: ProviderInfo;
}

// cache which stores whether the provider's API key is set via environment variable
const providerEnvKeyStatusCache: Record<string, boolean> = {};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const APIKeyManager: React.FC<APIKeyManagerProps> = ({ provider }) => {
  const [isEnvKeySet, setIsEnvKeySet] = useState(false);
  const authUser = useStore(userStore);
  const authLoading = useStore(authLoadingStore);

  const checkEnvApiKey = useCallback(async () => {
    if (authLoading) {
      return;
    }

    // Check cache first
    if (providerEnvKeyStatusCache[provider.name] !== undefined) {
      setIsEnvKeySet(providerEnvKeyStatusCache[provider.name]);
      return;
    }

    try {
      const authHeaders = await getAuthHeaders();

      const response = await fetch(`/api/check-env-key?provider=${encodeURIComponent(provider.name)}`, {
        headers: authHeaders,
        credentials: 'same-origin',
      });

      if (response.status === 401 || response.status === 403) {
        setIsEnvKeySet(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to check environment API key: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const isSet = (data as { isSet: boolean }).isSet;

      // Cache the result
      providerEnvKeyStatusCache[provider.name] = isSet;
      setIsEnvKeySet(isSet);
    } catch (error) {
      console.error('Failed to check environment API key:', error);
      setIsEnvKeySet(false);
    }
  }, [authLoading, provider.name]);

  useEffect(() => {
    checkEnvApiKey();
  }, [checkEnvApiKey, authUser?.uid]);

  return (
    <div className="flex items-center justify-between py-3 px-1">
      <div className="flex items-center gap-2 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-bolt-elements-textSecondary">{provider?.name} API Key:</span>
          <div className="flex items-center gap-2">
            {isEnvKeySet ? (
              <>
                <div className="i-ph:check-circle-fill text-green-500 w-4 h-4" />
                <span className="text-xs text-green-500">Set via environment variable</span>
              </>
            ) : (
              <>
                <div className="i-ph:x-circle-fill text-red-500 w-4 h-4" />
                <span className="text-xs text-red-500">Not set in server environment</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {provider?.getApiKeyLink && !isEnvKeySet && (
          <IconButton
            onClick={() => window.open(provider?.getApiKeyLink)}
            title="Get API Key"
            className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 flex items-center gap-2"
          >
            <span className="text-xs whitespace-nowrap">{provider?.labelForGetApiKey || 'Get API Key'}</span>
            <div className={`${provider?.icon || 'i-ph:key'} w-4 h-4`} />
          </IconButton>
        )}
      </div>
    </div>
  );
};
