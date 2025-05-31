/**
 * @file IntentService
 * Centralized service for processing recognized intents from Natural Language Understanding (NLU)
 * and mapping them to appropriate actions or handlers within the bot.
 */

class IntentService {
  /**
   * Constructs the IntentService.
   * @param {Object} services - An object containing various service and manager instances.
   * @param {MessageHandler} services.messageHandler - Instance of MessageHandler for command-like actions.
   * @param {GameHandler} [services.gameHandler] - Instance of GameHandler if available.
   * @param {ReminderManager} services.reminderManager - Instance of ReminderManager.
   * @param {CategoryManager} services.categoryManager - Instance of CategoryManager.
   * @param {ConversationFlowManager} services.conversationFlowManager - Instance of ConversationFlowManager.
   * @param {StandupHandler} [services.standupHandler] - Instance of StandupHandler.
   * @param {RetroHandler} [services.retroHandler] - Instance of RetroHandler.
   * @param {import('discord.js').Client} client - The Discord client instance.
   */
  constructor(services, client) {
    this.services = services;
    this.client = client;
  }

  /**
   * Processes a recognized intent and routes it to the appropriate handler or action.
   * @param {string} intent - The name of the recognized intent (e.g., 'set_reminder', 'help').
   * @param {number} confidence - The confidence score of the recognized intent.
   * @param {Object} entities - Any entities extracted by the NLU (e.g., { task: 'buy milk', time: 'tomorrow' }).
   * @param {import('discord.js').Message} message - The original Discord message object.
   * @param {Object} [userState] - Current user state from naturalMessageHandler, if any.
   * @returns {Promise<boolean>} - True if the intent was successfully processed, false otherwise.
   */
  async processIntent(intent, confidence, entities, message, userState = {}) {
    // Implementation will map intents to actions.
    // For now, this will be a placeholder.
    console.log(`IntentService: Processing intent "${intent}" with confidence ${confidence}`, entities);

    switch (intent) {
      case 'help':
        if (this.services.messageHandler && typeof this.services.messageHandler.showHelp === 'function') {
          try {
            await this.services.messageHandler.showHelp(message);
            return true;
          } catch (error) {
            console.error("Error calling messageHandler.showHelp:", error);
            return false;
          }
        } else {
          console.warn("IntentService: MessageHandler or showHelp method not available for 'help' intent.");
          // Fallback reply if MessageHandler.showHelp is not available
          await message.reply("I can help with reminders, tasks, and more. Try asking 'what can you do?' or 'set a reminder'.");
          return true;
        }

      case 'set_reminder':
        // TODO: Implement proper routing to MessageHandler's reminder creation flow.
        // This will likely involve:
        // 1. Extracting task description and possibly time/date from `entities`.
        // 2. Calling a method on `this.services.messageHandler` (e.g., `initiateReminderFromNLU`)
        //    which then uses `ConversationFlowManager`.
        // For now, we replicate the basic NLU handler's previous behavior if no entities.
        // This is a placeholder and needs to be improved.
        if (this.services.conversationFlowManager) {
            const task = entities?.task_description || entities?.task || "something"; // Get task from entities
            // If NLU provides a specific time, ConversationFlowManager might need a way to accept it directly.
            // For now, always trigger the "ask for time" flow.
            await this.services.conversationFlowManager.handleIncompleteReminder(message, task);
            // Update userState in naturalMessageHandler if possible/needed.
            // The userState here is passed by value, so direct modification won't affect naturalMessageHandler's state.
            // This indicates a need for better state sharing or different flow initiation.
            if (userState) { // userState is from naturalMessageHandler
              userState.awaitingReminderTime = true; // This sets it on the copy, not original
            }
            return true;
        } else {
            console.warn("IntentService: ConversationFlowManager not available for 'set_reminder' intent.");
            // Fallback reply if ConversationFlowManager is not available
            await message.reply("I can set reminders, but I'm having trouble accessing that feature right now.");
            return true;
        }

      // Other cases for different intents can be added here.
      // e.g., case 'start_game':
      //   if (this.services.gameHandler && typeof this.services.gameHandler.startGame === 'function') {
      //     await this.services.gameHandler.startGame(message, entities.game_type);
      //     return true;
      //   }
      //   break;

      default:
        console.log(`IntentService: No specific handler for intent "${intent}".`);
        return false; // Intent not handled by this service
    }
  }
}

export default IntentService;
