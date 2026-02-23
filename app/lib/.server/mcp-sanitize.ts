import type { MCPServerConfig, MCPServerTools } from '~/lib/services/mcpService';

function redactRecord(values?: Record<string, string>): Record<string, string> | undefined {
  if (!values) {
    return undefined;
  }

  return Object.fromEntries(Object.keys(values).map((key) => [key, '[REDACTED]']));
}

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.username = '';
    parsed.password = '';

    if (parsed.search) {
      parsed.search = '';
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

function sanitizeConfig(config: MCPServerConfig): MCPServerConfig {
  if (config.type === 'stdio') {
    return {
      ...config,
      env: redactRecord(config.env),
    };
  }

  return {
    ...config,
    url: sanitizeUrl(config.url),
    headers: redactRecord(config.headers),
  };
}

export function sanitizeMCPServerTools(serverTools: MCPServerTools): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(serverTools).map(([serverName, server]) => {
      if (server.status === 'available') {
        return [
          serverName,
          {
            status: 'available',
            tools: server.tools,
            config: sanitizeConfig(server.config),
          },
        ];
      }

      return [
        serverName,
        {
          status: 'unavailable',
          error: server.error,
          config: sanitizeConfig(server.config),
        },
      ];
    }),
  );
}
