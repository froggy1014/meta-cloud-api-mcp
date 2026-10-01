#!/usr/bin/env node

// stdout carries the MCP JSON-RPC stream. Anything else written there corrupts it,
// so route console output from dependencies to stderr before they load.
for (const method of ['log', 'info', 'debug'] as const) {
    console[method] = (...args: unknown[]) => console.error(...args);
}

// meta-cloud-api's debug logger prints request details and a token prefix when
// DEBUG=true. Never enable it inside the MCP server.
delete process.env.DEBUG;

const { main } = await import('./server.js');

main().catch((error: unknown) => {
    console.error('meta-cloud-api-mcp failed to start:', error instanceof Error ? error.message : error);
    process.exit(1);
});
