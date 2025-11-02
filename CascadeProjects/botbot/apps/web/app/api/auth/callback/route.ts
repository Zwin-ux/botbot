import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state') || '/marketplace';
    const error = searchParams.get('error');

    if (error) {
      console.error('Discord OAuth error:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/marketplace?error=oauth_failed`);
    }

    if (!code) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/marketplace?error=no_code`);
    }

    // Exchange code for access token
    const tokenResponse = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/marketplace?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    // Store the access token in session or database
    // For now, we'll redirect with success and let the frontend handle the token
    const redirectUrl = new URL(state, process.env.NEXT_PUBLIC_APP_URL!);
    redirectUrl.searchParams.set('discord_auth', 'success');
    
    // In a real implementation, you'd want to store the token securely
    // For now, we'll use a temporary approach with URL params (not recommended for production)
    redirectUrl.searchParams.set('access_token', tokenData.access_token);

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Discord OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/marketplace?error=callback_failed`);
  }
}