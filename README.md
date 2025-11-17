# @portalsprotocol/mcp-server

> MCP server for Portals Protocol - Give your AI agent access to decentralized tools

Connect your AI agent (Claude, Cursor, etc.) to community-built APIs on Solana. Agents discover Portals on-chain, pay in USDC per use, and access tools autonomously—no API keys, no subscriptions, no human intervention.

**Live on devnet** • [Browse Portals](https://portalsprotocol.com/browse) • [Docs](https://portalsprotocol.com/docs)

## Quick Start

Add to your MCP config (Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "portals": {
      "command": "npx",
      "args": ["-y", "@portalsprotocol/mcp-server"],
      "env": {
        "PORTALS_NETWORK": "devnet",
        "PORTALS_WHITELIST": "PORTAL_ID_1,PORTAL_ID_2"
      }
    }
  }
}
```

Browse available Portals: https://portalsprotocol.com/browse

## What Your Agent Can Do

**Example Portals (built by the community):**
- Social media APIs (search, post, analyze)
- Image generation (various models and styles)
- Data analytics (charts, insights, reports)
- Web scraping (extract, parse, structure)

Each Portal is a product with multiple related tools. Agents pay per use in USDC. No subscriptions. No accounts.

## How It Works

1. **First run:** Auto-creates wallet at `~/.portals/wallet.json`
2. **Fund wallet:** Send SOL (gas) + USDC (payments) to displayed address
3. **Whitelist Portals:** Add Portal IDs you want to use
4. **Agent takes over:** Discovers tools, pays autonomously, executes

Zero human interaction after setup.

## Configuration

### Required

**`PORTALS_WHITELIST`** - Comma-separated Portal IDs to enable:
```json
"PORTALS_WHITELIST": "ABC123...,DEF456..."
```

Find Portal IDs: https://portalsprotocol.com/browse

### Optional

**`PORTALS_NETWORK`** - Chain to use (default: `devnet`)
```json
"PORTALS_NETWORK": "devnet"
```

**`PORTALS_RPC`** - Custom RPC endpoint (default: public Solana RPC)
```json
"PORTALS_RPC": "https://your-rpc.example.com"
```

## First Run

On first execution, the server:
1. Creates `~/.portals/` directory
2. Generates new wallet → `~/.portals/wallet.json`
3. Shows wallet address and balances
4. Displays funding instructions if needed

**Example output:**
```
New wallet created: 7xK9...Abc
Wallet saved to: /Users/you/.portals/wallet.json

💰 Wallet Balance:
  SOL: 0
  USDC: 0

⚠️  WARNING: No SOL for gas fees!
Send SOL to: 7xK9...Abc
Get devnet SOL: https://faucet.solana.com

⚠️  WARNING: No USDC for payments!
Send USDC to: 7xK9...Abc
Portal calls will fail until funded.
```

## Features

- **Auto-wallet management** - Creates and loads wallet automatically
- **Multi-tool support** - Each Portal can expose multiple tools
- **Payment verification** - Checks on-chain registry before agent pays
- **Error-driven UX** - Clear balance warnings and funding instructions
- **Schema caching** - Fetches OpenAPI schemas from Portals
- **Input validation** - Validates parameters against Portal schemas

## Security

- **Whitelist-only** - Agent can only use Portals you explicitly enable
- **Payment verification** - Checks payment addresses on-chain before sending USDC
- **Local wallet** - Private key stored locally at `~/.portals/wallet.json` (mode 0600)
- **Open source** - Full TypeScript source included for audit

## Transparency

This package includes full TypeScript source code for complete transparency. Review before connecting your AI agent.

- **Source**: [github.com/portalsprotocol/mcp-server](https://github.com/portalsprotocol/mcp-server)
- **License**: MIT
- **Client SDK**: [@portalsprotocol/client](https://www.npmjs.com/package/@portalsprotocol/client)

## Links

- **Website**: https://portalsprotocol.com
- **Browse Portals**: https://portalsprotocol.com/browse
- **Documentation**: https://portalsprotocol.com/docs
- **Issues**: https://github.com/portalsprotocol/mcp-server/issues

## License

MIT © Portals Protocol
