export function formatError(error: unknown) {
    let message: string;

    if (error instanceof Error) {
        message = error.message;

        if ('statusCode' in error && typeof (error as any).statusCode === 'number') {
            message = JSON.stringify(
                {
                    error: error.message,
                    statusCode: (error as any).statusCode,
                    details: (error as any).details ?? undefined,
                },
                null,
                2,
            );
        }
    } else {
        message = String(error);
    }

    return {
        content: [{ type: 'text' as const, text: message }],
        isError: true as const,
    };
}
