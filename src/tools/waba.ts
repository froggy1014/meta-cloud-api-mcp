import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getClient, getWabaId } from '../client.js';
import { formatError } from '../utils/errors.js';
import { formatSuccess } from '../utils/response.js';

export function registerWabaTools(server: McpServer) {
    server.tool(
        'get_waba_account',
        'Get WhatsApp Business Account information — name, status, health, verification, messaging limits',
        {
            fields: z
                .array(
                    z.enum([
                        'id',
                        'name',
                        'timezone_id',
                        'account_review_status',
                        'auth_international_rate_eligibility',
                        'business_verification_status',
                        'country',
                        'currency',
                        'health_status',
                        'status',
                        'ownership_type',
                        'message_template_namespace',
                        'primary_business_location',
                        'analytics',
                        'is_enabled_for_insights',
                        'is_shared_with_partners',
                        'marketing_messages_lite_api_status',
                        'marketing_messages_onboarding_status',
                        'on_behalf_of_business_info',
                        'primary_funding_id',
                        'purchase_order_number',
                        'whatsapp_business_manager_messaging_limit',
                    ]),
                )
                .optional()
                .describe('Specific WABA account fields to retrieve'),
        },
        async ({ fields }) => {
            try {
                const result = await getClient().waba.getWabaAccount(fields);
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'subscribe_waba_webhook',
        'Subscribe your app to WABA webhooks. Optionally override the callback URL and verify token.',
        {
            override_callback_uri: z
                .string()
                .optional()
                .describe('Custom webhook callback URL (overrides app dashboard setting)'),
            verify_token: z
                .string()
                .optional()
                .describe('Verify token for webhook validation (required if override_callback_uri is set)'),
        },
        async ({ override_callback_uri, verify_token }) => {
            try {
                const result = await getClient().waba.updateWabaSubscription({
                    override_callback_uri: override_callback_uri ?? '',
                    verify_token: verify_token ?? '',
                });
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'unsubscribe_waba_webhook',
        'Unsubscribe your app from WABA webhooks',
        {},
        async () => {
            try {
                const result = await getClient().waba.unsubscribeFromWaba();
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );
}
