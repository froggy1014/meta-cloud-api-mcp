import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
    WhatsAppApiError,
    WhatsAppAuthorizationError,
    WhatsAppNetworkError,
    WhatsAppSendMessageError,
    WhatsAppThrottlingError,
} from 'meta-cloud-api';

/** Raised by tool handlers for input that zod alone cannot express (e.g. "id or link"). */
export class ToolInputError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ToolInputError';
    }
}

const REDACTED = '[REDACTED]';

export function redact(text: string, secrets: string[]): string {
    let out = text;
    for (const secret of secrets) {
        if (secret) out = out.split(secret).join(REDACTED);
    }
    // Belt and braces: Graph API URLs can carry tokens as a query parameter.
    return out.replace(/access_token=[^&\s"']+/g, `access_token=${REDACTED}`);
}

function hintFor(error: WhatsAppApiError): string | undefined {
    const code = error.error?.code;
    if (error instanceof WhatsAppAuthorizationError || code === 190) {
        return 'The access token is invalid, expired, or lacks permission. Check CLOUD_API_ACCESS_TOKEN and its scopes (whatsapp_business_messaging, whatsapp_business_management).';
    }
    if (error instanceof WhatsAppThrottlingError) {
        return 'Rate limited by Meta. Wait before retrying.';
    }
    if (code === 131047) {
        return 'More than 24 hours since the user last messaged you. Send an approved template message instead.';
    }
    if (error instanceof WhatsAppSendMessageError) {
        return 'Meta rejected the message. See details for the reason.';
    }
    return undefined;
}

export function describeError(error: unknown): Record<string, unknown> {
    if (error instanceof WhatsAppApiError) {
        const meta = error.error;
        return {
            error: error.name,
            message: error.message,
            statusCode: error.statusCode,
            code: meta?.code,
            subcode: meta?.error_subcode,
            type: meta?.type,
            details: meta?.error_data?.details,
            fbtrace_id: meta?.fbtrace_id,
            hint: hintFor(error),
        };
    }
    if (error instanceof WhatsAppNetworkError) {
        return { error: error.name, message: error.message, hint: 'Could not reach graph.facebook.com.' };
    }
    // WhatsAppValidationError, other WhatsAppError subclasses, ConfigError, ToolInputError.
    if (error instanceof Error) {
        return { error: error.name || 'Error', message: error.message };
    }
    return { error: 'Error', message: String(error) };
}

function toText(value: unknown): string {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

export function successResult(data: unknown, secrets: string[] = []): CallToolResult {
    return { content: [{ type: 'text', text: redact(toText(data ?? { success: true }), secrets) }] };
}

export function errorResult(error: unknown, secrets: string[] = []): CallToolResult {
    const described = describeError(error);
    for (const key of Object.keys(described)) {
        if (described[key] === undefined) delete described[key];
    }
    return { content: [{ type: 'text', text: redact(toText(described), secrets) }], isError: true };
}
