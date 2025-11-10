import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface Config {
  engineUrl: string;
  port: number;
}

export function loadConfig(): Config {
  const engineUrl = process.env.ENGINE_URL || 'http://engine:8786';
  const port = parseInt(process.env.GMOD_SIDECAR_PORT || '8788', 10);

  return {
    engineUrl,
    port,
  };
}
