// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/whatsapp-business-accounts/
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ToolContext } from '../context.js';
import { ToolInputError } from '../result.js';
import { DESTRUCTIVE, defineTool, READ_ONLY, WRITE } from './define.js';

export function registerWabaTools(server: McpServer, ctx: ToolContext): void {
    defineTool(server, ctx, {
        name: 'get_waba_account',
        title: 'Get WABA account',
        description:
            'Get WhatsApp Business Account info: name, status, review and verification status, currency, timezone, limits.',
        input: {
            fields: z
                .array(z.string().regex(/^[a-z_]+$/))
                .min(1)
                .optional()
                .describe('Fields to return, e.g. ["id","name","account_review_status","business_verification_status"]'),
        },
        annotations: READ_ONLY,
        run: ({ fields }, c) => {
            c.getBusinessAccountId();
            return c.getClient().waba.getWabaAccount(fields as never);
        },
    });

    defineTool(server, ctx, {
        name: 'subscribe_waba_webhook',
        title: 'Subscribe app to WABA webhooks',
        description:
            'Subscribe your app to webhooks for the WABA, optionally overriding the callback URL for this WABA only.',
        input: {
            override_callback_uri: z.url().optional().describe('Callback URL overriding the app-level setting'),
            verify_token: z.string().min(1).optional().describe('Verify token (required with override_callback_uri)'),
        },
        annotations: { ...WRITE, idempotentHint: true },
        run: ({ override_callback_uri, verify_token }, c) => {
            if (override_callback_uri && !verify_token) {
                throw new ToolInputError('verify_token is required when override_callback_uri is set.');
            }
            c.getBusinessAccountId();
            return c.getClient().waba.updateWabaSubscription({
                ...(override_callback_uri && { override_callback_uri, verify_token }),
            } as never);
        },
    });

    defineTool(server, ctx, {
        name: 'unsubscribe_waba_webhook',
        title: 'Unsubscribe app from WABA webhooks',
        description: 'Stop delivering this WABA’s webhooks to your app.',
        input: {},
        annotations: DESTRUCTIVE,
        run: (_args, c) => {
            c.getBusinessAccountId();
            return c.getClient().waba.unsubscribeFromWaba();
        },
    });
}
