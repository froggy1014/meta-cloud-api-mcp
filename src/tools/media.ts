// Docs: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media/
import { readFile, stat, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ToolContext } from '../context.js';
import { ToolInputError } from '../result.js';
import { DESTRUCTIVE, defineTool, READ_ONLY, WRITE } from './define.js';

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export function registerMediaTools(server: McpServer, ctx: ToolContext): void {
    defineTool(server, ctx, {
        name: 'upload_media',
        title: 'Upload media',
        description:
            'Upload a local file to WhatsApp and get a media ID for send_media_message. Limits: image 5MB, video/audio 16MB, document 100MB, sticker 500KB. Media IDs expire after 30 days.',
        input: {
            file_path: z.string().min(1).describe('Absolute path of the local file to upload'),
            mime_type: z
                .string()
                .regex(/^[\w.+-]+\/[\w.+-]+$/, 'Expected a MIME type such as image/jpeg')
                .describe('MIME type, e.g. "image/jpeg", "video/mp4", "application/pdf", "audio/ogg"'),
            file_name: z.string().min(1).optional().describe('File name to upload as (defaults to the path basename)'),
        },
        annotations: WRITE,
        run: async ({ file_path, mime_type, file_name }, c) => {
            const info = await stat(file_path).catch(() => {
                throw new ToolInputError(`File not found: ${file_path}`);
            });
            if (!info.isFile()) throw new ToolInputError(`Not a file: ${file_path}`);
            if (info.size > MAX_UPLOAD_BYTES) throw new ToolInputError('File is larger than the 100MB upload limit.');
            const buffer = await readFile(file_path);
            const file = new File([buffer], file_name ?? basename(file_path), { type: mime_type });
            return c.getClient().media.uploadMedia(file);
        },
    });

    defineTool(server, ctx, {
        name: 'get_media_url',
        title: 'Get media URL',
        description:
            'Get the short-lived download URL, MIME type, size and SHA-256 of a media ID (uploaded or received in a webhook). The URL needs the access token, so use download_media to fetch it.',
        input: {
            media_id: z.string().min(1).describe('Media ID'),
        },
        annotations: READ_ONLY,
        run: ({ media_id }, c) => c.getClient().media.getMediaById(media_id),
    });

    defineTool(server, ctx, {
        name: 'download_media',
        title: 'Download media',
        description: 'Download media from a URL returned by get_media_url and save it to a local file.',
        input: {
            media_url: z.url().describe('Download URL from get_media_url'),
            save_path: z.string().min(1).describe('Absolute path to write the file to'),
        },
        annotations: WRITE,
        run: async ({ media_url, save_path }, c) => {
            const blob = await c.getClient().media.downloadMedia(media_url);
            const buffer = Buffer.from(await blob.arrayBuffer());
            await writeFile(save_path, buffer);
            return { success: true, saved_to: save_path, size_bytes: buffer.length };
        },
    });

    defineTool(server, ctx, {
        name: 'delete_media',
        title: 'Delete media',
        description: 'Delete an uploaded media file from WhatsApp servers.',
        input: {
            media_id: z.string().min(1).describe('Media ID to delete'),
        },
        annotations: DESTRUCTIVE,
        run: ({ media_id }, c) => c.getClient().media.deleteMedia(media_id),
    });
}
