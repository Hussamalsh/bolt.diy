type SystemEnv = Record<string, string | undefined>;

interface CloudflareContextLike {
  cloudflare?: {
    env?: Record<string, unknown>;
  };
}

export function getSystemEnv(): SystemEnv {
  const actualProcess = typeof globalThis !== 'undefined' ? globalThis.process : undefined;

  return (actualProcess?.env || (typeof process !== 'undefined' ? process.env : {})) as SystemEnv;
}

export function getMergedServerEnv(context?: CloudflareContextLike): Record<string, string> {
  const processEnv = getSystemEnv();

  return Object.assign({}, processEnv, context?.cloudflare?.env || {}) as Record<string, string>;
}
