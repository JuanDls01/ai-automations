#!/usr/bin/env node

import { config } from 'dotenv';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { cli } from './cli.js';

// Load env: ~/.ai-automations/.env first (lower priority), then CWD .env (higher priority)
config({ path: join(homedir(), '.ai-automations', '.env') });
config();

/**
 * Main entry point for the CLI
 */
async function main() {
  try {
    await cli(process.argv);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

main();
