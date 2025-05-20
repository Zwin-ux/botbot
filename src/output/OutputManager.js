// OutputManager: Centralizes outgoing responses, ready for localization

const OutputManager = {
  async sendResponse({ text, language, user, channel, discordClient }) {
    // For now, just send via Discord. Later: add localization, formatting, etc.
    if (channel && channel.send) {
      await channel.send(text);
    } else if (discordClient && user) {
      // Fallback: DM the user
      const dm = await discordClient.users.fetch(user.id);
      await dm.send(text);
    }
    // Future: add web, mobile, etc.
  }
};

module.exports = OutputManager;
