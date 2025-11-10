import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file in workspace root
// Try multiple possible locations
const possiblePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

let loaded = false;
for (const envPath of possiblePaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    loaded = true;
    break;
  }
}

if (!loaded) {
  console.warn('Warning: Could not load .env file from any expected location');
}

export interface LLMProxyConfig {
  llmApiKey: string;
  llmModel: string;
  llmTemperature: number;
  llmMaxOutputTokens: number;
  hmacSecret: string;
  port: number;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number for environment variable ${key}: ${value}`);
  }
  return parsed;
}

export function loadConfig(): LLMProxyConfig {
  return {
    llmApiKey: getEnvVar('AE_LLM_API_KEY'),
    llmModel: getEnvVar('AE_LLM_MODEL', 'gpt-4o-mini'),
    llmTemperature: getEnvNumber('AE_LLM_TEMPERATURE', 0.2),
    llmMaxOutputTokens: getEnvNumber('AE_LLM_MAX_OUTPUT_TOKENS', 800),
    hmacSecret: getEnvVar('AE_HMAC_SECRET'),
    port: getEnvNumber('LLM_PROXY_PORT', 8787),
  };
}
