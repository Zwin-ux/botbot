/**
 * Guild Embeds Utility
 * Creates standardized Discord embeds for guild-related UI elements
 */

/**
 * Create a guild profile embed
 * @param {Object} guild - Guild object
 * @param {Array} members - Guild members
 * @param {Array} reminders - Guild reminders
 * @param {string} viewerId - ID of the user viewing the profile
 * @returns {Object} Discord embed object
 */
const createGuildProfileEmbed = (guild, members, reminders, viewerId) => {
  // Find user's role
  const viewerMember = members.find((m) => m.userId === viewerId);
  const userRole = viewerMember
    ? viewerMember.role.charAt(0).toUpperCase() + viewerMember.role.slice(1)
    : "Guest";

  // Format reminders preview (max 3)
  let remindersText = "No active tasks";
  if (reminders.length > 0) {
    const reminderPreviews = reminders.slice(0, 3).map((r) => {
      const dueText = r.dueTime
        ? `(Due: ${new Date(r.dueTime * 1000).toLocaleString()})`
        : "";
      return `• ${r.content} ${dueText}`;
    });

    remindersText = reminderPreviews.join("\n");
    if (reminders.length > 3) {
      remindersText += `\n...and ${reminders.length - 3} more`;
    }
  }

  // Format members preview
  const memberList = members
    .slice(0, 5)
    .map((m) => {
      const role = m.role === "owner" ? "👑 " : "";
      return `${role}<@${m.userId}>`;
    })
    .join("\n");

  const memberText =
    memberList +
    (members.length > 5 ? `\n...and ${members.length - 5} more` : "");

  return {
    color: 0x3498db,
    title: `${guild.emoji || "🏰"} ${guild.name}`,
    description: guild.description || "*No description set*",
    thumbnail: {
      url: "https://i.imgur.com/pTIHvDG.png", // A castle icon - can be customized
    },
    fields: [
      {
        name: "👥 Members",
        value: memberText,
        inline: true,
      },
      {
        name: "📝 Tasks",
        value: remindersText,
        inline: true,
      },
      {
        name: "👤 Your Role",
        value: userRole,
        inline: true,
      },
    ],
    footer: {
      text: `Created: ${new Date(guild.createdAt).toLocaleDateString()} • ID: ${guild.id}`,
    },
  };
};

/**
 * Create a guild invitation embed
 * @param {Object} guild - Guild object
 * @param {Object} inviter - User who sent the invite
 * @returns {Object} Discord embed object
 */
const createInviteEmbed = (guild, inviter) => {
  return {
    color: 0x3498db,
    title: `Guild Invitation: ${guild.name}`,
    description: `You've been invited to join a guild!`,
    thumbnail: {
      url: "https://i.imgur.com/E5bXEeH.png", // An invite icon - can be customized
    },
    fields: [
      {
        name: "Guild",
        value: `${guild.emoji || "🏰"} ${guild.name}`,
        inline: true,
      },
      {
        name: "Invited By",
        value: inviter.tag || `<@${inviter.id}>`,
        inline: true,
      },
      {
        name: "Description",
        value: guild.description || "*No description available*",
      },
      {
        name: "How to Accept",
        value: `Say "accept invite to ${guild.name}" to join this guild!`,
      },
    ],
    footer: { text: "This invitation doesn't expire" },
  };
};

/**
 * Create a guild reminder/task embed
 * @param {Object} reminder - Reminder object
 * @param {Object} guild - Guild object
 * @param {Object} creator - User who created the reminder
 * @returns {Object} Discord embed
 */
const createGuildReminderEmbed = (reminder, guild, creator) => {
  const fields = [
    {
      name: "Task",
      value: reminder.content,
    },
    {
      name: "Guild",
      value: `${guild.emoji || "🏰"} ${guild.name}`,
      inline: true,
    },
  ];

  // Add due time if available
  if (reminder.dueTime) {
    fields.push({
      name: "Due",
      value: new Date(reminder.dueTime * 1000).toLocaleString(),
      inline: true,
    });
  }

  // Add creator if available
  if (creator) {
    fields.push({
      name: "Created By",
      value: creator.tag || `<@${creator.id}>`,
      inline: true,
    });
  }

  // Add completion instructions
  fields.push({
    name: "Mark as Complete",
    value: `Say "complete guild task ${reminder.id}"`,
  });

  return {
    color: 0xf39c12,
    title: `📝 Guild Task`,
    fields: fields,
    footer: {
      text: `Task ID: ${reminder.id} • Created: ${new Date(reminder.createdAt).toLocaleDateString()}`,
    },
  };
};

/**
 * Create a guild list embed (when user is in multiple guilds)
 * @param {Array} guilds - List of guilds
 * @returns {Object} Discord embed
 */
const createGuildListEmbed = (guilds) => {
  const guildItems = guilds.map((guild, index) => {
    return `${index + 1}. ${guild.emoji || "🏰"} **${guild.name}**${guild.description ? ` - *${guild.description}*` : ""}`;
  });

  return {
    color: 0x3498db,
    title: "Your Guilds",
    description: guildItems.join("\n\n"),
    fields: [
      {
        name: "View Guild Details",
        value: 'Say "show guild details for [name]" to see more information',
      },
      {
        name: "Create a New Guild",
        value: 'Say "create guild called [name]" to start your own guild',
      },
    ],
    footer: {
      text: `${guilds.length} guild${guilds.length === 1 ? "" : "s"} total`,
    },
  };
};

/**
 * Create a successful action embed (confirmation message)
 * @param {string} title - Title of the embed
 * @param {string} description - Description of the action
 * @param {Array} fields - Additional fields
 * @returns {Object} Discord embed
 */
const createSuccessEmbed = (title, description, fields = []) => {
  return {
    color: 0x2ecc71,
    title: title,
    description: description,
    fields: fields,
    footer: { text: "Action completed successfully" },
  };
};

/**
 * Create an error embed
 * @param {string} title - Title of the embed
 * @param {string} description - Description of the error
 * @param {Array} fields - Additional fields with suggestions
 * @returns {Object} Discord embed
 */
const createErrorEmbed = (title, description, fields = []) => {
  return {
    color: 0xe74c3c,
    title: title,
    description: description,
    fields: fields,
    footer: { text: "Error occurred" },
  };
};

module.exports = {
  createGuildProfileEmbed,
  createInviteEmbed,
  createGuildReminderEmbed,
  createGuildListEmbed,
  createSuccessEmbed,
  createErrorEmbed,
};
