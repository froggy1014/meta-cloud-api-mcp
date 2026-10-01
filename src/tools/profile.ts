// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-profiles/
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ToolContext } from '../context.js';
import { ToolInputError } from '../result.js';
import { defineTool, READ_ONLY, WRITE } from './define.js';

const PROFILE_FIELDS = [
    'about',
    'address',
    'description',
    'email',
    'messaging_product',
    'profile_picture_url',
    'websites',
    'vertical',
] as const;

const VERTICALS = [
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
] as const;

export function registerProfileTools(server: McpServer, ctx: ToolContext): void {
    defineTool(server, ctx, {
        name: 'get_business_profile',
        title: 'Get business profile',
        description: 'Get the business profile of the configured phone number (about, address, email, websites...).',
        input: {
            fields: z.array(z.enum(PROFILE_FIELDS)).min(1).optional().describe('Fields to return (default: all)'),
        },
        annotations: READ_ONLY,
        run: ({ fields }, c) => c.getClient().businessProfile.getBusinessProfile(fields ?? [...PROFILE_FIELDS]),
    });

    defineTool(server, ctx, {
        name: 'update_business_profile',
        title: 'Update business profile',
        description: 'Update business profile fields of the configured phone number. Only given fields change.',
        input: {
            about: z.string().min(1).max(139).optional().describe('"About" text (max 139 chars)'),
            address: z.string().max(256).optional().describe('Business address'),
            description: z.string().max(512).optional().describe('Business description (max 512 chars)'),
            email: z.email().optional().describe('Contact email'),
            websites: z.array(z.url()).max(2).optional().describe('Up to 2 website URLs'),
            vertical: z.enum(VERTICALS).optional().describe('Industry vertical'),
        },
        annotations: { ...WRITE, idempotentHint: true },
        run: (params, c) => {
            const update = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined));
            if (Object.keys(update).length === 0) throw new ToolInputError('Provide at least one field to update.');
            return c.getClient().businessProfile.updateBusinessProfile({
                messaging_product: 'whatsapp',
                ...update,
            } as never);
        },
    });
}
