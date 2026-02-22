/**
 * Get the current user's Firebase ID token for API authentication.
 * Returns null if the user is not logged in or if called on the server.
 */
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
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
