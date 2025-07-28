import BaseService from "./baseService.js";
import { v4 as uuidv4 } from "uuid";

class GameService extends BaseService {
  constructor(db, logger) {
    super(db, logger);
  }

  /**
   * Create a new game session
   * @param {Object} gameData - Game data
   * @returns {Promise<string>} - Game ID
   */
  async createGame(gameData) {
    const gameId = uuidv4();
    const { channelId, gameType, createdBy, settings = {} } = gameData;

    await this.execute(
      `INSERT INTO games (id, channel_id, game_type, created_by, settings, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))`,
      [gameId, channelId, gameType, createdBy, JSON.stringify(settings)],
    );

    return gameId;
  }

  /**
   * Get active game in a channel
   * @param {string} channelId - Discord channel ID
   * @returns {Promise<Object|null>} - Game data or null if not found
   */
  async getActiveGame(channelId) {
    const [game] = await this.query(
      `SELECT * FROM games 
       WHERE channel_id = ? AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [channelId],
    );

    if (game) {
      game.settings = JSON.parse(game.settings);
    }

    return game || null;
  }

  /**
   * Update game status
   * @param {string} gameId - Game ID
   * @param {string} status - New status
   * @param {Object} [data] - Additional data to update
   * @returns {Promise<void>}
   */
  async updateGameStatus(gameId, status, data = {}) {
    const updates = ["status = ?"];
    const params = [status];

    if (data.winnerId) {
      updates.push("winner_id = ?");
      params.push(data.winnerId);
    }

    if (data.settings) {
      updates.push("settings = ?");
      params.push(JSON.stringify(data.settings));
    }

    updates.push("updated_at = datetime('now')");

    await this.execute(`UPDATE games SET ${updates.join(", ")} WHERE id = ?`, [
      ...params,
      gameId,
    ]);
  }

  /**
   * Add a player to a game
   * @param {string} gameId - Game ID
   * @param {string} userId - Discord user ID
   * @param {Object} [data] - Additional player data
   * @returns {Promise<void>}
   */
  async addPlayer(gameId, userId, data = {}) {
    await this.execute(
      `INSERT INTO game_players (game_id, user_id, data, created_at)
       VALUES (?, ?, ?, datetime('now')
       ON CONFLICT(game_id, user_id) DO UPDATE SET
         data = excluded.data,
         updated_at = datetime('now')`,
      [gameId, userId, JSON.stringify(data)],
    );
  }

  /**
   * Get game players
   * @param {string} gameId - Game ID
   * @returns {Promise<Array>} - List of players
   */
  async getPlayers(gameId) {
    const players = await this.query(
      `SELECT user_id, data FROM game_players WHERE game_id = ?`,
      [gameId],
    );

    return players.map((p) => ({
      userId: p.user_id,
      ...JSON.parse(p.data),
    }));
  }

  /**
   * Record game result
   * @param {string} gameId - Game ID
   * @param {Object} result - Game result data
   * @returns {Promise<void>}
   */
  async recordResult(gameId, result) {
    await this.execute(
      `UPDATE games SET 
         result = ?,
         completed_at = datetime('now'),
         status = 'completed'
       WHERE id = ?`,
      [JSON.stringify(result), gameId],
    );
  }
}

export default GameService;
