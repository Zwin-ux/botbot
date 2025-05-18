const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

class Onboarding {
  constructor(client, agentChannel) {
    this.client = client;
    this.agentChannel = agentChannel;
    this.guildsOnboarded = new Set();
  }

  async start(guild) {
    if (this.guildsOnboarded.has(guild.id)) return;
    this.guildsOnboarded.add(guild.id);
    const owner = await guild.fetchOwner();
    let sent = false;
    // Try DM first
    try {
      await owner.send({ embeds: [this.getWelcomeEmbed(guild)] });
      await owner.send({ components: [this.getSetupButtons()] });
      sent = true;
    } catch (e) {
      sent = false;
    }
    // Fallback to agent channel
    if (!sent) {
      const channel = await this.agentChannel.ensureAgentChannel(guild);
      if (channel) {
        await channel.send({ content: `<@${owner.id}>`, embeds: [this.getWelcomeEmbed(guild)] });
        await channel.send({ content: `<@${owner.id}>`, components: [this.getSetupButtons()] });
      }
    }
  }

  getSetupButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('onboard_standup').setLabel('Schedule Standup').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('onboard_reminder').setLabel('Create Reminder').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('onboard_games').setLabel('Enable Games').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('onboard_skip').setLabel('Skip Setup').setStyle(ButtonStyle.Secondary)
    );
  }

  // Handler for onboarding button interactions
  async handleInteraction(interaction) {
    if (!interaction.isButton()) return;
    switch (interaction.customId) {
      case 'onboard_standup':
        await interaction.reply({ content: 'Let’s schedule your first standup! Type `setup standup in #channel at 9:30am` or use the standup commands in any channel.', ephemeral: true });
        break;
      case 'onboard_reminder':
        await interaction.reply({ content: 'You can create a reminder by typing `remind me to [task] [time]` in any channel. Try it now!', ephemeral: true });
        break;
      case 'onboard_games':
        await interaction.reply({ content: 'Games are enabled by default! Type `games` in any channel to see what’s available.', ephemeral: true });
        break;
      case 'onboard_skip':
        await interaction.reply({ content: 'No problem! You can set up features at any time. Type `help` or `what can I do here?` for guidance.', ephemeral: true });
        break;
      default:
        break;
    }
  }

  getWelcomeEmbed(guild) {
    return new EmbedBuilder()
      .setTitle('🎉 Welcome to BotBot!')
      .setColor('#5865F2')
      .setDescription(`Thanks for inviting me to **${guild.name}**!\n\nLet's get your team set up in less than a minute. I'll walk you through the basics step by step.`)
      .addFields(
        { name: '1️⃣ Agent Channel', value: 'A private channel for you and trusted admins is being set up.' },
        { name: '2️⃣ Reminders & Standups', value: 'You can create reminders and schedule standups or retros right away.' },
        { name: '3️⃣ Games & More', value: 'Fun games and analytics are just a command away.' },
        { name: 'Need Help?', value: 'Type `help` or `what can I do here?` in any channel, anytime.' }
      )
      .setFooter({ text: 'You can customize everything later. Let’s get started!' });
  }

  // Optionally, add more step-by-step onboarding flows here
}

module.exports = Onboarding;
