<p align="center">
  <img src="assets/README.svg" alt="Meta Cloud API" width="400">
</p>

<h1 align="center">Meta Cloud API MCP Server</h1>

<p align="center">
  A Model Context Protocol (MCP) server that lets Claude, Cursor and other MCP clients send WhatsApp messages and manage templates, media, flows and the business profile through the WhatsApp Cloud API.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/meta-cloud-api-mcp"><img src="https://img.shields.io/npm/v/meta-cloud-api-mcp.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/meta-cloud-api"><img src="https://img.shields.io/badge/SDK-meta--cloud--api-blue" alt="SDK"></a>
  <a href="https://github.com/froggy1014/meta-cloud-api-mcp/actions/workflows/ci.yml"><img src="https://github.com/froggy1014/meta-cloud-api-mcp/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-compatible-brightgreen" alt="MCP Compatible"></a>
  <a href="https://github.com/froggy1014/meta-cloud-api-mcp/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

---

## What is this?

This server wraps the [meta-cloud-api](https://github.com/froggy1014/meta-cloud-api) SDK (v3.8+) and exposes it as MCP tools over stdio. Once connected you can ask your assistant things like:

- "Send the `order_update` template in English to +1 415 555 2671 with order number 4821"
- "Send a message to +14155552671 with Yes / No buttons asking to confirm tomorrow's appointment"
- "Upload `~/Desktop/menu.pdf` and send it as a document"
- "List my approved marketing templates"
- "What is the quality rating of our phone number?"

## Requirements

- Node.js 20.12 or later
- A Meta app with the WhatsApp product, and a WhatsApp Business Account
- An MCP client (Claude Desktop, Claude Code, Cursor, ...)

## Environment variables

| Variable | Required | Where to find it |
|----------|----------|------------------|
| `CLOUD_API_ACCESS_TOKEN` | yes | App Dashboard > WhatsApp > API Setup (use a System User token for anything long-lived) |
| `WA_PHONE_NUMBER_ID` | yes | App Dashboard > WhatsApp > API Setup > Phone number ID |
| `WA_BUSINESS_ACCOUNT_ID` | for template, phone-number list, WABA and flow tools | App Dashboard > WhatsApp > API Setup > WhatsApp Business Account ID |
| `CLOUD_API_VERSION` | no | Graph API version, e.g. `v23.0` (defaults to the SDK's version) |

The server starts without credentials so clients can list its tools; a tool call then returns a `ConfigError` naming the missing variable. The access token is never logged, and is redacted from tool output (Meta sometimes echoes it back in error messages). `DEBUG` is ignored on purpose, because the SDK's debug logger prints part of the token.

## Install

There is nothing to install globally: MCP clients run the server with `npx`.

```bash
npx -y meta-cloud-api-mcp   # speaks MCP on stdin/stdout; normally launched by your client
```

### Claude Code

```bash
claude mcp add whatsapp \
  -e CLOUD_API_ACCESS_TOKEN=your_access_token \
  -e WA_PHONE_NUMBER_ID=your_phone_number_id \
  -e WA_BUSINESS_ACCOUNT_ID=your_waba_id \
  -- npx -y meta-cloud-api-mcp
```

Add `--scope user` to make it available in every project, or `--scope project` to write a shareable `.mcp.json` (keep real tokens out of version control). Check it with `claude mcp list` or `/mcp` inside Claude Code.

### Claude Desktop

Settings > Developer > Edit Config, then add to `claude_desktop_config.json` and restart Claude Desktop:

```json
{
  "mcpServers": {
    "whatsapp": {
      "command": "npx",
      "args": ["-y", "meta-cloud-api-mcp"],
      "env": {
        "CLOUD_API_ACCESS_TOKEN": "your_access_token",
        "WA_PHONE_NUMBER_ID": "your_phone_number_id",
        "WA_BUSINESS_ACCOUNT_ID": "your_waba_id"
      }
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project):

```json
{
  "mcpServers": {
    "whatsapp": {
      "command": "npx",
      "args": ["-y", "meta-cloud-api-mcp"],
      "env": {
        "CLOUD_API_ACCESS_TOKEN": "your_access_token",
        "WA_PHONE_NUMBER_ID": "your_phone_number_id",
        "WA_BUSINESS_ACCOUNT_ID": "your_waba_id"
      }
    }
  }
}
```

Any other stdio MCP client works the same way: command `npx`, args `["-y", "meta-cloud-api-mcp"]`, plus the env vars above.

## Tools (34)

Every tool validates its input with zod before calling Meta, and is annotated as read-only, write or destructive so clients can ask for confirmation. Failures come back as `isError` results with the SDK error class (`WhatsAppAuthorizationError`, `WhatsAppSendMessageError`, `WhatsAppThrottlingError`, ...), Meta's error code, `fbtrace_id`, and a hint for common cases such as an expired token or the 24-hour window.

### Messages

Free-form messages only reach users who wrote to you in the last 24 hours. Outside that window, send a template.

| Tool | Description |
|------|-------------|
| `send_text_message` | Send a text message (optional link preview, optional quoted reply) |
| `send_template_message` | Send an approved template with variable components |
| `send_media_message` | Send an image, video, audio, document or sticker by `media_id` or public `link` |
| `send_interactive_buttons` | Send up to 3 quick-reply buttons with optional header and footer |
| `send_interactive_list` | Send a list menu (up to 10 rows across sections) |
| `mark_as_read` | Mark an incoming message as read, optionally with a typing indicator |

### Templates

| Tool | Description |
|------|-------------|
| `list_templates` | List templates, filtered by name, status, category or language |
| `get_template` | Get one template with its components |
| `create_template` | Create a template and submit it for review |
| `update_template` | Edit components or category (re-submits for review) |
| `delete_template` | Delete a template, or one language version via `hsm_id` |

### Media

| Tool | Description |
|------|-------------|
| `upload_media` | Upload a local file and get a media ID |
| `get_media_url` | Get the download URL, MIME type, size and hash of a media ID |
| `download_media` | Download media from that URL to a local file |
| `delete_media` | Delete uploaded media |

### Business profile and phone numbers

| Tool | Description |
|------|-------------|
| `get_business_profile` | Get about, address, description, email, websites, vertical, picture |
| `update_business_profile` | Update any of those fields |
| `list_phone_numbers` | List phone numbers in the WABA |
| `get_phone_number` | Get details of the configured sender number |
| `request_verification_code` | Request a verification code by SMS or voice |
| `verify_phone_code` | Verify the number with the received code |
| `register_phone` | Register the number with a 6-digit PIN |
| `deregister_phone` | Deregister the number |

### WhatsApp Business Account

| Tool | Description |
|------|-------------|
| `get_waba_account` | Get account status, review and verification status, limits |
| `subscribe_waba_webhook` | Subscribe your app to WABA webhooks (optional callback override) |
| `unsubscribe_waba_webhook` | Unsubscribe your app |

### Flows

| Tool | Description |
|------|-------------|
| `list_flows` | List Flows |
| `get_flow` | Get a Flow with status and validation errors |
| `create_flow` | Create a Flow (inline JSON or clone) |
| `update_flow_metadata` | Rename, recategorize or change the endpoint |
| `update_flow_json` | Upload a new Flow JSON |
| `publish_flow` | Publish a draft Flow |
| `deprecate_flow` | Deprecate a published Flow |
| `delete_flow` | Delete a draft Flow |

### Upgrading from 1.x

- `send_image_message` was replaced by `send_media_message` (`type: "image"`).
- `get_media_info` was renamed to `get_media_url`.
- Node.js 20.12+ is required (inherited from meta-cloud-api 3.x).

## Development

```bash
git clone https://github.com/froggy1014/meta-cloud-api-mcp.git
cd meta-cloud-api-mcp
npm install
npm run typecheck
npm test        # vitest, with the SDK mocked
npm run build
```

Try it interactively with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Related

- [meta-cloud-api](https://github.com/froggy1014/meta-cloud-api): the TypeScript SDK this server wraps
- [Model Context Protocol](https://modelcontextprotocol.io)
- [WhatsApp Cloud API docs](https://developers.facebook.com/documentation/business-messaging/whatsapp/overview/)

## License

MIT, see [LICENSE](LICENSE).
