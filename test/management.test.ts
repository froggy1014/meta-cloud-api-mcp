import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { connect } from './harness.js';

let session: Awaited<ReturnType<typeof connect>>;
afterEach(() => session?.close());

describe('template tools', () => {
    it('list_templates passes only provided filters', async () => {
        session = await connect();
        await session.call('list_templates', { status: 'APPROVED', limit: 5 });
        expect(session.sdk.templates.getTemplates).toHaveBeenCalledWith({ status: 'APPROVED', limit: 5 });
    });

    it('list_templates needs WA_BUSINESS_ACCOUNT_ID', async () => {
        session = await connect({ businessAccountId: null });
        const { isError, text } = await session.call('list_templates');
        expect(isError).toBe(true);
        expect(JSON.parse(text)).toMatchObject({ error: 'ConfigError' });
        expect(text).toContain('WA_BUSINESS_ACCOUNT_ID');
        expect(session.sdk.templates.getTemplates).not.toHaveBeenCalled();
    });

    it('get_template fetches by ID', async () => {
        session = await connect();
        await session.call('get_template', { template_id: '987' });
        expect(session.sdk.templates.getTemplate).toHaveBeenCalledWith('987');
    });

    it('create_template forwards the definition', async () => {
        session = await connect();
        const components = [{ type: 'BODY', text: 'Hi {{1}}' }];
        await session.call('create_template', {
            name: 'welcome_v2',
            language: 'en_US',
            category: 'UTILITY',
            components,
        });
        expect(session.sdk.templates.createTemplate).toHaveBeenCalledWith({
            name: 'welcome_v2',
            language: 'en_US',
            category: 'UTILITY',
            components,
        });
    });

    it('create_template rejects names Meta would reject', async () => {
        session = await connect();
        const { isError } = await session.call('create_template', {
            name: 'Welcome Message',
            language: 'en_US',
            category: 'UTILITY',
            components: [],
        });
        expect(isError).toBe(true);
        expect(session.sdk.templates.createTemplate).not.toHaveBeenCalled();
    });

    it('delete_template omits hsm_id when not given', async () => {
        session = await connect();
        await session.call('delete_template', { name: 'old' });
        expect(session.sdk.templates.deleteTemplate).toHaveBeenCalledWith({ name: 'old' });
    });
});

describe('media tools', () => {
    let dir: string | undefined;
    afterEach(async () => {
        if (dir) await rm(dir, { recursive: true, force: true });
        dir = undefined;
    });

    it('upload_media reads the file and passes a File to the SDK', async () => {
        session = await connect();
        dir = await mkdtemp(join(tmpdir(), 'mcp-media-'));
        const path = join(dir, 'photo.png');
        await writeFile(path, Buffer.from([137, 80, 78, 71]));

        const { isError, text } = await session.call('upload_media', { file_path: path, mime_type: 'image/png' });
        expect(isError).toBe(false);
        expect(JSON.parse(text)).toEqual({ id: 'media-1' });
        const file = session.sdk.media.uploadMedia.mock.calls[0]?.[0] as File;
        expect(file).toBeInstanceOf(File);
        expect(file.name).toBe('photo.png');
        expect(file.type).toBe('image/png');
        expect(file.size).toBe(4);
    });

    it('upload_media reports a missing file', async () => {
        session = await connect();
        const { isError, text } = await session.call('upload_media', {
            file_path: '/definitely/not/here.png',
            mime_type: 'image/png',
        });
        expect(isError).toBe(true);
        expect(text).toContain('File not found');
        expect(session.sdk.media.uploadMedia).not.toHaveBeenCalled();
    });

    it('get_media_url calls getMediaById', async () => {
        session = await connect();
        await session.call('get_media_url', { media_id: 'm1' });
        expect(session.sdk.media.getMediaById).toHaveBeenCalledWith('m1');
    });

    it('download_media writes the blob to disk', async () => {
        session = await connect();
        dir = await mkdtemp(join(tmpdir(), 'mcp-media-'));
        const path = join(dir, 'out.bin');
        const { text } = await session.call('download_media', {
            media_url: 'https://lookaside.fbsbx.com/x',
            save_path: path,
        });
        expect(JSON.parse(text)).toMatchObject({ success: true, size_bytes: 3 });
        expect([...(await readFile(path))]).toEqual([1, 2, 3]);
    });
});

describe('profile and phone number tools', () => {
    it('get_business_profile requests all fields by default', async () => {
        session = await connect();
        await session.call('get_business_profile');
        const fields = session.sdk.businessProfile.getBusinessProfile.mock.calls[0]?.[0];
        expect(fields).toEqual(expect.arrayContaining(['about', 'description', 'email', 'websites', 'vertical']));
    });

    it('get_business_profile passes requested fields', async () => {
        session = await connect();
        await session.call('get_business_profile', { fields: ['about'] });
        expect(session.sdk.businessProfile.getBusinessProfile).toHaveBeenCalledWith(['about']);
    });

    it('update_business_profile sends messaging_product and only given fields', async () => {
        session = await connect();
        await session.call('update_business_profile', { about: 'We sell shoes' });
        expect(session.sdk.businessProfile.updateBusinessProfile).toHaveBeenCalledWith({
            messaging_product: 'whatsapp',
            about: 'We sell shoes',
        });
    });

    it('list_phone_numbers lists numbers in the WABA', async () => {
        session = await connect();
        await session.call('list_phone_numbers', { fields: ['display_phone_number', 'quality_rating'], limit: 10 });
        expect(session.sdk.phoneNumbers.getPhoneNumbers).toHaveBeenCalledWith({
            fields: ['display_phone_number', 'quality_rating'],
            limit: 10,
        });
    });

    it('get_phone_number fetches the configured number', async () => {
        session = await connect();
        await session.call('get_phone_number');
        expect(session.sdk.phoneNumbers.getPhoneNumberById).toHaveBeenCalledWith(undefined);
    });
});

describe('waba, registration and flow tools', () => {
    it('subscribe_waba_webhook requires verify_token with an override URL', async () => {
        session = await connect();
        const { isError } = await session.call('subscribe_waba_webhook', {
            override_callback_uri: 'https://example.com/hook',
        });
        expect(isError).toBe(true);
        expect(session.sdk.waba.updateWabaSubscription).not.toHaveBeenCalled();

        await session.call('subscribe_waba_webhook', {});
        expect(session.sdk.waba.updateWabaSubscription).toHaveBeenCalledWith({});
    });

    it('register_phone passes the PIN and region', async () => {
        session = await connect();
        await session.call('register_phone', { pin: '123456', data_localization_region: 'KR' });
        expect(session.sdk.registration.register).toHaveBeenCalledWith('123456', 'KR');
    });

    it('list_flows defaults to the configured WABA', async () => {
        session = await connect();
        await session.call('list_flows');
        expect(session.sdk.flows.listFlows).toHaveBeenCalledWith('1029384756');
    });

    it('update_flow_json parses string JSON and reports bad JSON', async () => {
        session = await connect();
        await session.call('update_flow_json', { flow_id: 'f1', flow_json: '{"version":"7.0"}' });
        expect(session.sdk.flows.updateFlowJson).toHaveBeenCalledWith('f1', { file: { version: '7.0' } });

        const { isError, text } = await session.call('update_flow_json', { flow_id: 'f1', flow_json: '{nope' });
        expect(isError).toBe(true);
        expect(text).toContain('not valid JSON');
    });
});
