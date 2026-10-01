import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createContext, type ToolContext } from './context.js';
import { registerFlowTools } from './tools/flows.js';
import { registerMediaTools } from './tools/media.js';
import { registerMessageTools } from './tools/messages.js';
import { registerPhoneNumberTools } from './tools/phoneNumbers.js';
import { registerProfileTools } from './tools/profile.js';
import { registerRegistrationTools } from './tools/registration.js';
import { registerTemplateTools } from './tools/templates.js';
import { registerWabaTools } from './tools/waba.js';
import { VERSION } from './version.js';

export function createServer(ctx: ToolContext = createContext()): McpServer {
    const server = new McpServer(
        { name: 'meta-cloud-api-mcp', title: 'WhatsApp Cloud API', version: VERSION },
        {
            instructions:
                'Tools for the WhatsApp Business Platform Cloud API (via the meta-cloud-api SDK). ' +
                'Free-form messages (text, media, interactive) only reach users who messaged you in the last 24 hours; ' +
                'outside that window use send_template_message with an APPROVED template from list_templates. ' +
                'Phone numbers are international format without spaces, e.g. 14155552671.',
        },
    );

    registerMessageTools(server, ctx);
    registerTemplateTools(server, ctx);
    registerMediaTools(server, ctx);
    registerProfileTools(server, ctx);
    registerPhoneNumberTools(server, ctx);
    registerWabaTools(server, ctx);
    registerRegistrationTools(server, ctx);
    registerFlowTools(server, ctx);

    return server;
}

export async function main(): Promise<void> {
    const server = createServer();
    await server.connect(new StdioServerTransport());
    console.error(`meta-cloud-api-mcp ${VERSION} running on stdio`);
}
