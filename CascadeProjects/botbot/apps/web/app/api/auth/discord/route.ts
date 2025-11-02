import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const returnUrl = searchParams.get('returnUrl') || '/marketplace';

    // Build Discord OAuth URL with bot permissions
    const discordAuthUrl = new URL('https://discord.com/api/oauth2/authorize');
    discordAuthUrl.searchParams.set('client_id', process.env.DISCORD_CLIENT_ID!);
    discordAuthUrl.searchParams.set('redirect_uri', process.env.DISCORD_REDIRECT_URI!);
    discordAuthUrl.searchParams.set('response_type', 'code');
    discordAuthUrl.searchParams.set('scope', 'identify guilds bot');
    discordAuthUrl.searchParams.set('permissions', '2147483648'); // Send Messages permission
    discordAuthUrl.searchParams.set('state', returnUrl);

    return NextResponse.redirect(discordAuthUrl.toString());
  } catch (error) {
    console.error('Discord OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Discord OAuth' },
      { status: 500 }
    );
  }
}