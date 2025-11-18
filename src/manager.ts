import { PublicKey, Keypair } from '@solana/web3.js';
import { PortalsClient, NetworkCluster, RPC_ENDPOINTS } from '@portalsprotocol/client';
import axios from 'axios';
import Ajv from 'ajv';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const PORTALS_DIR = path.join(os.homedir(), '.portals');
const WALLET_PATH = path.join(PORTALS_DIR, 'wallet.json');

const NETWORK = (process.env.PORTALS_NETWORK || 'mainnet-beta') as NetworkCluster;

interface PortalMetadata {
  id: string;
  title: string;
  description: string;
  url: string;
  paymentVault: string;
  tools?: Array<{
    name: string;
    description: string;
    parameters: any;
  }>;
}

export class PortalsManager {
  private client!: PortalsClient;
  private portals: Map<string, PortalMetadata> = new Map();
  private ajv = new Ajv({ allErrors: true });

  async initialize() {
    if (!fs.existsSync(PORTALS_DIR)) {
      fs.mkdirSync(PORTALS_DIR, { recursive: true });
    }

    if (fs.existsSync(WALLET_PATH)) {
      try {
        this.client = PortalsClient.fromFile({
          walletPath: WALLET_PATH,
          network: NETWORK,
          rpcUrl: process.env.PORTALS_RPC || RPC_ENDPOINTS[NETWORK],
        });
        console.error(`Wallet loaded: ${this.client.getAddress().toBase58()}`);
      } catch (error) {
        throw new Error(
          `Failed to load wallet from ${WALLET_PATH}. ` +
          `File may be corrupted. Delete it manually to create a new wallet. ` +
          `ERROR: ${error}`
        );
      }
    } else {
      this.client = PortalsClient.createNew({
        walletPath: WALLET_PATH,
        network: NETWORK,
        rpcUrl: process.env.PORTALS_RPC,
      });
      console.error(`New wallet created: ${this.client.getAddress().toBase58()}`);
      console.error(`Wallet saved to: ${WALLET_PATH}`);
    }

    const balance = await this.client.getBalance();
    console.error(`\n💰 Wallet Balance:`);
    console.error(`  SOL: ${balance.sol}`);
    console.error(`  USDC: ${balance.usdc}`);
    
    if (balance.sol === 0) {
      console.error(`\n⚠️  WARNING: No SOL for gas fees!`);
      console.error(`Send SOL to: ${this.client.getAddress().toBase58()}`);
      console.error(`Get devnet SOL: https://faucet.solana.com`);
    }
    
    if (balance.usdc === 0) {
      console.error(`\n⚠️  WARNING: No USDC for payments!`);
      console.error(`Send USDC to: ${this.client.getAddress().toBase58()}`);
      console.error(`Portal calls will fail until funded.`);
    }

    await this.refreshPortals();
  }

  async refreshPortals() {
    const whitelist = process.env.PORTALS_WHITELIST?.split(',').filter(Boolean) || [];
    
    if (whitelist.length === 0) {
      throw new Error(
        'PORTALS_WHITELIST required in MCP config.\n' +
        'Browse available Portals: https://portalsprotocol.com/browse\n' +
        'Add Portal IDs to your config env.PORTALS_WHITELIST'
      );
    }

    const newPortals = new Map<string, PortalMetadata>();
    
    for (const id of whitelist) {
      try {
        const api = await this.client.getAPI(id);
        
        const metadata: PortalMetadata = {
          id: api.publicKey.toString(),
          title: api.title,
          description: api.description,
          url: api.url,
          paymentVault: api.paymentVault.toString(),
        };

        try {
          const schemaUrl = metadata.url.endsWith('/') 
            ? `${metadata.url}openapi.json`
            : `${metadata.url}/openapi.json`;
          const schemaRes = await axios.get(schemaUrl, { timeout: 5000 });
          const openapi = schemaRes.data;
          
          const paths = openapi.paths || {};
          const tools: Array<{ name: string; description: string; parameters: any }> = [];
          
          for (const [pathKey, pathValue] of Object.entries(paths)) {
            for (const [method, operation] of Object.entries(pathValue as any)) {
              const op = operation as any;
              if (method === 'parameters' || !op.operationId) continue;
              
              tools.push({
                name: op.operationId,
                description: op.summary || op.description || metadata.description,
                parameters: op.requestBody?.content?.['application/json']?.schema || { type: 'object', properties: {} },
              });
            }
          }
          
          if (tools.length > 0) {
            metadata.tools = tools;
          }
        } catch (error) {
          console.error(`Failed to fetch schema for ${metadata.title}:`, error);
        }
        
        newPortals.set(id, metadata);
      } catch (error) {
        console.error(`Failed to load Portal ${id}:`, error);
      }
    }

    this.portals = newPortals;
  }

  async getTools() {
    const tools: any[] = [];

    for (const [id, portal] of this.portals) {
      if (portal.tools && portal.tools.length > 0) {
        for (const tool of portal.tools) {
          tools.push({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.parameters,
          });
        }
      } else {
        const toolName = this.generateToolName(portal.title, id);
      tools.push({
        name: toolName,
          description: portal.description,
          inputSchema: { type: 'object', properties: {} },
      });
      }
    }

    return tools;
  }

  async callTool(name: string, args: any) {
    await this.refreshPortals();
    
    const result = this.findPortalAndToolByName(name);
    if (!result) {
      throw new Error(`Portal not found for tool: ${name}`);
    }

    const { portal, tool } = result;

    if (tool?.parameters) {
      const validate = this.ajv.compile(tool.parameters);
      if (!validate(args)) {
        throw new Error(`Invalid parameters: ${JSON.stringify(validate.errors)}`);
      }
    }

    try {
      return await this.client.callAPI(portal.id, args, tool?.name);
    } catch (error: any) {
      const errorMsg = error.message || error.toString() || 'Unknown error';
      
      if (errorMsg.includes('Insufficient SOL')) {
        const walletAddress = this.client.getAddress().toBase58();
        throw new Error(
          `❌ Insufficient SOL for gas fees\n\n` +
          `Send SOL to: ${walletAddress}\n` +
          `After funding, retry this request.`
        );
      }
      
      if (errorMsg.includes('Insufficient USDC') || errorMsg.includes('InsufficientUsdcBalance')) {
        const walletAddress = this.client.getAddress().toBase58();
        throw new Error(
          `❌ Insufficient USDC balance\n\n` +
          `Send USDC to: ${walletAddress}\n` +
          `After funding, retry this request.`
        );
      }
      
      throw new Error(`Portal call failed: ${errorMsg}`);
    }
  }

  private generateToolName(title: string, id: string): string {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const suffix = id.slice(0, 4);
    return `portal_${slug}_${suffix}`;
  }

  private findPortalAndToolByName(name: string): { portal: PortalMetadata; tool?: { name: string; description: string; parameters: any } } | undefined {
    for (const [id, portal] of this.portals) {
      if (portal.tools && portal.tools.length > 0) {
        const tool = portal.tools.find(t => t.name === name);
        if (tool) {
          return { portal, tool };
        }
      } else {
        const toolName = this.generateToolName(portal.title, id);
      if (toolName === name) {
          return { portal };
        }
      }
    }
    return undefined;
  }
}
