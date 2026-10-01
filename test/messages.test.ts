import { afterEach, describe, expect, it } from 'vitest';
import { connect } from './harness.js';

let session: Awaited<ReturnType<typeof connect>>;
afterEach(() => session?.close());

describe('message tools', () => {
    it('send_text_message maps to messages.text and normalizes the phone number', async () => {
        session = await connect();
        const { isError, text } = await session.call('send_text_message', {
            to: '+1 (415) 555-2671',
            body: 'Hello',
            preview_url: false,
            reply_message_id: 'wamid.prev',
        });
        expect(isError).toBe(false);
        expect(JSON.parse(text)).toEqual({ messages: [{ id: 'wamid.text' }] });
        expect(session.sdk.messages.text).toHaveBeenCalledWith({
            to: '+14155552671',
            body: 'Hello',
            previewUrl: false,
            replyMessageId: 'wamid.prev',
        });
    });

    it('rejects an invalid phone number before calling the SDK', async () => {
        session = await connect();
        const { isError, text } = await session.call('send_text_message', { to: '123', body: 'Hi' });
        expect(isError).toBe(true);
        expect(text).toContain('international phone number');
        expect(session.sdk.messages.text).not.toHaveBeenCalled();
    });

    it('send_template_message builds a deterministic language object', async () => {
        session = await connect();
        const components = [{ type: 'body', parameters: [{ type: 'text', text: 'Alice' }] }];
        await session.call('send_template_message', {
            to: '14155552671',
            template_name: 'order_update',
            language_code: 'en_US',
            components,
        });
        expect(session.sdk.messages.template).toHaveBeenCalledWith({
            to: '14155552671',
            body: { name: 'order_update', language: { policy: 'deterministic', code: 'en_US' }, components },
        });
    });

    it.each([
        ['image', { media_id: 'm1', caption: 'pic' }, { id: 'm1', caption: 'pic' }],
        ['video', { link: 'https://example.com/v.mp4' }, { link: 'https://example.com/v.mp4' }],
        ['audio', { media_id: 'a1' }, { id: 'a1' }],
        [
            'document',
            { link: 'https://example.com/a.pdf', filename: 'a.pdf', caption: 'Invoice' },
            { link: 'https://example.com/a.pdf', filename: 'a.pdf', caption: 'Invoice' },
        ],
        ['sticker', { media_id: 's1' }, { id: 's1' }],
    ] as const)('send_media_message type=%s calls messages.%s', async (type, input, body) => {
        session = await connect();
        const { isError } = await session.call('send_media_message', { to: '14155552671', type, ...input });
        expect(isError).toBe(false);
        expect(session.sdk.messages[type]).toHaveBeenCalledWith({ to: '14155552671', body });
    });

    it.each([
        [{ type: 'image' }, 'exactly one of media_id or link'],
        [{ type: 'image', media_id: 'm', link: 'https://example.com/x.png' }, 'exactly one of media_id or link'],
        [{ type: 'audio', media_id: 'm', caption: 'x' }, 'caption is not supported'],
        [{ type: 'image', media_id: 'm', filename: 'x.png' }, 'filename is only supported'],
    ])('send_media_message rejects %j', async (input, message) => {
        session = await connect();
        const { isError, text } = await session.call('send_media_message', { to: '14155552671', ...input });
        expect(isError).toBe(true);
        expect(JSON.parse(text)).toMatchObject({ error: 'ToolInputError' });
        expect(text).toContain(message);
        expect(session.sdk.messages.image).not.toHaveBeenCalled();
        expect(session.sdk.messages.audio).not.toHaveBeenCalled();
    });

    it('send_interactive_buttons builds reply buttons with header and footer', async () => {
        session = await connect();
        await session.call('send_interactive_buttons', {
            to: '14155552671',
            body_text: 'Confirm?',
            header_text: 'Order 42',
            footer_text: 'Reply below',
            buttons: [
                { id: 'yes', title: 'Yes' },
                { id: 'no', title: 'No' },
            ],
        });
        expect(session.sdk.messages.interactiveReplyButtons).toHaveBeenCalledWith({
            to: '14155552671',
            body: {
                type: 'button',
                body: { text: 'Confirm?' },
                header: { type: 'text', text: 'Order 42' },
                footer: { text: 'Reply below' },
                action: {
                    buttons: [
                        { type: 'reply', reply: { id: 'yes', title: 'Yes' } },
                        { type: 'reply', reply: { id: 'no', title: 'No' } },
                    ],
                },
            },
        });
    });

    it('send_interactive_buttons rejects more than 3 buttons', async () => {
        session = await connect();
        const buttons = [1, 2, 3, 4].map((n) => ({ id: `b${n}`, title: `B${n}` }));
        const { isError } = await session.call('send_interactive_buttons', {
            to: '14155552671',
            body_text: 'Pick',
            buttons,
        });
        expect(isError).toBe(true);
        expect(session.sdk.messages.interactiveReplyButtons).not.toHaveBeenCalled();
    });

    it('send_interactive_list maps sections and rows', async () => {
        session = await connect();
        const rows = [{ id: 'r1', title: 'Row 1', description: 'First' }];
        await session.call('send_interactive_list', {
            to: '14155552671',
            body_text: 'Choose',
            button_text: 'Options',
            sections: [{ title: 'Main', rows }],
        });
        expect(session.sdk.messages.interactiveList).toHaveBeenCalledWith({
            to: '14155552671',
            body: {
                type: 'list',
                body: { text: 'Choose' },
                action: { button: 'Options', sections: [{ title: 'Main', rows }] },
            },
        });
    });

    it('send_interactive_list enforces the 10-row total', async () => {
        session = await connect();
        const rows = Array.from({ length: 6 }, (_, i) => ({ id: `r${i}`, title: `Row ${i}` }));
        const { isError, text } = await session.call('send_interactive_list', {
            to: '14155552671',
            body_text: 'Choose',
            button_text: 'Options',
            sections: [
                { title: 'A', rows },
                { title: 'B', rows },
            ],
        });
        expect(isError).toBe(true);
        expect(text).toContain('at most 10 rows');
        expect(session.sdk.messages.interactiveList).not.toHaveBeenCalled();
    });

    it('mark_as_read calls markAsRead, or showTypingIndicator when asked', async () => {
        session = await connect();
        await session.call('mark_as_read', { message_id: 'wamid.in' });
        expect(session.sdk.messages.markAsRead).toHaveBeenCalledWith({ messageId: 'wamid.in' });

        await session.call('mark_as_read', { message_id: 'wamid.in2', typing_indicator: true });
        expect(session.sdk.messages.showTypingIndicator).toHaveBeenCalledWith({ messageId: 'wamid.in2' });
    });
});
