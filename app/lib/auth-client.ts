let authReadyPromise: Promise<void> | null = null;

async function waitForAuthInitialization(timeoutMs = 5000): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const { authLoadingStore } = await import('~/lib/stores/auth');

    if (!authLoadingStore.get()) {
      return;
    }

    if (!authReadyPromise) {
      authReadyPromise = new Promise<void>((resolve) => {
        let settled = false;
        let unsubscribe: (() => void) | null = null;

        const finish = () => {
          if (settled) {
            return;
          }

          settled = true;

          clearTimeout(timeoutId);

          unsubscribe?.();
          authReadyPromise = null;

          resolve();
        };

        const timeoutId = window.setTimeout(finish, timeoutMs);

        unsubscribe = authLoadingStore.listen((isLoading) => {
          if (!isLoading) {
            finish();
          }
        });

        if (!authLoadingStore.get()) {
          finish();
        }
      });
    }

    await authReadyPromise;
  } catch (error) {
    console.warn('Failed to wait for auth initialization:', error);
  }
}

/**
 * Get the current user's Firebase ID token for API authentication.
 * Returns null if the user is not logged in or if called on the server.
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    await waitForAuthInitialization();

    // Dynamic import to avoid SSR issues — firebase is client-only
    const { auth } = await import('~/lib/firebase');
    const user = auth.currentUser;

    if (!user) {
      return null;
    }

    return await user.getIdToken();
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Create an Authorization header object with the Firebase ID token.
 * Returns empty object if not authenticated.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();

  if (!token) {
    return {};
  }

  return { Authorization: `Bearer ${token}` };
}
