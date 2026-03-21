import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getClient, getWabaId } from '../client.js';
import { formatError } from '../utils/errors.js';
import { formatSuccess } from '../utils/response.js';

const FlowCategoryEnum = z.enum([
    'SIGN_UP',
    'SIGN_IN',
    'APPOINTMENT_BOOKING',
    'LEAD_GENERATION',
    'CONTACT_US',
    'CUSTOMER_SUPPORT',
    'SURVEY',
    'OTHER',
]);

export function registerFlowTools(server: McpServer) {
    server.tool(
        'list_flows',
        'List all WhatsApp Flows for a WhatsApp Business Account',
        {
            waba_id: z
                .string()
                .optional()
                .describe(
                    'WhatsApp Business Account ID (defaults to WA_BUSINESS_ACCOUNT_ID env var)',
                ),
        },
        async ({ waba_id }) => {
            try {
                const id = waba_id || getWabaId();
                const result = await getClient().flows.listFlows(id);
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'get_flow',
        'Get details of a WhatsApp Flow by ID, including status, categories, and validation errors',
        {
            flow_id: z.string().describe('The Flow ID to retrieve'),
            fields: z
                .string()
                .optional()
                .describe(
                    'Comma-separated fields to return (e.g. "id,name,status,categories,validation_errors")',
                ),
        },
        async ({ flow_id, fields }) => {
            try {
                const result = await getClient().flows.getFlow(flow_id, fields);
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'create_flow',
        'Create a new WhatsApp Flow. Optionally provide flow_json inline or clone from an existing flow.',
        {
            name: z.string().describe('Flow name'),
            waba_id: z
                .string()
                .optional()
                .describe('WABA ID (defaults to WA_BUSINESS_ACCOUNT_ID env var)'),
            categories: z
                .array(FlowCategoryEnum)
                .optional()
                .describe('Flow categories'),
            endpoint_uri: z
                .string()
                .optional()
                .describe('Endpoint URI for the flow data exchange'),
            clone_flow_id: z.string().optional().describe('Flow ID to clone from'),
            flow_json: z
                .string()
                .optional()
                .describe('Flow JSON definition as a string'),
            publish: z.boolean().optional().describe('Publish immediately after creation'),
        },
        async (params) => {
            try {
                const wabaId = params.waba_id || getWabaId();
                const result = await getClient().flows.createFlow(wabaId, {
                    name: params.name,
                    ...(params.categories && { categories: params.categories as any }),
                    ...(params.endpoint_uri && { endpoint_uri: params.endpoint_uri }),
                    ...(params.clone_flow_id && { clone_flow_id: params.clone_flow_id }),
                    ...(params.flow_json && { flow_json: params.flow_json }),
                    ...(params.publish !== undefined && { publish: params.publish }),
                });
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'update_flow_metadata',
        'Update metadata of an existing WhatsApp Flow (name, categories, endpoint URI)',
        {
            flow_id: z.string().describe('The Flow ID to update'),
            name: z.string().optional().describe('New flow name'),
            categories: z
                .array(FlowCategoryEnum)
                .optional()
                .describe('Updated flow categories'),
            endpoint_uri: z.string().optional().describe('Updated endpoint URI'),
        },
        async ({ flow_id, name, categories, endpoint_uri }) => {
            try {
                const result = await getClient().flows.updateFlowMetadata(flow_id, {
                    ...(name && { name }),
                    ...(categories && { categories: categories as any }),
                    ...(endpoint_uri && { endpoint_uri }),
                });
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'update_flow_json',
        'Upload or update the Flow JSON definition for a WhatsApp Flow. Accepts JSON as a string or object.',
        {
            flow_id: z.string().describe('The Flow ID to update'),
            flow_json: z
                .union([z.string(), z.record(z.any())])
                .describe('Flow JSON definition (string or object)'),
        },
        async ({ flow_id, flow_json }) => {
            try {
                const jsonObj =
                    typeof flow_json === 'string' ? JSON.parse(flow_json) : flow_json;
                const result = await getClient().flows.updateFlowJson(flow_id, {
                    file: jsonObj,
                });
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'delete_flow',
        'Delete a WhatsApp Flow. Only DRAFT flows can be deleted.',
        {
            flow_id: z.string().describe('The Flow ID to delete'),
        },
        async ({ flow_id }) => {
            try {
                const result = await getClient().flows.deleteFlow(flow_id);
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'publish_flow',
        'Publish a DRAFT WhatsApp Flow. Once published, the flow JSON cannot be modified.',
        {
            flow_id: z.string().describe('The Flow ID to publish'),
        },
        async ({ flow_id }) => {
            try {
                const result = await getClient().flows.publishFlow(flow_id);
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'deprecate_flow',
        'Deprecate a PUBLISHED WhatsApp Flow. This is irreversible — the flow can no longer be used.',
        {
            flow_id: z.string().describe('The Flow ID to deprecate'),
        },
        async ({ flow_id }) => {
            try {
                const result = await getClient().flows.deprecateFlow(flow_id);
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );
}
