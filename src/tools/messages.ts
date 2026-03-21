import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getClient } from '../client.js';
import { formatError } from '../utils/errors.js';
import { formatSuccess } from '../utils/response.js';

export function registerMessageTools(server: McpServer) {
    server.tool(
        'send_text_message',
        'Send a text message via WhatsApp to a phone number',
        {
            to: z.string().describe('Recipient phone number (e.g. "821012345678")'),
            body: z.string().describe('Text message content'),
            reply_message_id: z
                .string()
                .optional()
                .describe('Message ID to reply to (for contextual replies)'),
        },
        async ({ to, body, reply_message_id }) => {
            try {
                const result = await getClient().messages.text({
                    to,
                    body,
                    ...(reply_message_id && { replyMessageId: reply_message_id }),
                });
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'send_template_message',
        'Send a pre-approved template message via WhatsApp. Templates must be created and approved before sending.',
        {
            to: z.string().describe('Recipient phone number'),
            template_name: z.string().describe('Approved template name'),
            language_code: z
                .string()
                .describe('Template language code (e.g. "en_US", "ko")'),
            components: z
                .array(z.record(z.any()))
                .optional()
                .describe(
                    'Template components for variable substitution: [{type: "body", parameters: [{type: "text", text: "value"}]}]',
                ),
        },
        async ({ to, template_name, language_code, components }) => {
            try {
                const result = await getClient().messages.template({
                    to,
                    body: {
                        name: template_name,
                        language: {
                            policy: 'deterministic',
                            code: language_code as any,
                        },
                        ...(components && { components: components as any }),
                    } as any,
                });
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'send_image_message',
        'Send an image message via WhatsApp. Provide either an image_id (from media upload) or image_link (public URL).',
        {
            to: z.string().describe('Recipient phone number'),
            image_id: z
                .string()
                .optional()
                .describe('Media ID from a previous upload'),
            image_link: z
                .string()
                .optional()
                .describe('Public URL of the image'),
            caption: z.string().optional().describe('Image caption'),
            reply_message_id: z
                .string()
                .optional()
                .describe('Message ID to reply to'),
        },
        async ({ to, image_id, image_link, caption, reply_message_id }) => {
            if (!image_id && !image_link) {
                return formatError(new Error('Either image_id or image_link must be provided'));
            }

            try {
                const imageBody = image_id
                    ? { id: image_id, ...(caption && { caption }) }
                    : { link: image_link!, ...(caption && { caption }) };

                const result = await getClient().messages.image({
                    to,
                    body: imageBody as any,
                    ...(reply_message_id && { replyMessageId: reply_message_id }),
                });
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );
}
