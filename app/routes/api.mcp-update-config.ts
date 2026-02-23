import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createScopedLogger } from '~/utils/logger';
import { MCPService, type MCPConfig } from '~/lib/services/mcpService';
import { requireAdmin } from '~/lib/.server/auth';
import { sanitizeMCPServerTools } from '~/lib/.server/mcp-sanitize';

const logger = createScopedLogger('api.mcp-update-config');

export async function action({ request, context }: ActionFunctionArgs & { context: any }) {
  // Require Firebase authentication — this route modifies application MCP configuration
  const authResult = await requireAdmin(request, context);

  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const mcpConfig = (await request.json()) as MCPConfig;

    if (!mcpConfig || typeof mcpConfig !== 'object') {
      return Response.json({ error: 'Invalid MCP servers configuration' }, { status: 400 });
    }

    const mcpService = MCPService.getInstance();
    const serverTools = await mcpService.updateConfig(mcpConfig);

    return Response.json(sanitizeMCPServerTools(serverTools));
  } catch (error) {
    logger.error('Error updating MCP config:', error);
    return Response.json({ error: 'Failed to update MCP config' }, { status: 500 });
  }
}
