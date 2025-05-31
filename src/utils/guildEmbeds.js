/**
 * Guild Embeds Utility
 * Creates standardized Discord embeds for guild-related UI elements
 */

import config from '../config.js'; // For URL constants
import { createEmbed, COLORS } from './embedUtils.js'; // For standardized embeds

/**
 * Create a guild profile embed
 * @param {Object} guild - Guild object
 * @param {Array} members - Guild members
 * @param {Array} reminders - Guild reminders
 * @param {string} viewerId - ID of the user viewing the profile
 * @returns {Object} Discord embed object
 */
export const createGuildProfileEmbed = (guild, members, reminders, viewerId) => {
  // Find user's role
  const viewerMember = members.find(m => m.userId === viewerId);
  const userRole = viewerMember 
    ? (viewerMember.role.charAt(0).toUpperCase() + viewerMember.role.slice(1))
    : 'Guest';

  // Format reminders preview (max 3)
  let remindersText = 'No active tasks';
  if (reminders.length > 0) {
    const reminderPreviews = reminders.slice(0, 3).map(r => {
      const dueText = r.dueTime 
        ? `(Due: ${new Date(r.dueTime * 1000).toLocaleString()})` 
        : '';
      return `• ${r.content} ${dueText}`;
    });
    
    remindersText = reminderPreviews.join('\n');
    if (reminders.length > 3) {
      remindersText += `\n...and ${reminders.length - 3} more`;
    }
  }

  // Format members preview
  const memberList = members.slice(0, 5).map(m => {
    const role = m.role === 'owner' ? '👑 ' : '';
    return `${role}<@${m.userId}>`;
  }).join('\n');
  
  const memberText = memberList + (members.length > 5 
    ? `\n...and ${members.length - 5} more` 
    : '');

  return { // This still returns a raw embed object, not using createEmbed.
            // This could be a future step if further standardization is desired for its structure.
    color: 0x3498db, // Consider using COLORS.INFO or a specific guild color
    title: `${guild.emoji || '🏰'} ${guild.name}`,
    description: guild.description || '*No description set*',
    thumbnail: {
      url: config.GUILD_PROFILE_THUMBNAIL_URL
    },
    fields: [
      {
        name: '👥 Members',
        value: memberText,
        inline: true
      },
      {
        name: '📝 Tasks',
        value: remindersText,
        inline: true
      },
      {
        name: '👤 Your Role',
        value: userRole,
        inline: true
      }
    ],
    footer: { 
      text: `Created: ${new Date(guild.createdAt).toLocaleDateString()} • ID: ${guild.id}`
    }
  };
};

/**
 * Create a guild invitation embed
 * @param {Object} guild - Guild object
 * @param {Object} inviter - User who sent the invite
 * @returns {Object} Discord embed object
 */
export const createInviteEmbed = (guild, inviter) => {
  // This also returns a raw embed object. Could be standardized with createEmbed too.
  return {
    color: 0x3498db, // Consider using COLORS.INFO
    title: `Guild Invitation: ${guild.name}`,
    description: `You've been invited to join a guild!`,
    thumbnail: {
      url: config.GUILD_INVITE_THUMBNAIL_URL
    },
    fields: [
      {
        name: 'Guild',
        value: `${guild.emoji || '🏰'} ${guild.name}`,
        inline: true
      },
      {
        name: 'Invited By',
        value: inviter.tag || `<@${inviter.id}>`,
        inline: true
      },
      {
        name: 'Description',
        value: guild.description || '*No description available*'
      },
      {
        name: 'How to Accept',
        value: `Say "accept invite to ${guild.name}" to join this guild!`
      }
    ],
    footer: { text: 'This invitation doesn\'t expire' }
  };
};

/**
 * Create a guild reminder/task embed
 * @param {Object} reminder - Reminder object
 * @param {Object} guild - Guild object  
 * @param {Object} creator - User who created the reminder
 * @returns {Object} Discord embed
 */
export const createGuildReminderEmbed = (reminder, guild, creator) => {
  const fields = [
    {
      name: 'Task',
      value: reminder.content
    },
    {
      name: 'Guild',
      value: `${guild.emoji || '🏰'} ${guild.name}`,
      inline: true
    }
  ];

  if (reminder.dueTime) {
    fields.push({
      name: 'Due',
      value: new Date(reminder.dueTime * 1000).toLocaleString(),
      inline: true
    });
  }
  
  if (creator) {
    fields.push({
      name: 'Created By',
      value: creator.tag || `<@${creator.id}>`,
      inline: true
    });
  }

  fields.push({
    name: 'Mark as Complete',
    value: `Say "complete guild task ${reminder.id}"`
  });

  return createEmbed({ // Using createEmbed here
    title: '📝 Guild Task',
    fields: fields,
    color: COLORS.WARNING, // Or another appropriate color
    footer: { 
      text: `Task ID: ${reminder.id} • Created: ${new Date(reminder.createdAt).toLocaleDateString()}`
    },
    timestamp: false // Assuming createdAt in footer is enough
  });
};

/**
 * Create a guild list embed (when user is in multiple guilds)
 * @param {Array} guilds - List of guilds
 * @returns {Object} Discord embed
 */
export const createGuildListEmbed = (guilds) => {
  const guildItems = guilds.map((guild, index) => {
    return `${index + 1}. ${guild.emoji || '🏰'} **${guild.name}**${guild.description ? ` - *${guild.description}*` : ''}`;
  });

  // Using createEmbed for this one too for consistency
  return createEmbed({
    title: 'Your Guilds',
    description: guildItems.join('\n\n'),
    color: COLORS.INFO,
    fields: [
      {
        name: 'View Guild Details',
        value: 'Say "show guild details for [name]" to see more information'
      },
      {
        name: 'Create a New Guild',
        value: 'Say "create guild called [name]" to start your own guild'
      }
    ],
    footer: { text: `${guilds.length} guild${guilds.length === 1 ? '' : 's'} total` },
    timestamp: false
  });
};

/**
 * Create a successful action embed (confirmation message)
 * @param {string} title - Title of the embed
 * @param {string} description - Description of the action
 * @param {Array} fields - Additional fields
 * @returns {Object} Discord embed
 */
export const createSuccessEmbed = (title, description, fields = []) => {
  return createEmbed({
    title: title,
    description: description,
    fields: fields,
    color: COLORS.SUCCESS,
    emoji: '✅', // Standard success emoji
    footer: { text: 'Action completed successfully' },
    timestamp: true
  });
};

/**
 * Create an error embed
 * @param {string} title - Title of the embed
 * @param {string} description - Description of the error
 * @param {Array} fields - Additional fields with suggestions
 * @returns {Object} Discord embed
 */
export const createErrorEmbed = (title, description, fields = []) => {
  return createEmbed({
    title: title,
    description: description,
    fields: fields,
    color: COLORS.DANGER,
    emoji: '❌', // Standard error emoji
    footer: { text: 'Error occurred' },
    timestamp: true
  });
};
