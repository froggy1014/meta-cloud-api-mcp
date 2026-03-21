#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerFlowTools } from './tools/flows.js';
import { registerMediaTools } from './tools/media.js';
import { registerMessageTools } from './tools/messages.js';
import { registerPhoneNumberTools } from './tools/phoneNumbers.js';
import { registerProfileTools } from './tools/profile.js';
import { registerRegistrationTools } from './tools/registration.js';
import { registerTemplateTools } from './tools/templates.js';
import { registerWabaTools } from './tools/waba.js';

const server = new McpServer({
    name: 'whatsapp-cloud-api',
    version: '0.2.0',
    description:
        'MCP server for WhatsApp Cloud API — manage templates, flows, media, profiles, phone numbers, and send messages',
});

registerTemplateTools(server);
registerFlowTools(server);
registerMessageTools(server);
registerMediaTools(server);
registerProfileTools(server);
registerWabaTools(server);
registerRegistrationTools(server);
registerPhoneNumberTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
