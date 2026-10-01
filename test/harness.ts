import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { vi } from 'vitest';
import { ConfigError } from '../src/config.js';
import type { ToolContext, WhatsAppClient } from '../src/context.js';
import { createServer } from '../src/server.js';

export const TOKEN = 'EAAG-test-token-do-not-leak';

const ok = (value: unknown = { success: true }) => vi.fn().mockResolvedValue(value);

/** A stand-in for the meta-cloud-api client: every SDK method the tools call is a vi.fn. */
export function createMockSdk() {
    return {
        messages: {
            text: ok({ messages: [{ id: 'wamid.text' }] }),
            template: ok({ messages: [{ id: 'wamid.template' }] }),
            image: ok(),
            video: ok(),
            audio: ok(),
            document: ok(),
            sticker: ok(),
            interactiveReplyButtons: ok(),
            interactiveList: ok(),
            markAsRead: ok(),
            showTypingIndicator: ok(),
        },
        media: {
            uploadMedia: ok({ id: 'media-1' }),
            getMediaById: ok({ url: 'https://lookaside.fbsbx.com/x', mime_type: 'image/png' }),
            downloadMedia: vi.fn().mockResolvedValue(new Blob([new Uint8Array([1, 2, 3])])),
            deleteMedia: ok(),
        },
        templates: {
            getTemplates: ok({ data: [] }),
            getTemplate: ok({ id: 't1' }),
            createTemplate: ok({ id: 't2', status: 'PENDING' }),
            updateTemplate: ok(),
            deleteTemplate: ok(),
        },
        businessProfile: {
            getBusinessProfile: ok({ data: [{ about: 'hi' }] }),
            updateBusinessProfile: ok(),
        },
        phoneNumbers: {
            getPhoneNumbers: ok({ data: [] }),
            getPhoneNumberById: ok({ id: '1' }),
            requestVerificationCode: ok(),
            verifyCode: ok(),
        },
        waba: {
            getWabaAccount: ok({ id: 'waba' }),
            updateWabaSubscription: ok(),
            unsubscribeFromWaba: ok(),
        },
        registration: { register: ok(), deregister: ok() },
        flows: {
            listFlows: ok({ data: [] }),
            getFlow: ok({ id: 'f1' }),
            createFlow: ok({ id: 'f2' }),
            updateFlowMetadata: ok(),
            updateFlowJson: ok(),
            publishFlow: ok(),
            deprecateFlow: ok(),
            deleteFlow: ok(),
        },
    };
}

export type MockSdk = ReturnType<typeof createMockSdk>;

export async function connect(options: { businessAccountId?: string | null } = {}) {
    const sdk = createMockSdk();
    const businessAccountId = options.businessAccountId === undefined ? '1029384756' : options.businessAccountId;
    const ctx: ToolContext = {
        getClient: () => sdk as unknown as WhatsAppClient,
        getBusinessAccountId: () => {
            if (!businessAccountId) throw new ConfigError('This tool needs WA_BUSINESS_ACCOUNT_ID.');
            return businessAccountId;
        },
        secrets: () => [TOKEN],
    };

    const server = createServer(ctx);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    async function call(name: string, args: Record<string, unknown> = {}) {
        const result = (await client.callTool({ name, arguments: args })) as CallToolResult;
        const first = result.content[0];
        const text = first && first.type === 'text' ? first.text : '';
        return { result, text, isError: result.isError === true };
    }

    return { sdk, client, call, close: () => client.close() };
}
