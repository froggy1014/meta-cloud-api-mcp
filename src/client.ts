import { WhatsApp } from 'meta-cloud-api';

let client: WhatsApp | null = null;

export function getClient(): WhatsApp {
    if (!client) {
        // Suppress stdout during SDK init — printLogo() and config table
        // would corrupt MCP stdio transport
        const origWrite = process.stdout.write.bind(process.stdout);
        process.stdout.write = (() => true) as typeof process.stdout.write;

        try {
            client = new WhatsApp({
                accessToken: process.env.CLOUD_API_ACCESS_TOKEN ?? '',
                phoneNumberId: Number(process.env.WA_PHONE_NUMBER_ID || 0),
                businessAcctId: process.env.WA_BUSINESS_ACCOUNT_ID ?? '',
            });
        } finally {
            process.stdout.write = origWrite;
        }
    }

    return client;
}

export function getWabaId(): string {
    return process.env.WA_BUSINESS_ACCOUNT_ID ?? '';
}
