import { PermissionsBitField, ChannelType, EmbedBuilder } from 'discord.js';
import AgentManager from '../../database/agentManager.js'; // Assuming agentManager.js now uses export default

class AgentChannel {
  constructor(client, db) {
    this.client = client;
    this.agentManager = new AgentManager(db);
    this.agentChannels = new Map();
  }

  // Create or restore the agent channel for a guild
  async ensureAgentChannel(guild) {
    let settings = await this.agentManager.getAgentChannel(guild.id);
    let channel = settings && guild.channels.cache.get(settings.agent_channel_id);
    const ownerId = settings ? settings.owner_id : guild.ownerId;

    // If missing or deleted, create new
    if (!channel) {
      channel = await guild.channels.create({
        name: '🤖│agent-control',
        type: ChannelType.GuildText,
        topic: 'Bot Agent Control Panel - Do not modify permissions manually',
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: ownerId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          { id: this.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.AttachFiles] }
        ]
      });
      await this.agentManager.setupAgentChannel(guild.id, ownerId, channel.id);
      await this.sendWelcome(channel, ownerId);
    }
    this.agentChannels.set(guild.id, channel.id);
    return channel;
  }

  // Welcome message
  async sendWelcome(channel, ownerId) {
    const embed = new EmbedBuilder()
      .setTitle('🤖 Agent Control Panel')
      .setDescription('This private channel is for server owner and agent-admins. All actions are logged and auditable. Type `help` for commands.')
      .setColor('#5865F2')
      .setFooter({ text: 'Security and privacy are enforced.' });
    await channel.send({ content: `<@${ownerId}>`, embeds: [embed] });
  }

  // Handle messages in agent channel
  async handleMessage(msg) {
    if (msg.author.bot) return false;
    const channelId = this.agentChannels.get(msg.guild.id);
    if (!channelId || msg.channel.id !== channelId) return false;
    const settings = await this.agentManager.getAgentChannel(msg.guild.id);
    const isOwner = msg.author.id === settings.owner_id;
    const isAdmin = (await this.agentManager.listAdmins(msg.guild.id)).some(a => a.user_id === msg.author.id);
    if (!isOwner && !isAdmin) {
      await msg.reply('❌ You are not authorized to use this channel.');
      return true;
    }
    // Log every command
    await this.agentManager.logAction(msg.guild.id, msg.author.id, 'COMMAND', { content: msg.content });
    const [cmd, ...args] = msg.content.trim().split(/\s+/);
    switch (cmd.toLowerCase()) {
      case 'help':
        await msg.reply('Agent commands: help, status, addadmin @user, removeadmin @user, listadmins, auditlog, safemode [on/off]');
        break;
      case 'status':
        await msg.reply(`Agent channel: <#${channelId}>\nOwner: <@${settings.owner_id}>\nAdmins: ${(await this.agentManager.listAdmins(msg.guild.id)).map(a => `<@${a.user_id}>`).join(', ') || 'None'}`);
        break;
      case 'addadmin':
        if (!isOwner) return msg.reply('Only the owner can add admins.');
        if (!args[0]) return msg.reply('Usage: addadmin @user');
        const addId = args[0].replace(/[^0-9]/g, '');
        await this.agentManager.addAdmin(msg.guild.id, addId, msg.author.id);
        await msg.channel.permissionOverwrites.edit(addId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
        await msg.reply(`Added <@${addId}> as agent-admin.`);
        break;
      case 'removeadmin':
        if (!isOwner) return msg.reply('Only the owner can remove admins.');
        if (!args[0]) return msg.reply('Usage: removeadmin @user');
        const remId = args[0].replace(/[^0-9]/g, '');
        await this.agentManager.removeAdmin(msg.guild.id, remId);
        await msg.channel.permissionOverwrites.delete(remId);
        await msg.reply(`Removed <@${remId}> from agent-admins.`);
        break;
      case 'listadmins':
        const admins = await this.agentManager.listAdmins(msg.guild.id);
        await msg.reply('Agent-admins: ' + (admins.map(a => `<@${a.user_id}>`).join(', ') || 'None'));
        break;
      case 'auditlog':
        const logs = await this.agentManager.getAuditLogs(msg.guild.id, 10);
        await msg.reply('Recent actions:\n' + logs.map(l => `${l.timestamp}: <@${l.user_id}> ${l.action}`).join('\n'));
        break;
      case 'safemode':
        if (!isOwner) return msg.reply('Only the owner can toggle safe mode.');
        const enable = args[0] && args[0].toLowerCase() === 'on';
        await this.agentManager.setSafeMode(msg.guild.id, enable);
        await msg.reply(`Safe mode ${enable ? 'enabled' : 'disabled'}.`);
        break;
      default:
        await msg.reply('Unknown command. Type `help`.');
    }
    return true;
  }
}

export default AgentChannel;
