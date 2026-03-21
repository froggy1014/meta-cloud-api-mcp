import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getClient } from '../client.js';
import { formatError } from '../utils/errors.js';
import { formatSuccess } from '../utils/response.js';

export function registerPhoneNumberTools(server: McpServer) {
    server.tool(
        'get_phone_number',
        'Get information about the configured WhatsApp Business phone number — display number, verified name, quality rating, status',
        {
            fields: z
                .array(z.string())
                .optional()
                .describe(
                    'Specific fields to retrieve (e.g. ["display_phone_number", "verified_name", "quality_rating", "platform_type", "status"])',
                ),
        },
        async ({ fields }) => {
            try {
                const result = await getClient().phoneNumbers.getPhoneNumberById(fields as any);
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'list_phone_numbers',
        'List all phone numbers associated with the WhatsApp Business Account',
        {},
        async () => {
            try {
                const result = await getClient().phoneNumbers.getPhoneNumbers();
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'request_verification_code',
        'Request a verification code for the WhatsApp Business phone number via SMS or voice call',
        {
            code_method: z
                .enum(['SMS', 'VOICE'])
                .describe('Delivery method for the verification code'),
            language: z
                .string()
                .describe('Language code for the verification message (e.g. "en_US", "ko_KR")'),
        },
        async ({ code_method, language }) => {
            try {
                const result = await getClient().phoneNumbers.requestVerificationCode({
                    code_method,
                    language,
                } as any);
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'verify_phone_code',
        'Verify the WhatsApp Business phone number with the code received via SMS or voice call',
        {
            code: z.string().describe('6-digit verification code'),
        },
        async ({ code }) => {
            try {
                const result = await getClient().phoneNumbers.verifyCode({ code } as any);
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );
}
