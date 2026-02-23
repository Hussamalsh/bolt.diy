import { atom } from 'nanostores';
import type { NetlifyConnection } from '~/types/netlify';
import { logStore } from './logs';
import { toast } from 'react-toastify';
import { getAuthHeaders } from '~/lib/auth-client';

// Initialize with stored connection only (do not read provider tokens from client env)
const storedConnection = typeof window !== 'undefined' ? localStorage.getItem('netlify_connection') : null;

const initialConnection: NetlifyConnection = storedConnection
  ? JSON.parse(storedConnection)
  : {
      user: null,
      token: '',
      stats: undefined,
    };

export const netlifyConnection = atom<NetlifyConnection>(initialConnection);
export const isConnecting = atom<boolean>(false);
export const isFetchingStats = atom<boolean>(false);

// Client-side env-token auto-connect is disabled; use authenticated server proxy auto-connect instead.
export async function initializeNetlifyConnection() {
  const currentState = netlifyConnection.get();

  if (currentState.user || currentState.token) {
    return;
  }

  try {
    isConnecting.set(true);

    const authHeaders = await getAuthHeaders();
    const userResponse = await fetch('/api/netlify-user', {
      method: 'GET',
      headers: authHeaders,
    });

    if (!userResponse.ok) {
      if (userResponse.status === 401) {
        return;
      }

      throw new Error(`Failed to auto-connect to Netlify: ${userResponse.status}`);
    }

    const userData = (await userResponse.json()) as any;
    let stats: NetlifyConnection['stats'];

    try {
      const formData = new FormData();
      formData.append('action', 'get_sites');

      const sitesResponse = await fetch('/api/netlify-user', {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });

      if (sitesResponse.ok) {
        const sitesData = (await sitesResponse.json()) as { sites?: any[]; totalSites?: number };
        const sites = sitesData.sites || [];
        stats = {
          sites,
          totalSites: sitesData.totalSites ?? sites.length,
        };
      }
    } catch (error) {
      console.error('Netlify auto-connect stats fetch failed:', error);
      logStore.logError('Failed to fetch Netlify stats during auto-connect', { error });
    }

    updateNetlifyConnection({
      user: userData,
      token: '',
      stats,
    });
  } catch (error) {
    console.error('Error initializing Netlify connection:', error);
    logStore.logError('Failed to initialize Netlify connection', { error });
  } finally {
    isConnecting.set(false);
  }
}

export const updateNetlifyConnection = (updates: Partial<NetlifyConnection>) => {
  const currentState = netlifyConnection.get();
  const newState = { ...currentState, ...updates };
  netlifyConnection.set(newState);

  // Persist to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('netlify_connection', JSON.stringify(newState));
  }
};

export async function fetchNetlifyStats(token: string) {
  try {
    isFetchingStats.set(true);

    const sitesResponse = await fetch('https://api.netlify.com/api/v1/sites', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!sitesResponse.ok) {
      throw new Error(`Failed to fetch sites: ${sitesResponse.status}`);
    }

    const sites = (await sitesResponse.json()) as any;

    const currentState = netlifyConnection.get();
    updateNetlifyConnection({
      ...currentState,
      stats: {
        sites,
        totalSites: sites.length,
      },
    });
  } catch (error) {
    console.error('Netlify API Error:', error);
    logStore.logError('Failed to fetch Netlify stats', { error });
    toast.error('Failed to fetch Netlify statistics');
  } finally {
    isFetchingStats.set(false);
  }
}
