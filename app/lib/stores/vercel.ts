import { atom } from 'nanostores';
import type { VercelConnection } from '~/types/vercel';
import { logStore } from './logs';
import { toast } from 'react-toastify';
import { getAuthHeaders } from '~/lib/auth-client';

// Initialize with stored connection or defaults
const storedConnection = typeof window !== 'undefined' ? localStorage.getItem('vercel_connection') : null;
let initialConnection: VercelConnection;

if (storedConnection) {
  try {
    const parsed = JSON.parse(storedConnection);

    initialConnection = parsed;
  } catch (error) {
    console.error('Error parsing saved Vercel connection:', error);
    initialConnection = {
      user: null,
      token: '',
      stats: undefined,
    };
  }
} else {
  initialConnection = {
    user: null,
    token: '',
    stats: undefined,
  };
}

export const vercelConnection = atom<VercelConnection>(initialConnection);
export const isConnecting = atom<boolean>(false);
export const isFetchingStats = atom<boolean>(false);

export const updateVercelConnection = (updates: Partial<VercelConnection>) => {
  const currentState = vercelConnection.get();
  const newState = { ...currentState, ...updates };
  vercelConnection.set(newState);

  // Persist to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('vercel_connection', JSON.stringify(newState));
  }
};

// Auto-connect using a server-managed token via authenticated proxy route
export async function autoConnectVercel() {
  console.log('autoConnectVercel called');

  try {
    console.log('Setting isConnecting to true');
    isConnecting.set(true);

    const authHeaders = await getAuthHeaders();
    const response = await fetch('/api/vercel-user', {
      method: 'GET',
      headers: authHeaders,
    });

    console.log('Vercel proxy response status:', response.status);

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'No server-side Vercel token configured' };
      }

      throw new Error(`Vercel API error: ${response.status}`);
    }

    const userData = (await response.json()) as any;
    console.log('Vercel proxy response userData:', userData);

    updateVercelConnection({
      user: userData,
      token: '',
    });

    logStore.logInfo('Auto-connected to Vercel', {
      type: 'system',
      message: `Auto-connected to Vercel as ${userData.username || userData.user?.username}`,
    });

    await fetchVercelStatsViaAPI();

    console.log('Vercel auto-connection successful');

    return { success: true };
  } catch (error) {
    console.error('Failed to auto-connect to Vercel:', error);
    logStore.logError(`Vercel auto-connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      type: 'system',
      message: 'Vercel auto-connection failed',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    console.log('Setting isConnecting to false');
    isConnecting.set(false);
  }
}

export async function initializeVercelConnection() {
  const currentState = vercelConnection.get();

  if (currentState.user || currentState.token) {
    return;
  }

  await autoConnectVercel();
}

export async function fetchVercelStatsViaAPI() {
  try {
    isFetchingStats.set(true);

    const authHeaders = await getAuthHeaders();
    const formData = new FormData();
    formData.append('action', 'get_projects');

    const response = await fetch('/api/vercel-user', {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status}`);
    }

    const data = (await response.json()) as { projects?: any[] };
    const projects = data.projects || [];
    const currentState = vercelConnection.get();

    updateVercelConnection({
      ...currentState,
      stats: {
        projects,
        totalProjects: projects.length,
      },
    });
  } catch (error) {
    console.error('Vercel API Proxy Error:', error);
    logStore.logError('Failed to fetch Vercel statistics via server API', { error });
    throw error;
  } finally {
    isFetchingStats.set(false);
  }
}

export async function fetchVercelStats(token: string) {
  try {
    isFetchingStats.set(true);

    const projectsResponse = await fetch('https://api.vercel.com/v9/projects', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!projectsResponse.ok) {
      throw new Error(`Failed to fetch projects: ${projectsResponse.status}`);
    }

    const projectsData = (await projectsResponse.json()) as any;
    const projects = projectsData.projects || [];

    // Fetch latest deployment for each project
    const projectsWithDeployments = await Promise.all(
      projects.map(async (project: any) => {
        try {
          const deploymentsResponse = await fetch(
            `https://api.vercel.com/v6/deployments?projectId=${project.id}&limit=1`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            },
          );

          if (deploymentsResponse.ok) {
            const deploymentsData = (await deploymentsResponse.json()) as any;
            return {
              ...project,
              latestDeployments: deploymentsData.deployments || [],
            };
          }

          return project;
        } catch (error) {
          console.error(`Error fetching deployments for project ${project.id}:`, error);
          return project;
        }
      }),
    );

    const currentState = vercelConnection.get();
    updateVercelConnection({
      ...currentState,
      stats: {
        projects: projectsWithDeployments,
        totalProjects: projectsWithDeployments.length,
      },
    });
  } catch (error) {
    console.error('Vercel API Error:', error);
    logStore.logError('Failed to fetch Vercel stats', { error });
    toast.error('Failed to fetch Vercel statistics');
  } finally {
    isFetchingStats.set(false);
  }
}
