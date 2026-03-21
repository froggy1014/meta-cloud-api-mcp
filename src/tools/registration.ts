import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getClient } from '../client.js';
import { formatError } from '../utils/errors.js';
import { formatSuccess } from '../utils/response.js';

export function registerRegistrationTools(server: McpServer) {
    server.tool(
        'register_phone',
        'Register a WhatsApp Business phone number with a 6-digit PIN',
        {
            pin: z.string().describe('6-digit registration PIN'),
            data_localization_region: z
                .enum(['AU', 'BR', 'DE', 'ID', 'IN', 'JP', 'KR', 'SG', 'ZA'])
                .optional()
                .describe('Data localization region for storage compliance'),
        },
        async ({ pin, data_localization_region }) => {
            try {
                const result = await getClient().registration.register(
                    pin,
                    data_localization_region as any,
                );
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'deregister_phone',
        'Deregister a WhatsApp Business phone number',
        {},
        async () => {
            try {
                const result = await getClient().registration.deregister();
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );
}
