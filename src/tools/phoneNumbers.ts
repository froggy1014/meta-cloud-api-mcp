// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers/
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ToolContext } from '../context.js';
import { defineTool, READ_ONLY, WRITE } from './define.js';

const fields = z
    .array(z.string().regex(/^[a-z_]+$/))
    .min(1)
    .optional()
    .describe(
        'Fields to return, e.g. ["display_phone_number","verified_name","quality_rating","status","messaging_limit_tier","throughput"]',
    );

export function registerPhoneNumberTools(server: McpServer, ctx: ToolContext): void {
    defineTool(server, ctx, {
        name: 'list_phone_numbers',
        title: 'List phone numbers',
        description: 'List the phone numbers registered in the WhatsApp Business Account.',
        input: {
            fields,
            limit: z.number().int().min(1).max(100).optional().describe('Page size'),
            after: z.string().min(1).optional().describe('Pagination cursor from a previous response'),
        },
        annotations: READ_ONLY,
        run: ({ fields: f, limit, after }, c) => {
            c.getBusinessAccountId();
            return c.getClient().phoneNumbers.getPhoneNumbers({
                ...(f && { fields: f as never }),
                ...(limit && { limit }),
                ...(after && { after }),
            });
        },
    });

    defineTool(server, ctx, {
        name: 'get_phone_number',
        title: 'Get phone number',
        description:
            'Get details of the configured sender number (WA_PHONE_NUMBER_ID): display number, verified name, quality rating, status, limits.',
        input: { fields },
        annotations: READ_ONLY,
        run: ({ fields: f }, c) => c.getClient().phoneNumbers.getPhoneNumberById(f as never),
    });

    defineTool(server, ctx, {
        name: 'request_verification_code',
        title: 'Request verification code',
        description: 'Request a phone number verification code by SMS or voice call.',
        input: {
            code_method: z.enum(['SMS', 'VOICE']).describe('Delivery method'),
            language: z.string().min(2).describe('Language of the message, e.g. "en_US"'),
        },
        annotations: WRITE,
        run: ({ code_method, language }, c) =>
            c.getClient().phoneNumbers.requestVerificationCode({ code_method, language } as never),
    });

    defineTool(server, ctx, {
        name: 'verify_phone_code',
        title: 'Verify phone code',
        description: 'Verify the configured phone number with the code received by SMS or voice.',
        input: {
            code: z.string().regex(/^\d{6}$/, 'Expected a 6-digit code').describe('6-digit verification code'),
        },
        annotations: WRITE,
        run: ({ code }, c) => c.getClient().phoneNumbers.verifyCode({ code }),
    });
}
