import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated with Discord' },
        { status: 401 }
      );
    }

    // Fetch user's guilds from Discord API
    const guildsResponse = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!guildsResponse.ok) {
      const errorData = await guildsResponse.text();
      console.error('Failed to fetch Discord guilds:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch Discord servers' },
        { status: guildsResponse.status }
      );
    }

    const guilds: DiscordGuild[] = await guildsResponse.json();

    // Filter guilds where user has MANAGE_GUILD permission (0x20)
    const manageableGuilds = guilds.filter(guild => {
      const permissions = BigInt(guild.permissions);
      const hasManageGuild = (permissions & BigInt(0x20)) === BigInt(0x20);
      return guild.owner || hasManageGuild;
    });

    // Transform to our expected format
    const transformedGuilds = manageableGuilds.map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon 
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
        : null,
      isOwner: guild.owner,
      canManage: true,
    }));

    return NextResponse.json({ guilds: transformedGuilds });
  } catch (error) {
    console.error('Discord guilds API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}