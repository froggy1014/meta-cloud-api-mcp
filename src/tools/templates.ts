import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getClient, getWabaId } from '../client.js';
import { formatError } from '../utils/errors.js';
import { formatSuccess } from '../utils/response.js';

export function registerTemplateTools(server: McpServer) {
    server.tool(
        'list_templates',
        'List WhatsApp message templates with optional filters (name, status, category, language)',
        {
            name: z.string().optional().describe('Filter by template name'),
            status: z
                .enum(['APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED'])
                .optional()
                .describe('Filter by review status'),
            category: z
                .enum(['AUTHENTICATION', 'MARKETING', 'UTILITY'])
                .optional()
                .describe('Filter by category'),
            language: z.string().optional().describe('Filter by language code (e.g. en_US, ko)'),
            limit: z.number().optional().describe('Max number of templates to return'),
        },
        async (params) => {
            try {
                const result = await getClient().templates.getTemplates({
                    ...(params.name && { name: params.name }),
                    ...(params.status && { status: params.status as any }),
                    ...(params.category && { category: params.category as any }),
                    ...(params.language && { language: params.language as any }),
                    ...(params.limit && { limit: params.limit }),
                });
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'get_template',
        'Get a single WhatsApp message template by ID with full definition including components',
        {
            template_id: z.string().describe('The template ID to retrieve'),
        },
        async ({ template_id }) => {
            try {
                const result = await getClient().templates.getTemplate(template_id);
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'create_template',
        'Create a new WhatsApp message template. Components array should follow Meta template component schema (HEADER, BODY, FOOTER, BUTTONS).',
        {
            name: z
                .string()
                .describe('Template name (lowercase alphanumeric and underscores only)'),
            language: z.string().describe('Language code (e.g. en_US, ko)'),
            category: z
                .enum(['AUTHENTICATION', 'MARKETING', 'UTILITY'])
                .optional()
                .describe('Template category'),
            components: z
                .array(z.record(z.any()))
                .optional()
                .describe(
                    'Template components array: [{type: "HEADER", format: "TEXT", text: "..."}, {type: "BODY", text: "Hello {{1}}"}, {type: "FOOTER", text: "..."}, {type: "BUTTONS", buttons: [...]}]',
                ),
            allow_category_change: z
                .boolean()
                .optional()
                .describe('Allow Meta to auto-assign a different category'),
            parameter_format: z
                .enum(['POSITIONAL', 'NAMED'])
                .optional()
                .describe('Parameter format for template variables'),
        },
        async (params) => {
            try {
                const result = await getClient().templates.createTemplate({
                    name: params.name,
                    language: params.language as any,
                    ...(params.category && { category: params.category as any }),
                    ...(params.components && { components: params.components as any }),
                    ...(params.allow_category_change !== undefined && {
                        allow_category_change: params.allow_category_change,
                    }),
                    ...(params.parameter_format && {
                        parameter_format: params.parameter_format as any,
                    }),
                });
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'update_template',
        'Update an existing WhatsApp message template. Only components and category can be updated. Template is resubmitted for review.',
        {
            template_id: z.string().describe('The template ID to update'),
            components: z
                .array(z.record(z.any()))
                .optional()
                .describe('Updated template components array'),
            category: z
                .enum(['AUTHENTICATION', 'MARKETING', 'UTILITY'])
                .optional()
                .describe('Updated template category'),
        },
        async ({ template_id, components, category }) => {
            try {
                const result = await getClient().templates.updateTemplate(template_id, {
                    ...(components && { components: components as any }),
                    ...(category && { category: category as any }),
                });
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'delete_template',
        'Delete a WhatsApp message template by name. Optionally specify hsm_id to delete a specific language version.',
        {
            name: z.string().describe('Template name to delete'),
            hsm_id: z
                .string()
                .optional()
                .describe('Specific template ID to delete a single language version'),
        },
        async ({ name, hsm_id }) => {
            try {
                const result = await getClient().templates.deleteTemplate({
                    name,
                    hsm_id: hsm_id ?? '',
                } as any);
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );
}
