import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getClient } from '../client.js';
import { formatError } from '../utils/errors.js';
import { formatSuccess } from '../utils/response.js';

export function registerMediaTools(server: McpServer) {
    server.tool(
        'get_media_info',
        'Get metadata for a media object by ID — returns URL, MIME type, file size, and SHA-256 hash',
        {
            media_id: z.string().describe('The media ID to retrieve info for'),
        },
        async ({ media_id }) => {
            try {
                const result = await getClient().media.getMediaById(media_id);
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'upload_media',
        'Upload a media file to WhatsApp. Returns a media ID that can be used in messages. Supported: image (5MB), video (16MB), audio (16MB), document (100MB), sticker (500KB).',
        {
            file_path: z
                .string()
                .describe('Absolute path to the file to upload'),
            mime_type: z
                .string()
                .describe(
                    'MIME type of the file (e.g. "image/jpeg", "video/mp4", "application/pdf", "audio/ogg")',
                ),
            file_name: z.string().describe('File name with extension (e.g. "photo.jpg")'),
        },
        async ({ file_path, mime_type, file_name }) => {
            try {
                const fs = await import('node:fs');
                const buffer = fs.readFileSync(file_path);
                const file = new File([buffer], file_name, { type: mime_type });
                const result = await getClient().media.uploadMedia(file);
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'delete_media',
        'Delete a media file from WhatsApp servers by media ID',
        {
            media_id: z.string().describe('The media ID to delete'),
        },
        async ({ media_id }) => {
            try {
                const result = await getClient().media.deleteMedia(media_id);
                return formatSuccess(result);
            } catch (error) {
                return formatError(error);
            }
        },
    );

    server.tool(
        'download_media',
        'Download media content from a WhatsApp media URL. Use get_media_info first to obtain the URL.',
        {
            media_url: z
                .string()
                .describe('The media download URL (obtained from get_media_info)'),
            save_path: z
                .string()
                .describe('Absolute file path to save the downloaded media'),
        },
        async ({ media_url, save_path }) => {
            try {
                const blob = await getClient().media.downloadMedia(media_url);
                const fs = await import('node:fs');
                const buffer = Buffer.from(await blob.arrayBuffer());
                fs.writeFileSync(save_path, buffer);
                return formatSuccess({
                    success: true,
                    saved_to: save_path,
                    size_bytes: buffer.length,
                });
            } catch (error) {
                return formatError(error);
            }
        },
    );
}
