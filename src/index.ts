#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerFlowTools } from './tools/flows.js';
import { registerMessageTools } from './tools/messages.js';
import { registerTemplateTools } from './tools/templates.js';

const server = new McpServer({
    name: 'whatsapp-cloud-api',
    version: '0.1.0',
    description:
        'MCP server for WhatsApp Cloud API — manage templates, flows, and send messages',
});

registerTemplateTools(server);
registerFlowTools(server);
registerMessageTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
