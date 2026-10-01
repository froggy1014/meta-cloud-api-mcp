// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ToolContext } from '../context.js';
import { DESTRUCTIVE, defineTool, READ_ONLY, WRITE } from './define.js';

const category = z.enum(['AUTHENTICATION', 'MARKETING', 'UTILITY']);
const components = z.array(z.record(z.string(), z.unknown()));

export function registerTemplateTools(server: McpServer, ctx: ToolContext): void {
    defineTool(server, ctx, {
        name: 'list_templates',
        title: 'List templates',
        description: 'List message templates in the WhatsApp Business Account, optionally filtered.',
        input: {
            name: z.string().min(1).optional().describe('Filter by template name'),
            status: z
                .enum(['APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED', 'IN_APPEAL', 'PENDING_DELETION'])
                .optional()
                .describe('Filter by review status'),
            category: category.optional().describe('Filter by category'),
            language: z.string().min(2).optional().describe('Filter by language code, e.g. "en_US"'),
            limit: z.number().int().min(1).max(1000).optional().describe('Maximum number of templates to return'),
        },
        annotations: READ_ONLY,
        run: (params, c) => {
            c.getBusinessAccountId();
            return c.getClient().templates.getTemplates({
                ...(params.name && { name: params.name }),
                ...(params.status && { status: params.status as never }),
                ...(params.category && { category: params.category as never }),
                ...(params.language && { language: params.language as never }),
                ...(params.limit && { limit: params.limit }),
            });
        },
    });

    defineTool(server, ctx, {
        name: 'get_template',
        title: 'Get template',
        description: 'Get one message template by ID, including its components and variables.',
        input: {
            template_id: z.string().min(1).describe('Template ID (from list_templates)'),
        },
        annotations: READ_ONLY,
        run: ({ template_id }, c) => c.getClient().templates.getTemplate(template_id),
    });

    defineTool(server, ctx, {
        name: 'create_template',
        title: 'Create template',
        description:
            'Create a message template and submit it for review. Components follow the Cloud API schema (HEADER, BODY, FOOTER, BUTTONS).',
        input: {
            name: z
                .string()
                .regex(/^[a-z0-9_]{1,512}$/, 'Lowercase letters, digits and underscores only')
                .describe('Template name'),
            language: z.string().min(2).describe('Language code, e.g. "en_US"'),
            category,
            components: components.describe(
                'Example: [{"type":"BODY","text":"Hello {{1}}","example":{"body_text":[["Alice"]]}}]',
            ),
            allow_category_change: z.boolean().optional().describe('Let Meta re-categorize instead of rejecting'),
            parameter_format: z.enum(['POSITIONAL', 'NAMED']).optional().describe('Variable style'),
        },
        annotations: WRITE,
        run: (params, c) => {
            c.getBusinessAccountId();
            return c.getClient().templates.createTemplate({
                name: params.name,
                language: params.language as never,
                category: params.category as never,
                components: params.components as never,
                ...(params.allow_category_change !== undefined && {
                    allow_category_change: params.allow_category_change,
                }),
                ...(params.parameter_format && { parameter_format: params.parameter_format as never }),
            });
        },
    });

    defineTool(server, ctx, {
        name: 'update_template',
        title: 'Update template',
        description: 'Edit a template’s components or category. The template is re-submitted for review.',
        input: {
            template_id: z.string().min(1).describe('Template ID'),
            components: components.optional().describe('Replacement components array'),
            category: category.optional().describe('New category'),
        },
        annotations: WRITE,
        run: ({ template_id, components: comps, category: cat }, c) =>
            c.getClient().templates.updateTemplate(template_id, {
                ...(comps && { components: comps as never }),
                ...(cat && { category: cat as never }),
            }),
    });

    defineTool(server, ctx, {
        name: 'delete_template',
        title: 'Delete template',
        description:
            'Delete a template by name (all languages), or a single language version when hsm_id is given. Irreversible.',
        input: {
            name: z.string().min(1).describe('Template name'),
            hsm_id: z.string().min(1).optional().describe('Template ID of one language version to delete'),
        },
        annotations: DESTRUCTIVE,
        run: ({ name, hsm_id }, c) => {
            c.getBusinessAccountId();
            return c.getClient().templates.deleteTemplate({ name, ...(hsm_id && { hsm_id }) });
        },
    });
}
