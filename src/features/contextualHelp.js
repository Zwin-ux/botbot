const { EmbedBuilder } = require("discord.js");

function getContextualHelp({
  channelType,
  isAgentChannel,
  isDM,
  isOwner,
  isAdmin,
}) {
  let title = "🤖 BotBot Help";
  let description = "";
  let fields = [];

  if (isAgentChannel) {
    description =
      "This is your private agent control channel. Only the owner and agent-admins can see this.";
    fields = [
      {
        name: "Agent Commands",
        value:
          "`help`, `status`, `addadmin @user`, `removeadmin @user`, `listadmins`, `auditlog`, `safemode on/off`",
      },
      {
        name: "What else?",
        value: "Manage server security, admins, and see audit logs here.",
      },
    ];
  } else if (isDM) {
    description =
      "You can manage your reminders, view your schedule, and get personalized help here.";
    fields = [
      {
        name: "Personal Commands",
        value: "`remind me to ...`, `my reminders`, `help`, `categories`",
      },
      {
        name: "Examples",
        value:
          "`remind me to call mom at 5pm tomorrow`\n`my reminders`\n`categories`",
      },
    ];
  } else {
    description =
      "BotBot works in any channel for reminders, games, standups, and more!";
    fields = [
      {
        name: "General Commands",
        value: "`remind me to ...`, `standup`, `retro`, `games`, `help`",
      },
      {
        name: "Examples",
        value:
          "`remind me to submit report at 3pm`\n`start emoji race`\n`standup`",
      },
    ];
  }

  if (isOwner) {
    fields.push({
      name: "Owner Tips",
      value: "Use the agent channel for secure admin tools and logs.",
    });
  }

  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .addFields(fields)
    .setColor("#5865F2")
    .setFooter({ text: "Type commands in plain English. I’ll help you out!" });
}

module.exports = { getContextualHelp };
