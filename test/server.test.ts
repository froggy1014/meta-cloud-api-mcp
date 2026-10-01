import { readFileSync } from 'node:fs';
import {
    WhatsAppAuthorizationError,
    WhatsAppNetworkError,
    WhatsAppSendMessageError,
    WhatsAppValidationError,
} from 'meta-cloud-api';
import { afterEach, describe, expect, it } from 'vitest';
import { assertClientConfig, ConfigError, readConfig } from '../src/config.js';
import { createContext } from '../src/context.js';
import { errorResult, redact } from '../src/result.js';
import { VERSION } from '../src/version.js';
import { connect, TOKEN } from './harness.js';

let session: Awaited<ReturnType<typeof connect>>;
afterEach(() => session?.close());

const REQUIRED_TOOLS = [
    'send_text_message',
    'send_template_message',
    'send_media_message',
    'send_interactive_buttons',
    'send_interactive_list',
    'mark_as_read',
    'list_templates',
    'get_template',
    'upload_media',
    'get_media_url',
    'get_business_profile',
    'list_phone_numbers',
];

describe('server', () => {
    it('version matches package.json', () => {
        const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
        expect(VERSION).toBe(pkg.version);
    });

    it('lists the core tools with schemas and annotations', async () => {
        session = await connect();
        const { tools } = await session.client.listTools();
        const names = tools.map((t) => t.name);
        expect(names).toEqual(expect.arrayContaining(REQUIRED_TOOLS));
        expect(new Set(names).size).toBe(names.length);
        for (const tool of tools) {
            expect(tool.description, tool.name).toBeTruthy();
            expect(tool.inputSchema.type, tool.name).toBe('object');
            expect(tool.annotations?.readOnlyHint, tool.name).toBeTypeOf('boolean');
        }
        const readOnly = tools.filter((t) => t.annotations?.readOnlyHint).map((t) => t.name);
        expect(readOnly).toEqual(expect.arrayContaining(['list_templates', 'get_media_url', 'list_phone_numbers']));
        expect(readOnly).not.toContain('send_text_message');
    });
});

describe('error results', () => {
    const meta = (code: number) => ({ message: 'boom', type: 'OAuthException', code, fbtrace_id: 'trace-1' });

    it('maps WhatsAppApiError subclasses to structured errors with hints', async () => {
        session = await connect();
        session.sdk.messages.text.mockRejectedValueOnce(
            new WhatsAppAuthorizationError(`Invalid token ${TOKEN}`, meta(190), 401),
        );
        const { isError, text } = await session.call('send_text_message', { to: '14155552671', body: 'x' });
        expect(isError).toBe(true);
        const body = JSON.parse(text);
        expect(body).toMatchObject({
            error: 'WhatsAppAuthorizationError',
            statusCode: 401,
            code: 190,
            fbtrace_id: 'trace-1',
        });
        expect(body.hint).toContain('CLOUD_API_ACCESS_TOKEN');
        expect(text).not.toContain(TOKEN);
        expect(text).toContain('[REDACTED]');
    });

    it('explains the 24-hour window error', () => {
        const err = new WhatsAppSendMessageError('Re-engagement message', meta(131047), 400);
        const first = errorResult(err).content[0] as { text: string };
        expect(JSON.parse(first.text).hint).toContain('template');
    });

    it.each([
        [new WhatsAppValidationError('bad phone'), 'WhatsAppValidationError'],
        [new WhatsAppNetworkError('socket hang up'), 'WhatsAppNetworkError'],
        [new ConfigError('missing'), 'ConfigError'],
        [new Error('plain'), 'Error'],
    ])('describes %s', (error, name) => {
        const result = errorResult(error);
        expect(result.isError).toBe(true);
        const first = result.content[0] as { text: string };
        expect(JSON.parse(first.text).error).toBe(name);
    });

    it('redacts the token and access_token query params', () => {
        expect(redact(`a ${TOKEN} b`, [TOKEN])).toBe('a [REDACTED] b');
        expect(redact('https://x/y?access_token=abc&z=1', [])).toBe('https://x/y?access_token=[REDACTED]&z=1');
    });
});

describe('config', () => {
    it('reads and trims env vars', () => {
        expect(
            readConfig({
                CLOUD_API_ACCESS_TOKEN: ' tok ',
                WA_PHONE_NUMBER_ID: '123',
                WA_BUSINESS_ACCOUNT_ID: '',
            }),
        ).toEqual({ accessToken: 'tok', phoneNumberId: '123', businessAccountId: undefined, apiVersion: undefined });
    });

    it('names missing variables without echoing values', () => {
        expect(() => assertClientConfig({})).toThrow(/CLOUD_API_ACCESS_TOKEN, WA_PHONE_NUMBER_ID/);
        expect(() => assertClientConfig({ accessToken: TOKEN, phoneNumberId: 'abc' })).toThrow(ConfigError);
        try {
            assertClientConfig({ accessToken: TOKEN, phoneNumberId: 'abc' });
        } catch (error) {
            expect((error as Error).message).not.toContain(TOKEN);
        }
    });

    it('createContext builds a real SDK client lazily without writing to stdout', () => {
        const writes: string[] = [];
        const original = process.stdout.write.bind(process.stdout);
        process.stdout.write = ((chunk: string) => {
            writes.push(String(chunk));
            return true;
        }) as typeof process.stdout.write;
        try {
            const ctx = createContext({ accessToken: TOKEN, phoneNumberId: '1234567890' });
            const client = ctx.getClient();
            expect(typeof client.messages.text).toBe('function');
            expect(ctx.getClient()).toBe(client);
            expect(() => ctx.getBusinessAccountId()).toThrow(/WA_BUSINESS_ACCOUNT_ID/);
        } finally {
            process.stdout.write = original;
        }
        expect(writes.join('')).not.toContain(TOKEN);
    });
});
