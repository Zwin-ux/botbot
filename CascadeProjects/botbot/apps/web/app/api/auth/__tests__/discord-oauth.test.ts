import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as discordAuthHandler } from '../discord/route';
import { GET as callbackHandler } from '../callback/route';

// Mock environment variables
vi.stubEnv('DISCORD_CLIENT_ID', 'test_client_id');
vi.stubEnv('DISCORD_REDIRECT_URI', 'http://localhost:3000/api/auth/callback');
vi.stubEnv('DISCORD_CLIENT_SECRET', 'test_client_secret');
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');

// Mock fetch
global.fetch = vi.fn();

describe('Discord OAuth Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Discord Auth Initiation', () => {
    it('should redirect to Discord OAuth URL with correct parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/discord');
      const response = await discordAuthHandler(request);

      expect(response.status).toBe(307);
      
      const location = response.headers.get('location');
      expect(location).toContain('discord.com/api/oauth2/authorize');
      expect(location).toContain('client_id=test_client_id');
      expect(location).toContain('scope=identify+guilds+bot');
      expect(location).toContain('permissions=2147483648');
    });

    it('should include returnUrl in state parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/discord?returnUrl=/marketplace/deploy');
      const response = await discordAuthHandler(request);

      const location = response.headers.get('location');
      expect(location).toContain('state=%2Fmarketplace%2Fdeploy');
    });

    it('should handle missing returnUrl gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/discord');
      const response = await discordAuthHandler(request);

      const location = response.headers.get('location');
      expect(location).toContain('state=%2Fmarketplace');
    });
  });

  describe('OAuth Callback', () => {
    it('should handle successful OAuth callback', async () => {
      const mockTokenResponse = {
        access_token: 'test_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'test_refresh_token',
        scope: 'identify guilds bot',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/auth/callback?code=test_code&state=/marketplace'
      );
      const response = await callbackHandler(request);

      expect(response.status).toBe(307);
      
      const location = response.headers.get('location');
      expect(location).toContain('discord_auth=success');
      expect(location).toContain('access_token=test_access_token');
    });

    it('should handle OAuth error responses', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/callback?error=access_denied&state=/marketplace'
      );
      const response = await callbackHandler(request);

      expect(response.status).toBe(307);
      
      const location = response.headers.get('location');
      expect(location).toContain('error=oauth_failed');
    });

    it('should handle missing authorization code', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/callback?state=/marketplace'
      );
      const response = await callbackHandler(request);

      expect(response.status).toBe(307);
      
      const location = response.headers.get('location');
      expect(location).toContain('error=no_code');
    });

    it('should handle token exchange failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Invalid client'),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/auth/callback?code=invalid_code&state=/marketplace'
      );
      const response = await callbackHandler(request);

      expect(response.status).toBe(307);
      
      const location = response.headers.get('location');
      expect(location).toContain('error=token_exchange_failed');
    });
  });
});