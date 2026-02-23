import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createScopedLogger } from '~/utils/logger';
import { requireAuth } from '~/lib/.server/auth';

const logger = createScopedLogger('api.supabase.query');

export async function action({ request, context }: ActionFunctionArgs & { context: any }) {
  // Require Firebase authentication — proxies user's Supabase token to the Supabase Management API
  const authResult = await requireAuth(request, context);

  if (authResult instanceof Response) {
    return authResult;
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabaseAuthHeader = request.headers.get('X-Supabase-Authorization');

  if (!supabaseAuthHeader) {
    return new Response('No Supabase authorization token provided', { status: 401 });
  }

  try {
    const { projectId, query } = (await request.json()) as any;
    logger.debug('Executing query:', { projectId, query });

    const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: supabaseAuthHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;

      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      logger.error(
        'Supabase API error:',
        JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        }),
      );

      return new Response(
        JSON.stringify({
          error: {
            status: response.status,
            statusText: response.statusText,
            message: errorData.message || errorData.error || errorText,
            details: errorData,
          },
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    logger.error('Query execution error:', error);
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Query execution failed',
          stack: error instanceof Error ? error.stack : undefined,
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
