import dotenv from 'dotenv';

dotenv.config();

export interface EngineConfig {
  port: number;
  hmacSecret: string;
  llmProxyUrl: string;
  dataDir: string;
}

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config: EngineConfig = {
  port: parseInt(process.env.PORT || '8786', 10),
  hmacSecret: getEnvVar('AE_HMAC_SECRET'),
  llmProxyUrl: getEnvVar('LLM_PROXY_URL', 'http://llm-proxy:8787'),
  dataDir: process.env.DATA_DIR || './data',
};
