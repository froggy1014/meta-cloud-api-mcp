// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ToolContext } from '../context.js';
import { ToolInputError } from '../result.js';
import { DESTRUCTIVE, defineTool, READ_ONLY, WRITE } from './define.js';

const FlowCategory = z.enum([
    'SIGN_UP',
    'SIGN_IN',
    'APPOINTMENT_BOOKING',
    'LEAD_GENERATION',
    'CONTACT_US',
    'CUSTOMER_SUPPORT',
    'SURVEY',
    'OTHER',
]);

const wabaId = z.string().regex(/^\d+$/).optional().describe('WABA ID (defaults to WA_BUSINESS_ACCOUNT_ID)');
const flowId = z.string().min(1).describe('Flow ID');

function parseFlowJson(value: string | Record<string, unknown>): Record<string, unknown> {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value) as Record<string, unknown>;
    } catch {
        throw new ToolInputError('flow_json is not valid JSON.');
    }
}

export function registerFlowTools(server: McpServer, ctx: ToolContext): void {
    defineTool(server, ctx, {
        name: 'list_flows',
        title: 'List flows',
        description: 'List WhatsApp Flows in the WhatsApp Business Account.',
        input: { waba_id: wabaId },
        annotations: READ_ONLY,
        run: ({ waba_id }, c) => c.getClient().flows.listFlows(waba_id ?? c.getBusinessAccountId()),
    });

    defineTool(server, ctx, {
        name: 'get_flow',
        title: 'Get flow',
        description: 'Get a Flow by ID, including status, categories and validation errors.',
        input: {
            flow_id: flowId,
            fields: z
                .string()
                .optional()
                .describe('Comma-separated fields, e.g. "id,name,status,categories,validation_errors"'),
        },
        annotations: READ_ONLY,
        run: ({ flow_id, fields }, c) => c.getClient().flows.getFlow(flow_id, fields),
    });

    defineTool(server, ctx, {
        name: 'create_flow',
        title: 'Create flow',
        description: 'Create a Flow, optionally from inline Flow JSON or by cloning another Flow.',
        input: {
            name: z.string().min(1).describe('Flow name'),
            waba_id: wabaId,
            categories: z.array(FlowCategory).min(1).optional().describe('Flow categories'),
            endpoint_uri: z.url().optional().describe('Data exchange endpoint URL'),
            clone_flow_id: z.string().min(1).optional().describe('Flow ID to clone'),
            flow_json: z.string().min(1).optional().describe('Flow JSON as a string'),
            publish: z.boolean().optional().describe('Publish right after creation'),
        },
        annotations: WRITE,
        run: (p, c) =>
            c.getClient().flows.createFlow(p.waba_id ?? c.getBusinessAccountId(), {
                name: p.name,
                ...(p.categories && { categories: p.categories as never }),
                ...(p.endpoint_uri && { endpoint_uri: p.endpoint_uri }),
                ...(p.clone_flow_id && { clone_flow_id: p.clone_flow_id }),
                ...(p.flow_json && { flow_json: p.flow_json }),
                ...(p.publish !== undefined && { publish: p.publish }),
            }),
    });

    defineTool(server, ctx, {
        name: 'update_flow_metadata',
        title: 'Update flow metadata',
        description: 'Update a Flow’s name, categories or endpoint URL.',
        input: {
            flow_id: flowId,
            name: z.string().min(1).optional(),
            categories: z.array(FlowCategory).min(1).optional(),
            endpoint_uri: z.url().optional(),
        },
        annotations: { ...WRITE, idempotentHint: true },
        run: ({ flow_id, name, categories, endpoint_uri }, c) =>
            c.getClient().flows.updateFlowMetadata(flow_id, {
                ...(name && { name }),
                ...(categories && { categories: categories as never }),
                ...(endpoint_uri && { endpoint_uri }),
            }),
    });

    defineTool(server, ctx, {
        name: 'update_flow_json',
        title: 'Update flow JSON',
        description: 'Upload a new Flow JSON definition to a DRAFT Flow. Returns validation errors if any.',
        input: {
            flow_id: flowId,
            flow_json: z
                .union([z.string().min(1), z.record(z.string(), z.unknown())])
                .describe('Flow JSON (string or object)'),
        },
        annotations: { ...WRITE, idempotentHint: true },
        run: ({ flow_id, flow_json }, c) =>
            c.getClient().flows.updateFlowJson(flow_id, { file: parseFlowJson(flow_json) }),
    });

    defineTool(server, ctx, {
        name: 'publish_flow',
        title: 'Publish flow',
        description: 'Publish a DRAFT Flow. Published Flows can no longer be edited.',
        input: { flow_id: flowId },
        annotations: WRITE,
        run: ({ flow_id }, c) => c.getClient().flows.publishFlow(flow_id),
    });

    defineTool(server, ctx, {
        name: 'deprecate_flow',
        title: 'Deprecate flow',
        description: 'Deprecate a PUBLISHED Flow so it can no longer be sent. Irreversible.',
        input: { flow_id: flowId },
        annotations: DESTRUCTIVE,
        run: ({ flow_id }, c) => c.getClient().flows.deprecateFlow(flow_id),
    });

    defineTool(server, ctx, {
        name: 'delete_flow',
        title: 'Delete flow',
        description: 'Delete a DRAFT Flow. Irreversible.',
        input: { flow_id: flowId },
        annotations: DESTRUCTIVE,
        run: ({ flow_id }, c) => c.getClient().flows.deleteFlow(flow_id),
    });
}
