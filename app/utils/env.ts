type SystemEnv = Record<string, string | undefined>;

interface CloudflareContextLike {
  cloudflare?: {
    env?: unknown;
  };
}

export function getSystemEnv(): SystemEnv {
  const actualProcess = typeof globalThis !== 'undefined' ? globalThis.process : undefined;

  return (actualProcess?.env || (typeof process !== 'undefined' ? process.env : {})) as SystemEnv;
}

export function getMergedServerEnv(context?: CloudflareContextLike): Record<string, string> {
  const processEnv = getSystemEnv();
  const cloudflareEnv = context?.cloudflare?.env;
  const cloudflareEnvRecord =
    cloudflareEnv && typeof cloudflareEnv === 'object' ? (cloudflareEnv as Record<string, unknown>) : {};

  return Object.assign({}, processEnv, cloudflareEnvRecord) as Record<string, string>;
}
