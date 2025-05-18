/**
 * Utility functions for creating and styling embeds with visual feedback
 */

// Color palette for different game states and urgencies
const COLORS = {
  INFO: 0x3498db,      // Blue
  SUCCESS: 0x2ecc71,   // Green
  WARNING: 0xf39c12,   // Orange
  DANGER: 0xe74c3c,    // Red
  NEUTRAL: 0x95a5a6    // Gray
};

// Emoji mapping for different game states
const EMOJIS = {
  WAITING: '⏳',
  STARTING: '🚀',
  IN_PROGRESS: '🎮',
  ENDED: '🏁',
  ERROR: '❌',
  JOIN: '✋',
  WINNER: '🏆',
  COUNTDOWN: '⏱️',
  PLAYERS: '👥',
  ROUND: '🔢'
};

/**
 * Creates a base embed with consistent styling
 * @param {Object} options - Embed options
 * @param {string} options.title - Title of the embed
 * @param {string} options.description - Description text
 * @param {number} [options.color] - Embed color
 * @param {string} [options.emoji] - Leading emoji for title
 * @param {Array} [options.fields] - Additional fields
 * @param {boolean} [options.timestamp] - Whether to add a timestamp
 * @returns {Object} - Discord embed object
 */
function createEmbed({ 
  title, 
  description, 
  color = COLORS.INFO, 
  emoji,
  fields = [],
  timestamp = true
}) {
  const embed = {
    color,
    title: emoji ? `${emoji} ${title}` : title,
    description,
    fields,
    timestamp: timestamp ? new Date() : undefined
  };

  return embed;
}

/**
 * Creates a game-specific embed with appropriate styling
 * @param {string} gameType - Type of game (emoji-race, story-builder, who-said-it)
 * @param {Object} options - Embed options
 * @returns {Object} - Styled Discord embed
 */
function createGameEmbed(gameType, options) {
  const gameConfig = {
    'emoji-race': {
      color: 0x9b59b6, // Purple
      emoji: '🏁',
      title: 'Emoji Race'
    },
    'story-builder': {
      color: 0x3498db, // Blue
      emoji: '📖',
      title: 'Story Builder'
    },
    'who-said-it': {
      color: 0xe91e63, // Pink
      emoji: '🗣️',
      title: 'Who Said It?'
    }
  };

  const config = gameConfig[gameType] || {
    color: COLORS.INFO,
    emoji: '🎮',
    title: 'Game'
  };

  return createEmbed({
    title: options.title || config.title,
    description: options.description || '',
    color: options.color || config.color,
    emoji: options.emoji || config.emoji,
    fields: options.fields || [],
    timestamp: options.timestamp !== false
  });
}

/**
 * Creates an embed that shows a countdown
 * @param {number} seconds - Number of seconds to count down
 * @param {string} message - Message to show with the countdown
 * @returns {Object} - Countdown embed
 */
function createCountdownEmbed(seconds, message) {
  return createEmbed({
    title: 'Countdown',
    description: `${EMOJIS.COUNTDOWN} ${message}\n\n${'⏳ '.repeat(Math.min(5, Math.ceil(seconds / 2)))}`,
    color: COLORS.WARNING,
    emoji: EMOJIS.COUNTDOWN,
    timestamp: false
  });
}

/**
 * Creates a player list embed
 * @param {Array} players - Array of player objects
 * @param {string} title - Title for the player list
 * @returns {Object} - Player list embed
 */
function createPlayerListEmbed(players, title = 'Players') {
  const playerList = players.length > 0 
    ? players.map((p, i) => `${i + 1}. <@${p.id}>`).join('\n')
    : 'No players yet. Type `join` to join!';

  return createEmbed({
    title,
    description: `\n${playerList}\n\n**${players.length} players**`,
    emoji: EMOJIS.PLAYERS,
    color: COLORS.INFO
  });
}

module.exports = {
  COLORS,
  EMOJIS,
  createEmbed,
  createGameEmbed,
  createCountdownEmbed,
  createPlayerListEmbed
};
