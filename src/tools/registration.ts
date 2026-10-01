// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/registration/
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ToolContext } from '../context.js';
import { DESTRUCTIVE, defineTool, WRITE } from './define.js';

export function registerRegistrationTools(server: McpServer, ctx: ToolContext): void {
    defineTool(server, ctx, {
        name: 'register_phone',
        title: 'Register phone number',
        description: 'Register the configured phone number for Cloud API use with a 6-digit two-step verification PIN.',
        input: {
            pin: z.string().regex(/^\d{6}$/, 'Expected a 6-digit PIN').describe('6-digit PIN'),
            data_localization_region: z
                .enum(['AU', 'BR', 'DE', 'ID', 'IN', 'JP', 'KR', 'SG', 'ZA'])
                .optional()
                .describe('Optional local storage region'),
        },
        annotations: WRITE,
        run: ({ pin, data_localization_region }, c) =>
            c.getClient().registration.register(pin, data_localization_region as never),
    });

    defineTool(server, ctx, {
        name: 'deregister_phone',
        title: 'Deregister phone number',
        description: 'Deregister the configured phone number. It stops sending and receiving messages.',
        input: {},
        annotations: DESTRUCTIVE,
        run: (_args, c) => c.getClient().registration.deregister(),
    });
}
