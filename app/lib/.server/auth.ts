import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from 'jose';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('server.auth');

interface AuthContextLike {
  cloudflare?: {
    env?: unknown;
  };
}

// Google's public key endpoint for Firebase Auth tokens
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

// Cache the JWKS (jose handles caching internally via cooldownDuration, but we keep the reference)
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(GOOGLE_CERTS_URL), {
      cooldownDuration: 30_000, // Cache keys for at least 30s to avoid hammering Google
      timeoutDuration: 10_000, // 10s timeout for JWKS fetch
    });
  }

  return jwks;
}

export interface VerifiedUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
}

function getFirebaseProjectId(context?: AuthContextLike): string {
  const cloudflareEnv = context?.cloudflare?.env as { VITE_FIREBASE_PROJECT_ID?: unknown } | undefined;
  const cloudflareProjectId = cloudflareEnv?.VITE_FIREBASE_PROJECT_ID;

  if (typeof cloudflareProjectId === 'string' && cloudflareProjectId) {
    return cloudflareProjectId;
  }

  return process.env.VITE_FIREBASE_PROJECT_ID || '';
}

/**
 * Verify a Firebase ID token from the Authorization header.
 * Returns the decoded user info or null if invalid/missing.
 */
export async function verifyFirebaseToken(request: Request, context?: AuthContextLike): Promise<VerifiedUser | null> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return null;
  }

  try {
    const firebaseProjectId = getFirebaseProjectId(context);

    if (!firebaseProjectId) {
      logger.error('Firebase project ID is not configured on the server');
      return null;
    }

    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: `https://securetoken.google.com/${firebaseProjectId}`,
      audience: firebaseProjectId,
    });

    // Validate required claims
    if (!payload.sub || typeof payload.sub !== 'string') {
      logger.warn('Token missing sub claim');
      return null;
    }

    // Firebase tokens must have auth_time claim
    if (!payload.auth_time || typeof payload.auth_time !== 'number') {
      logger.warn('Token missing auth_time claim');
      return null;
    }

    const now = Math.floor(Date.now() / 1000);

    // Check that auth_time is in the past
    if (payload.auth_time > now) {
      logger.warn('Token auth_time is in the future');
      return null;
    }

    // Check that the token was issued in the past (iat)
    if (payload.iat && typeof payload.iat === 'number' && payload.iat > now + 5) {
      logger.warn('Token iat is in the future');
      return null;
    }

    return {
      uid: payload.sub,
      email: payload.email as string | undefined,
      name: payload.name as string | undefined,
      picture: payload.picture as string | undefined,
      emailVerified: payload.email_verified as boolean | undefined,
    };
  } catch (error) {
    if (error instanceof joseErrors.JWTExpired) {
      logger.debug('Token expired');
    } else if (error instanceof joseErrors.JWTClaimValidationFailed) {
      logger.warn('Token claim validation failed:', (error as Error).message);
    } else if (error instanceof joseErrors.JWSSignatureVerificationFailed) {
      logger.warn('Token signature verification failed — possible tampered token');
    } else {
      logger.debug('Token verification failed:', error);
    }

    return null;
  }
}

/**
 * Require authentication for an API route.
 * Returns a 401 Response if not authenticated, or the verified user if authenticated.
 */
export async function requireAuth(request: Request, context?: AuthContextLike): Promise<VerifiedUser | Response> {
  const user = await verifyFirebaseToken(request, context);

  if (!user) {
    return new Response(
      JSON.stringify({
        error: true,
        message: 'Authentication required. Please sign in to use this feature.',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        statusText: 'Unauthorized',
      },
    );
  }

  return user;
}
