<p align="center">
  <img src="assets/README.svg" alt="Meta Cloud API" width="400">
</p>

<h1 align="center">Meta Cloud API MCP Server</h1>

<p align="center">
  A Model Context Protocol (MCP) server that lets Claude manage WhatsApp templates, flows, and send messages through the WhatsApp Cloud API.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/meta-cloud-api-mcp"><img src="https://img.shields.io/npm/v/meta-cloud-api-mcp.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/meta-cloud-api"><img src="https://img.shields.io/badge/SDK-meta--cloud--api-blue" alt="SDK"></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-compatible-brightgreen" alt="MCP Compatible"></a>
  <a href="https://github.com/froggy1014/meta-cloud-api-mcp/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

---

## What is this?

This MCP server wraps the [meta-cloud-api](https://github.com/froggy1014/meta-cloud-api) SDK, giving Claude (and other MCP-compatible clients) direct access to the WhatsApp Business Platform. You can ask Claude to:

- **"Create a welcome template in Korean and English"**
- **"List all my flows and publish the draft one"**
- **"Send a template message to +82-10-1234-5678"**
- **"Update my business profile description"**

## Quick Start

### 1. Install

```bash
npm install -g meta-cloud-api-mcp
```

### 2. Get Your Credentials

You need three values from the [Meta Developer Portal](https://developers.facebook.com/):

| Variable | Where to find it |
|----------|-----------------|
| `CLOUD_API_ACCESS_TOKEN` | App Dashboard > WhatsApp > API Setup |
| `WA_PHONE_NUMBER_ID` | App Dashboard > WhatsApp > API Setup > Phone number ID |
| `WA_BUSINESS_ACCOUNT_ID` | App Dashboard > WhatsApp > API Setup > WhatsApp Business Account ID |

### 3. Configure Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "whatsapp": {
      "command": "npx",
      "args": ["-y", "meta-cloud-api-mcp"],
      "env": {
        "CLOUD_API_ACCESS_TOKEN": "your_access_token",
        "WA_PHONE_NUMBER_ID": "your_phone_number_id",
        "WA_BUSINESS_ACCOUNT_ID": "your_business_account_id"
      }
    }
  }
}
```

### 4. Configure Claude Code

```bash
claude mcp add whatsapp -- npx -y meta-cloud-api-mcp

# Then set environment variables in your .claude/settings.json
```

## Available Tools (31)

### Templates (5 tools)

| Tool | Description |
|------|-------------|
| `list_templates` | List templates with filters (name, status, category, language) |
| `get_template` | Get a single template by ID with full component definition |
| `create_template` | Create a new message template (MARKETING, UTILITY, AUTHENTICATION) |
| `update_template` | Update template components (resubmits for review) |
| `delete_template` | Delete a template by name or specific language version |

### Flows (8 tools)

| Tool | Description |
|------|-------------|
| `list_flows` | List all flows for your WhatsApp Business Account |
| `get_flow` | Get flow details including status and validation errors |
| `create_flow` | Create a new flow (optionally with inline JSON or clone) |
| `update_flow_metadata` | Update flow name, categories, or endpoint URI |
| `update_flow_json` | Upload or update the flow JSON definition |
| `delete_flow` | Delete a draft flow |
| `publish_flow` | Publish a draft flow (makes it live) |
| `deprecate_flow` | Deprecate a published flow (irreversible) |

### Messages (3 tools)

| Tool | Description |
|------|-------------|
| `send_text_message` | Send a text message to a phone number |
| `send_template_message` | Send a pre-approved template message |
| `send_image_message` | Send an image (by media ID or public URL) |

### Media (4 tools)

| Tool | Description |
|------|-------------|
| `get_media_info` | Get media metadata (URL, MIME type, size, hash) |
| `upload_media` | Upload a file to WhatsApp (returns media ID) |
| `delete_media` | Delete media from WhatsApp servers |
| `download_media` | Download media content to a local file |

### Business Profile (2 tools)

| Tool | Description |
|------|-------------|
| `get_business_profile` | Get profile (about, address, email, websites, etc.) |
| `update_business_profile` | Update profile fields |

### WABA (3 tools)

| Tool | Description |
|------|-------------|
| `get_waba_account` | Get account info (status, health, verification, limits) |
| `subscribe_waba_webhook` | Subscribe to WABA webhooks with optional callback override |
| `unsubscribe_waba_webhook` | Unsubscribe from WABA webhooks |

### Phone Numbers (4 tools)

| Tool | Description |
|------|-------------|
| `get_phone_number` | Get phone number info (display number, quality, status) |
| `list_phone_numbers` | List all phone numbers in the WABA |
| `request_verification_code` | Request verification code via SMS or voice |
| `verify_phone_code` | Verify phone number with received code |

### Registration (2 tools)

| Tool | Description |
|------|-------------|
| `register_phone` | Register a phone number with a 6-digit PIN |
| `deregister_phone` | Deregister a phone number |

## Example Conversations

**Managing Templates:**
> "List all my approved marketing templates"
>
> "Create a template called `order_update` in Korean with a body that says '주문이 확인되었습니다. 주문번호: {{1}}'"
>
> "Delete the `old_promo` template"

**Managing Flows:**
> "Show me all my flows and their statuses"
>
> "Create a new customer support flow called `support_v2`"
>
> "Update the flow JSON for flow ID 12345 with this definition: { ... }"
>
> "Publish flow 12345"

**Sending Messages:**
> "Send 'Hello!' to +821012345678"
>
> "Send the `hello_world` template in English to +821012345678"

## Development

```bash
git clone https://github.com/froggy1014/meta-cloud-api-mcp.git
cd meta-cloud-api-mcp
npm install
npm run build
```

### Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Set environment variables in the Inspector UI, then browse and test all 31 tools interactively.

## Requirements

- **Node.js** 18 or later
- **Meta Developer Account** with WhatsApp Business API access
- **MCP-compatible client** (Claude Desktop, Claude Code, etc.)

## Related

- [meta-cloud-api](https://github.com/froggy1014/meta-cloud-api) — The TypeScript SDK this server wraps
- [meta-cloud-api docs](https://www.meta-cloud-api.xyz/) — SDK documentation
- [Model Context Protocol](https://modelcontextprotocol.io) — MCP specification
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) — Official Meta documentation

## License

MIT - see [LICENSE](LICENSE) for details.
