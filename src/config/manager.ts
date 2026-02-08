import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  configFileSchema,
  envSchema,
  type AppConfig,
  type ConfigFile,
  type EnvConfig,
} from './schema.js';

const CONFIG_DIR = join(homedir(), '.ai-automations');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

function loadConfigFile(): ConfigFile {
  if (!existsSync(CONFIG_FILE)) {
    return configFileSchema.parse({});
  }

  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    return configFileSchema.parse(JSON.parse(raw));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid config file at ${CONFIG_FILE}: ${msg}`);
  }
}

function loadEnvConfig(): EnvConfig {
  return envSchema.parse(process.env);
}

export function loadConfig(): AppConfig {
  const env = loadEnvConfig();
  const file = loadConfigFile();

  return {
    env,
    gitlab: {
      projectNames: file.gitlab.projectNames,
    },
    asana: {
      projectId: file.asana.projectId ?? '',
      workspaceGid: env.ASANA_WORKSPACE_GID ?? '',
      sectionMapping: file.asana.sectionMapping,
    },
  };
}

export function saveEnvFile(vars: Record<string, string>): void {
  const envFile = join(CONFIG_DIR, '.env');
  mkdirSync(CONFIG_DIR, { recursive: true });

  // Read existing env file if present
  let existing = '';
  if (existsSync(envFile)) {
    existing = readFileSync(envFile, 'utf-8');
  }

  // Parse existing vars
  const lines = existing.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const existingVars: Record<string, string> = {};
  for (const line of lines) {
    const eqIndex = line.indexOf('=');
    if (eqIndex > 0) {
      existingVars[line.slice(0, eqIndex)!.trim()] = line.slice(eqIndex + 1).trim();
    }
  }

  // Merge
  const merged = { ...existingVars, ...vars };

  const content = Object.entries(merged)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  writeFileSync(envFile, content + '\n');

  // Also set in current process so it's available immediately
  for (const [k, v] of Object.entries(vars)) {
    process.env[k] = v;
  }
}

export function saveConfigFile(updates: {
  gitlab?: { projectNames: string[] };
  asana?: { projectId: string };
}): void {
  const existing = loadConfigFile();

  if (updates.gitlab) {
    existing.gitlab.projectNames = updates.gitlab.projectNames;
  }
  if (updates.asana) {
    existing.asana.projectId = updates.asana.projectId;
  }

  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(existing, null, 2) + '\n');
}
