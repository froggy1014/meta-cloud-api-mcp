import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { ToolContext } from '../context.js';
import { errorResult, successResult } from '../result.js';

export interface ToolSpec<S extends z.ZodRawShape> {
    name: string;
    title: string;
    description: string;
    input: S;
    annotations: ToolAnnotations;
    run: (args: z.infer<z.ZodObject<S>>, ctx: ToolContext) => Promise<unknown>;
}

export const READ_ONLY: ToolAnnotations = { readOnlyHint: true, openWorldHint: true };
export const WRITE: ToolAnnotations = { readOnlyHint: false, destructiveHint: false, openWorldHint: true };
export const DESTRUCTIVE: ToolAnnotations = { readOnlyHint: false, destructiveHint: true, openWorldHint: true };

/** Registers a tool whose handler result/error is turned into an MCP result with secrets redacted. */
export function defineTool<S extends z.ZodRawShape>(server: McpServer, ctx: ToolContext, spec: ToolSpec<S>): void {
    server.registerTool(
        spec.name,
        {
            title: spec.title,
            description: spec.description,
            inputSchema: spec.input,
            annotations: { title: spec.title, ...spec.annotations },
        },
        // The MCP SDK has already validated `args` against `spec.input` at this point.
        (async (args: z.infer<z.ZodObject<S>>) => {
            try {
                return successResult(await spec.run(args, ctx), ctx.secrets());
            } catch (error) {
                return errorResult(error, ctx.secrets());
            }
        }) as never,
    );
}

/** Recipient phone number in international format; spaces, dashes and parentheses are stripped. */
export const phoneNumber = z
    .string()
    .transform((value) => value.replace(/[\s\-().]/g, ''))
    .pipe(z.string().regex(/^\+?\d{10,15}$/, 'Expected an international phone number, e.g. +14155552671'))
    .describe('Recipient phone number in international format, e.g. "+14155552671" or "821012345678"');

export const replyTo = z
    .string()
    .min(1)
    .optional()
    .describe('Optional message ID (wamid...) to reply to, shown as a quoted reply');
