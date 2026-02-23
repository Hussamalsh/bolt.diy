import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { requireAuth } from '~/lib/.server/auth';

interface SupabaseApiKeyRecord {
  name: string;
  api_key: string;
}

function isPublicSupabaseApiKey(name: string): boolean {
  const normalized = name.toLowerCase();

  return normalized === 'anon' || normalized === 'public' || normalized.includes('publishable');
}

export async function action({ request, context }: ActionFunctionArgs & { context: any }) {
  const authResult = await requireAuth(request, context);

  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    // Add proper type assertion for the request body
    const body = (await request.json()) as { projectId?: string; token?: string };
    const { projectId, token } = body;

    if (!projectId || !token) {
      return json({ error: 'Project ID and token are required' }, { status: 400 });
    }

    const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/api-keys`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return json({ error: `Failed to fetch API keys: ${response.statusText}` }, { status: response.status });
    }

    const apiKeys = (await response.json()) as SupabaseApiKeyRecord[];

    return json({
      apiKeys: apiKeys.filter((key) => isPublicSupabaseApiKey(key.name)),
    });
  } catch (error) {
    console.error('Error fetching project API keys:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error occurred' }, { status: 500 });
  }
}
