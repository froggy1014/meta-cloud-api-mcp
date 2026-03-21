import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getClient } from '../client.js';
import { formatError } from '../utils/errors.js';
import { formatSuccess } from '../utils/response.js';

export function registerProfileTools(server: McpServer) {
    server.tool(
        'get_business_profile',
        'Get the WhatsApp Business Profile — about, address, description, email, websites, profile picture URL',
        {
            fields: z
                .array(
                    z.enum([
                        'about',
                        'address',
                        'description',
                        'email',
                        'messaging_product',
                        'profile_picture_url',
                        'websites',
                        'vertical',
                    ]),
                )
                .optional()
                .describe('Specific business profile fields to retrieve'),
        },
        async ({ fields }) => {
            try {
                const result = await getClient().businessProfile.getBusinessProfile(fields);
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'update_business_profile',
        'Update the WhatsApp Business Profile fields — about, address, description, email, websites, vertical',
        {
            about: z.string().optional().describe('Short "about" text (max 139 chars)'),
            address: z.string().optional().describe('Business address'),
            description: z.string().optional().describe('Business description (max 512 chars)'),
            email: z.string().optional().describe('Business email address'),
            websites: z
                .array(z.string())
                .optional()
                .describe('Business website URLs (max 2)'),
            vertical: z
                .enum([
                    'UNDEFINED',
                    'OTHER',
                    'AUTO',
                    'BEAUTY',
                    'APPAREL',
                    'EDU',
                    'ENTERTAIN',
                    'EVENT_PLAN',
                    'FINANCE',
                    'GROCERY',
                    'GOVT',
                    'HOTEL',
                    'HEALTH',
                    'NONPROFIT',
                    'PROF_SERVICES',
                    'RETAIL',
                    'TRAVEL',
                    'RESTAURANT',
                    'NOT_A_BIZ',
                ])
                .optional()
                .describe('Business industry vertical'),
        },
        async (params) => {
            try {
                const result = await getClient().businessProfile.updateBusinessProfile(
                    params as any,
                );
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );
}
