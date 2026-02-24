import { getSystemEnv } from '~/utils/env';
import { json, type LoaderFunction, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { requireAdmin } from '~/lib/.server/auth';

/**
 * Diagnostic API for troubleshooting connection issues
 */

interface AppContext {
  env?: {
    GITHUB_ACCESS_TOKEN?: string;
    NETLIFY_TOKEN?: string;
  };
}

export const loader: LoaderFunction = async ({ request, context }: LoaderFunctionArgs & { context: AppContext }) => {
  // Require authentication — diagnostics must never be exposed to anonymous users
  const authResult = await requireAdmin(request, context);

  if (authResult instanceof Response) {
    return authResult;
  }

  // Get environment variables
  const envVars = {
    hasGithubToken: Boolean(getSystemEnv().GITHUB_ACCESS_TOKEN || context.env?.GITHUB_ACCESS_TOKEN),
    hasNetlifyToken: Boolean(getSystemEnv().NETLIFY_TOKEN || context.env?.NETLIFY_TOKEN),
    nodeEnv: getSystemEnv().NODE_ENV,
  };

  // Check cookies
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = cookieHeader.split(';').reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split('=');

      if (key) {
        acc[key] = value;
      }

      return acc;
    },
    {} as Record<string, string>,
  );

  const hasGithubTokenCookie = Boolean(cookies.githubToken);
  const hasGithubUsernameCookie = Boolean(cookies.githubUsername);
  const hasNetlifyCookie = Boolean(cookies.netlifyToken);

  // Get local storage status (this can only be checked client-side)
  const localStorageStatus = {
    explanation: 'Local storage can only be checked on the client side. Use browser devtools to check.',
    githubKeysToCheck: ['github_connection'],
    netlifyKeysToCheck: ['netlify_connection'],
  };

  // Check if CORS might be an issue
  const corsStatus = {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  };

  // Check if API endpoints are reachable
  const apiEndpoints = {
    githubUser: '/api/system/git-info?action=getUser',
    githubRepos: '/api/system/git-info?action=getRepos',
    githubOrgs: '/api/system/git-info?action=getOrgs',
    githubActivity: '/api/system/git-info?action=getActivity',
    gitInfo: '/api/system/git-info',
  };

  // Test GitHub API connectivity
  let githubApiStatus;

  try {
    const githubResponse = await fetch('https://api.github.com/zen', {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    githubApiStatus = {
      isReachable: githubResponse.ok,
      status: githubResponse.status,
      statusText: githubResponse.statusText,
    };
  } catch (error) {
    githubApiStatus = {
      isReachable: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Test Netlify API connectivity
  let netlifyApiStatus;

  try {
    const netlifyResponse = await fetch('https://api.netlify.com/api/v1/', {
      method: 'GET',
    });

    netlifyApiStatus = {
      isReachable: netlifyResponse.ok,
      status: netlifyResponse.status,
      statusText: netlifyResponse.statusText,
    };
  } catch (error) {
    netlifyApiStatus = {
      isReachable: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Provide technical details about the environment (strip internal server details)
  const technicalDetails = {
    serverTimestamp: new Date().toISOString(),

    // userAgent, referrer, and raw url intentionally omitted — would expose internal routing
    host: request.headers.get('Host'),
    method: request.method,
  };

  // Return diagnostics
  return json(
    {
      status: 'success',
      environment: envVars,
      cookies: {
        hasGithubTokenCookie,
        hasGithubUsernameCookie,
        hasNetlifyCookie,
      },
      localStorage: localStorageStatus,
      apiEndpoints,
      externalApis: {
        github: githubApiStatus,
        netlify: netlifyApiStatus,
      },
      corsStatus,
      technicalDetails,
    },
    {
      headers: corsStatus.headers,
    },
  );
};
