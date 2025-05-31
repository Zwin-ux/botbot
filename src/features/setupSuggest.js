import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';

export function getSetupSuggestion(feature) {
  let title, desc, buttonLabel, buttonId, emoji;
  switch (feature) {
    case 'retro':
      title = 'No Active Retrospectives Found';
      desc = 'You haven\'t set up any retrospectives yet. Would you like to schedule one now?';
      buttonLabel = 'Schedule Retro';
      buttonId = 'suggest_setup_retro';
      emoji = '📝';
      break;
    case 'standup':
      title = 'No Active Standups Found';
      desc = 'You haven\'t set up any daily standups yet. Would you like to set one up now?';
      buttonLabel = 'Set Up Standup';
      buttonId = 'suggest_setup_standup';
      emoji = '🌅';
      break;
    case 'reminder':
      title = 'No Reminders Found';
      desc = 'You don’t have any reminders yet. Want to create your first reminder?';
      buttonLabel = 'Create Reminder';
      buttonId = 'suggest_setup_reminder';
      emoji = '⏰';
      break;
    case 'game':
      title = 'Let’s Play!';
      desc = 'Bring some magic to your channel! Try saying: **start emoji race** or **start story** to get the fun started. 🎉';
      buttonLabel = 'Start a game';
      buttonId = 'suggest_setup_game';
      emoji = '🎲';
      break;
    default:
      title = 'Setup Needed';
      desc = 'This feature isn\'t set up yet.';
      buttonLabel = 'Set Up';
      buttonId = 'suggest_setup_generic';
      emoji = '✨';
  }
  const embed = new EmbedBuilder()
    .setTitle(`${emoji} ${title}`)
    .setDescription(desc)
    .setColor('#FEE75C')
    .setFooter({ text: 'BotBot makes setup easy!' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(buttonId).setLabel(buttonLabel).setStyle(ButtonStyle.Primary)
  );
  return { embed, row };
}

// No longer using module.exports, direct export of the function.
