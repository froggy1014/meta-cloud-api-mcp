// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ToolContext } from '../context.js';
import { ToolInputError } from '../result.js';
import { defineTool, phoneNumber, replyTo, WRITE } from './define.js';

const MEDIA_TYPES = ['image', 'video', 'audio', 'document', 'sticker'] as const;

const headerText = z.string().min(1).max(60).optional().describe('Optional plain-text header (max 60 chars)');
const footerText = z.string().min(1).max(60).optional().describe('Optional footer text (max 60 chars)');

function withHeaderFooter(header?: string, footer?: string) {
    return {
        ...(header && { header: { type: 'text' as const, text: header } }),
        ...(footer && { footer: { text: footer } }),
    };
}

export function registerMessageTools(server: McpServer, ctx: ToolContext): void {
    defineTool(server, ctx, {
        name: 'send_text_message',
        title: 'Send text message',
        description:
            'Send a plain text WhatsApp message. Only works inside the 24-hour customer service window; otherwise use send_template_message.',
        input: {
            to: phoneNumber,
            body: z.string().min(1).max(4096).describe('Message text (max 4096 chars)'),
            preview_url: z.boolean().optional().describe('Render a link preview for the first URL (default true)'),
            reply_message_id: replyTo,
        },
        annotations: WRITE,
        run: ({ to, body, preview_url, reply_message_id }, c) =>
            c.getClient().messages.text({
                to,
                body,
                ...(preview_url !== undefined && { previewUrl: preview_url }),
                ...(reply_message_id && { replyMessageId: reply_message_id }),
            }),
    });

    defineTool(server, ctx, {
        name: 'send_template_message',
        title: 'Send template message',
        description:
            'Send a pre-approved message template. Use list_templates to find names, languages and the variables each template expects.',
        input: {
            to: phoneNumber,
            template_name: z.string().min(1).describe('Approved template name, e.g. "hello_world"'),
            language_code: z.string().min(2).describe('Template language code, e.g. "en_US", "ko"'),
            components: z
                .array(z.record(z.string(), z.unknown()))
                .optional()
                .describe(
                    'Variable values, per the Cloud API template components schema. Example: [{"type":"body","parameters":[{"type":"text","text":"Alice"}]}]',
                ),
            reply_message_id: replyTo,
        },
        annotations: WRITE,
        run: ({ to, template_name, language_code, components, reply_message_id }, c) =>
            c.getClient().messages.template({
                to,
                body: {
                    name: template_name,
                    language: { policy: 'deterministic', code: language_code },
                    // Shape is validated by the Cloud API; the SDK type is a deep union.
                    ...(components && { components: components as never }),
                },
                ...(reply_message_id && { replyMessageId: reply_message_id }),
            }),
    });

    defineTool(server, ctx, {
        name: 'send_media_message',
        title: 'Send media message',
        description:
            'Send an image, video, audio, document or sticker. Provide exactly one of media_id (from upload_media) or link (public HTTPS URL).',
        input: {
            to: phoneNumber,
            type: z.enum(MEDIA_TYPES).describe('Media type'),
            media_id: z.string().min(1).optional().describe('Media ID returned by upload_media'),
            link: z.url().optional().describe('Public HTTPS URL of the media file'),
            caption: z.string().max(1024).optional().describe('Caption (image, video, document only)'),
            filename: z.string().min(1).optional().describe('File name shown to the recipient (document only)'),
            reply_message_id: replyTo,
        },
        annotations: WRITE,
        run: async ({ to, type, media_id, link, caption, filename, reply_message_id }, c) => {
            if (Boolean(media_id) === Boolean(link)) {
                throw new ToolInputError('Provide exactly one of media_id or link.');
            }
            if (caption && (type === 'audio' || type === 'sticker')) {
                throw new ToolInputError(`caption is not supported for ${type} messages.`);
            }
            if (filename && type !== 'document') {
                throw new ToolInputError('filename is only supported for document messages.');
            }
            const body = {
                ...(media_id ? { id: media_id } : { link: link as string }),
                ...(caption && { caption }),
                ...(filename && { filename }),
            };
            const params = { to, body, ...(reply_message_id && { replyMessageId: reply_message_id }) };
            const messages = c.getClient().messages;
            switch (type) {
                case 'image':
                    return messages.image(params);
                case 'video':
                    return messages.video(params);
                case 'audio':
                    return messages.audio(params);
                case 'document':
                    return messages.document(params);
                case 'sticker':
                    return messages.sticker(params);
            }
        },
    });

    defineTool(server, ctx, {
        name: 'send_interactive_buttons',
        title: 'Send reply buttons',
        description: 'Send an interactive message with up to 3 quick-reply buttons.',
        input: {
            to: phoneNumber,
            body_text: z.string().min(1).max(1024).describe('Main message text (max 1024 chars)'),
            buttons: z
                .array(
                    z.object({
                        id: z.string().min(1).max(256).describe('Payload returned in the webhook when tapped'),
                        title: z.string().min(1).max(20).describe('Button label (max 20 chars)'),
                    }),
                )
                .min(1)
                .max(3)
                .describe('1 to 3 buttons'),
            header_text: headerText,
            footer_text: footerText,
            reply_message_id: replyTo,
        },
        annotations: WRITE,
        run: ({ to, body_text, buttons, header_text, footer_text, reply_message_id }, c) =>
            c.getClient().messages.interactiveReplyButtons({
                to,
                body: {
                    type: 'button',
                    body: { text: body_text },
                    ...withHeaderFooter(header_text, footer_text),
                    action: {
                        buttons: buttons.map((b) => ({ type: 'reply' as const, reply: { id: b.id, title: b.title } })),
                    },
                },
                ...(reply_message_id && { replyMessageId: reply_message_id }),
            }),
    });

    defineTool(server, ctx, {
        name: 'send_interactive_list',
        title: 'Send list message',
        description: 'Send an interactive list message: a button that opens a menu of up to 10 rows in total.',
        input: {
            to: phoneNumber,
            body_text: z.string().min(1).max(4096).describe('Main message text'),
            button_text: z.string().min(1).max(20).describe('Label of the button that opens the list (max 20 chars)'),
            sections: z
                .array(
                    z.object({
                        title: z.string().max(24).optional().describe('Section title (required when >1 section)'),
                        rows: z
                            .array(
                                z.object({
                                    id: z.string().min(1).max(200),
                                    title: z.string().min(1).max(24).describe('Row title (max 24 chars)'),
                                    description: z.string().max(72).optional().describe('Row description (max 72)'),
                                }),
                            )
                            .min(1),
                    }),
                )
                .min(1)
                .max(10),
            header_text: headerText,
            footer_text: footerText,
            reply_message_id: replyTo,
        },
        annotations: WRITE,
        run: async ({ to, body_text, button_text, sections, header_text, footer_text, reply_message_id }, c) => {
            const rowCount = sections.reduce((n, s) => n + s.rows.length, 0);
            if (rowCount > 10) throw new ToolInputError(`A list can have at most 10 rows in total (got ${rowCount}).`);
            if (sections.length > 1 && sections.some((s) => !s.title)) {
                throw new ToolInputError('Every section needs a title when there is more than one section.');
            }
            return c.getClient().messages.interactiveList({
                to,
                body: {
                    type: 'list',
                    body: { text: body_text },
                    ...withHeaderFooter(header_text, footer_text),
                    action: {
                        button: button_text,
                        sections: sections.map((s) => ({ ...(s.title && { title: s.title }), rows: s.rows })),
                    },
                },
                ...(reply_message_id && { replyMessageId: reply_message_id }),
            });
        },
    });

    defineTool(server, ctx, {
        name: 'mark_as_read',
        title: 'Mark message as read',
        description:
            'Mark an incoming message as read (blue ticks). Optionally show a typing indicator for up to 25 seconds.',
        input: {
            message_id: z.string().min(1).describe('ID (wamid...) of the incoming message'),
            typing_indicator: z.boolean().optional().describe('Also show a typing indicator (default false)'),
        },
        annotations: { ...WRITE, idempotentHint: true },
        run: ({ message_id, typing_indicator }, c) =>
            typing_indicator
                ? c.getClient().messages.showTypingIndicator({ messageId: message_id })
                : c.getClient().messages.markAsRead({ messageId: message_id }),
    });
}
