export const ENV = {
    accessToken: 'CLOUD_API_ACCESS_TOKEN',
    phoneNumberId: 'WA_PHONE_NUMBER_ID',
    businessAccountId: 'WA_BUSINESS_ACCOUNT_ID',
    apiVersion: 'CLOUD_API_VERSION',
} as const;

/**
 * Thrown when a required environment variable is missing or malformed.
 * Messages only ever name the variable, never its value.
 */
export class ConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConfigError';
    }
}

export interface ServerConfig {
    accessToken?: string;
    phoneNumberId?: string;
    businessAccountId?: string;
    apiVersion?: string;
}

function clean(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
    return {
        accessToken: clean(env[ENV.accessToken]),
        phoneNumberId: clean(env[ENV.phoneNumberId]),
        businessAccountId: clean(env[ENV.businessAccountId]),
        apiVersion: clean(env[ENV.apiVersion]),
    };
}

/** Throws a ConfigError naming every variable that is missing for client creation. */
export function assertClientConfig(config: ServerConfig): asserts config is ServerConfig & {
    accessToken: string;
    phoneNumberId: string;
} {
    const missing: string[] = [];
    if (!config.accessToken) missing.push(ENV.accessToken);
    if (!config.phoneNumberId) missing.push(ENV.phoneNumberId);
    if (missing.length > 0) {
        throw new ConfigError(
            `Missing required environment variable(s): ${missing.join(', ')}. ` +
                'Set them in your MCP client config (see README).',
        );
    }
    if (!/^\d+$/.test(config.phoneNumberId as string)) {
        throw new ConfigError(`${ENV.phoneNumberId} must be a numeric phone number ID.`);
    }
}
