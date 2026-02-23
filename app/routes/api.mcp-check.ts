import { createScopedLogger } from '~/utils/logger';
import { MCPService } from '~/lib/services/mcpService';
import { requireAdmin } from '~/lib/.server/auth';
import { sanitizeMCPServerTools } from '~/lib/.server/mcp-sanitize';

const logger = createScopedLogger('api.mcp-check');

export async function loader({ request, context }: { request: Request; context: any }) {
  // Require Firebase authentication
  const authResult = await requireAdmin(request, context);

  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const mcpService = MCPService.getInstance();
    const serverTools = await mcpService.checkServersAvailabilities();

    return Response.json(sanitizeMCPServerTools(serverTools));
  } catch (error) {
    logger.error('Error checking MCP servers:', error);
    return Response.json({ error: 'Failed to check MCP servers' }, { status: 500 });
  }
}
