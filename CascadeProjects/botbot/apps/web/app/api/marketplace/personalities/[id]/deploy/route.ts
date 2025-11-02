import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@botbot/db';
import { z } from 'zod';

const deploymentSchema = z.object({
  discordGuildId: z.string().min(1, 'Discord server ID is required'),
  customizations: z.object({
    name: z.string().optional(),
    traits: z.record(z.any()).optional(),
  }).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const templateId = params.id;
    const body = await request.json();
    
    // Validate request body
    const validationResult = deploymentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { discordGuildId, customizations } = validationResult.data;

    // Get the personality template
    const template = await prisma.personalityTemplate.findUnique({
      where: { id: templateId },
      include: { creator: true },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Personality template not found' },
        { status: 404 }
      );
    }

    if (!template.isPublic) {
      return NextResponse.json(
        { error: 'Personality template is not available for deployment' },
        { status: 403 }
      );
    }

    // Check if user has permission to manage the Discord server
    const isAuthorized = await verifyDiscordServerPermissions(
      session.accessToken!,
      discordGuildId
    );

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'You do not have permission to deploy to this Discord server' },
        { status: 403 }
      );
    }

    // Check if there's already an active deployment for this template in this server
    const existingDeployment = await prisma.personalityDeployment.findFirst({
      where: {
        templateId,
        userId: session.user.id,
        status: 'ACTIVE',
        metadata: {
          path: ['discordGuildId'],
          equals: discordGuildId,
        },
      },
    });

    if (existingDeployment) {
      return NextResponse.json(
        { error: 'This personality is already deployed to this server' },
        { status: 409 }
      );
    }

    // Create the agent from the template
    const agentName = customizations?.name || template.name;
    const agentTraits = customizations?.traits 
      ? { ...template.traits, ...customizations.traits }
      : template.traits;

    const agent = await prisma.agent.create({
      data: {
        ownerUserId: session.user.id,
        name: agentName,
        persona: template.persona,
        systemPrompt: template.systemPrompt,
        traits: agentTraits,
        status: 'ACTIVE',
      },
    });

    // Create the agent instance
    const agentInstance = await prisma.agentInstance.create({
      data: {
        agentId: agent.id,
        environment: {
          platform: 'discord',
          guildId: discordGuildId,
        },
        mood: {
          pleasure: 0.5,
          arousal: 0.5,
          dominance: 0.5,
        },
        energy: 100,
      },
    });

    // Create the deployment record
    const deployment = await prisma.personalityDeployment.create({
      data: {
        templateId,
        agentId: agent.id,
        userId: session.user.id,
        status: 'ACTIVE',
        metadata: {
          discordGuildId,
          deployedAt: new Date().toISOString(),
          customizations: customizations || {},
        },
      },
    });

    // Update template download count
    await prisma.personalityTemplate.update({
      where: { id: templateId },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });

    // Return deployment details
    return NextResponse.json({
      success: true,
      deployment: {
        id: deployment.id,
        agentId: agent.id,
        agentName: agent.name,
        discordGuildId,
        status: deployment.status,
        deployedAt: deployment.createdAt,
      },
      instructions: {
        nextSteps: [
          'Your AI personality has been successfully deployed!',
          'The bot will now respond to messages in your Discord server.',
          'You can manage this personality from your agent dashboard.',
          'Try mentioning the bot or starting a conversation to test it out.',
        ],
        botInviteUrl: `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=2147483648&scope=bot&guild_id=${discordGuildId}`,
      },
    });

  } catch (error) {
    console.error('Deployment error:', error);
    return NextResponse.json(
      { error: 'Failed to deploy personality' },
      { status: 500 }
    );
  }
}

async function verifyDiscordServerPermissions(
  accessToken: string,
  guildId: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return false;
    }

    const guilds = await response.json();
    const guild = guilds.find((g: any) => g.id === guildId);

    if (!guild) {
      return false;
    }

    // Check if user has MANAGE_GUILD permission (0x20) or is owner
    const permissions = BigInt(guild.permissions);
    const hasManageGuild = (permissions & BigInt(0x20)) === BigInt(0x20);
    
    return guild.owner || hasManageGuild;
  } catch (error) {
    console.error('Error verifying Discord permissions:', error);
    return false;
  }
}