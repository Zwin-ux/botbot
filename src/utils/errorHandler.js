/**
 * @file Centralized error handling utilities for the Discord bot.
 */

/**
 * Sends a generic error reply to the user and logs the error.
 * @param {import('discord.js').Message} msg - The Discord message object to reply to.
 * @param {string} [specificMessage=null] - A user-friendly message to prepend to the generic error message.
 * @param {Error} [error=null] - The error object to log. If null, only the generic message is sent.
 * @returns {void}
 */
export function sendErrorReply(msg, specificMessage = null, error = null) {
  if (error) {
    console.error('Error:', error);
  }

  const baseMessage = "Sorry, I ran into a problem processing your message. Please try again.";
  let replyMessage = baseMessage;

  if (specificMessage) {
    replyMessage = `${specificMessage} (If the problem persists, this might be a bug.)`;
  }

  // Attempt to reply to the message. If it fails, log that too.
  msg.reply(replyMessage).catch(replyError => {
    console.error('Failed to send error reply:', replyError);
  });
}

/**
 * Sends a reply suggesting to create a new item when a specified item was not found.
 * This is a common pattern for commands that try to operate on existing items like reminders or categories.
 * @param {import('discord.js').Message} msg - The Discord message object to reply to.
 * @param {string} itemType - The type of item that was not found (e.g., 'reminder', 'category').
 * @returns {void}
 */
export function sendNotFoundSuggestCreate(msg, itemType) {
  // TODO: Integrate with getSetupSuggestion from '../features/setupSuggest.js' for richer "not found" messages.
  // The getSetupSuggestion function returns an embed and components for a more interactive suggestion.
  // Example:
  // import { getSetupSuggestion } from '../features/setupSuggest.js'; // Adjust path as needed
  // const { embed, row } = getSetupSuggestion(itemType);
  // msg.reply({ content: `I couldn’t find that ${itemType}. Want to create a new one?`, embeds: [embed], components: [row] });

  msg.reply(`I couldn’t find that ${itemType}. Would you like to create a new one?`).catch(replyError => {
    console.error('Failed to send not found suggestion reply:', replyError);
  });
}
