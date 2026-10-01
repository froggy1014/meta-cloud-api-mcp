import { WhatsApp } from 'meta-cloud-api';
import { assertClientConfig, ConfigError, ENV, readConfig, type ServerConfig } from './config.js';

/**
 * The subset of the SDK the tools depend on. Typed as the real SDK class so a
 * signature change in `meta-cloud-api` shows up as a type error here.
 */
export type WhatsAppClient = Pick<
    WhatsApp,
    'messages' | 'media' | 'templates' | 'businessProfile' | 'phoneNumbers' | 'waba' | 'registration' | 'flows'
>;

export interface ToolContext {
    getClient(): WhatsAppClient;
    getBusinessAccountId(): string;
    /** Values that must never appear in tool output (access token). */
    secrets(): string[];
}

/** Builds the SDK client lazily so the server can start (and list tools) without credentials. */
export function createContext(config: ServerConfig = readConfig()): ToolContext {
    let client: WhatsAppClient | undefined;

    return {
        getClient() {
            if (client) return client;
            assertClientConfig(config);

            // The SDK prints a banner via console.log on construction. stdout belongs to
            // the MCP transport, so silence it for the duration of the constructor.
            const originalLog = console.log;
            console.log = () => {};
            try {
                client = new WhatsApp({
                    accessToken: config.accessToken,
                    phoneNumberId: Number(config.phoneNumberId),
                    businessAcctId: config.businessAccountId,
                    ...(config.apiVersion && { apiVersion: config.apiVersion }),
                    debug: false,
                });
            } finally {
                console.log = originalLog;
            }
            return client;
        },
        getBusinessAccountId() {
            if (!config.businessAccountId) {
                throw new ConfigError(`This tool needs ${ENV.businessAccountId}. Set it in your MCP client config.`);
            }
            return config.businessAccountId;
        },
        secrets() {
            return config.accessToken ? [config.accessToken] : [];
        },
    };
}
