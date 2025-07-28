import { performance } from "../../utils/performance.js";
import { analytics } from "../../utils/analytics.js";
import { cache } from "../../utils/cache.js";
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

/**
 * Advanced Interactive Games System
 * Includes multiplayer games, tournaments, and AI-powered games
 */
class AdvancedGamesManager {
  constructor() {
    this.activeGames = new Map();
    this.tournaments = new Map();
    this.gameStats = new Map();
    this.aiOpponents = new Map();
  }

  /**
   * Start a multiplayer battle royale game
   */
  async startBattleRoyale(channel, players = []) {
    const gameId = `br_${Date.now()}`;
    const game = {
      id: gameId,
      type: "battle_royale",
      channel,
      players: new Map(),
      status: "waiting",
      round: 0,
      maxRounds: 10,
      startTime: Date.now(),
      settings: {
        maxPlayers: 20,
        roundDuration: 30000,
        eliminationRate: 0.3,
      },
    };

    // Add initial players
    for (const player of players) {
      game.players.set(player.id, {
        id: player.id,
        username: player.username,
        health: 100,
        items: [],
        position: { x: Math.random() * 100, y: Math.random() * 100 },
        isAlive: true,
        kills: 0,
        damage: 0,
      });
    }

    this.activeGames.set(gameId, game);

    const embed = new EmbedBuilder()
      .setTitle("🏆 Battle Royale Starting!")
      .setDescription(
        `A new Battle Royale is starting! React with ⚔️ to join!\n\nPlayers: ${game.players.size}/${game.settings.maxPlayers}`,
      )
      .setColor(0xff6b6b)
      .addFields(
        {
          name: "Max Players",
          value: game.settings.maxPlayers.toString(),
          inline: true,
        },
        { name: "Round Duration", value: "30 seconds", inline: true },
        { name: "Status", value: "Waiting for players", inline: true },
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`join_br_${gameId}`)
        .setLabel("Join Battle")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("⚔️"),
      new ButtonBuilder()
        .setCustomId(`start_br_${gameId}`)
        .setLabel("Start Game")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🚀"),
    );

    const message = await channel.send({ embeds: [embed], components: [row] });
    game.message = message;

    analytics.trackEvent("battle_royale_created", {
      gameId,
      channelId: channel.id,
      initialPlayers: game.players.size,
    });

    return gameId;
  }

  /**
   * Process battle royale round
   */
  async processBattleRoyaleRound(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game || game.type !== "battle_royale") return;

    game.round++;
    const alivePlayers = Array.from(game.players.values()).filter(
      (p) => p.isAlive,
    );

    if (alivePlayers.length <= 1) {
      return await this.endBattleRoyale(gameId);
    }

    // Simulate combat
    const combatResults = this.simulateCombat(alivePlayers);

    // Apply damage and eliminations
    for (const result of combatResults) {
      const player = game.players.get(result.playerId);
      if (player) {
        player.health -= result.damage;
        player.damage += result.damageDealt;
        if (result.kills) player.kills += result.kills;

        if (player.health <= 0) {
          player.isAlive = false;
        }
      }
    }

    // Update game display
    await this.updateBattleRoyaleDisplay(game);

    // Schedule next round
    if (alivePlayers.length > 1) {
      setTimeout(
        () => this.processBattleRoyaleRound(gameId),
        game.settings.roundDuration,
      );
    }
  }

  /**
   * Simulate combat for battle royale
   */
  simulateCombat(players) {
    const results = [];
    const shuffled = [...players].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length; i += 2) {
      const player1 = shuffled[i];
      const player2 = shuffled[i + 1];

      if (!player2) {
        // Odd player out, takes environmental damage
        results.push({
          playerId: player1.id,
          damage: Math.floor(Math.random() * 15) + 5,
          damageDealt: 0,
          kills: 0,
        });
        continue;
      }

      // Combat simulation
      const p1Attack = Math.floor(Math.random() * 30) + 10;
      const p2Attack = Math.floor(Math.random() * 30) + 10;

      results.push({
        playerId: player1.id,
        damage: p2Attack,
        damageDealt: p1Attack,
        kills: player2.health - p1Attack <= 0 ? 1 : 0,
      });

      results.push({
        playerId: player2.id,
        damage: p1Attack,
        damageDealt: p2Attack,
        kills: player1.health - p2Attack <= 0 ? 1 : 0,
      });
    }

    return results;
  }

  /**
   * Start a trivia tournament
   */
  async startTriviaTournament(channel, category = "general") {
    const tournamentId = `trivia_${Date.now()}`;
    const tournament = {
      id: tournamentId,
      type: "trivia",
      channel,
      category,
      participants: new Map(),
      currentRound: 0,
      maxRounds: 5,
      questions: await this.generateTriviaQuestions(category, 25),
      status: "registration",
      startTime: Date.now(),
    };

    this.tournaments.set(tournamentId, tournament);

    const embed = new EmbedBuilder()
      .setTitle("🧠 Trivia Tournament!")
      .setDescription(
        `Join the ${category} trivia tournament!\n\nRounds: ${tournament.maxRounds}\nQuestions per round: 5`,
      )
      .setColor(0x4ecdc4)
      .addFields(
        { name: "Category", value: category, inline: true },
        { name: "Participants", value: "0", inline: true },
        { name: "Status", value: "Registration Open", inline: true },
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`join_trivia_${tournamentId}`)
        .setLabel("Join Tournament")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🧠"),
      new ButtonBuilder()
        .setCustomId(`start_trivia_${tournamentId}`)
        .setLabel("Start Tournament")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🚀"),
    );

    const message = await channel.send({ embeds: [embed], components: [row] });
    tournament.message = message;

    analytics.trackEvent("trivia_tournament_created", {
      tournamentId,
      category,
      channelId: channel.id,
    });

    return tournamentId;
  }

  /**
   * Generate trivia questions
   */
  async generateTriviaQuestions(category, count) {
    // In a real implementation, this would fetch from a trivia API
    const questions = [
      {
        question: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correct: 2,
        difficulty: "easy",
      },
      {
        question: "Which planet is known as the Red Planet?",
        options: ["Venus", "Mars", "Jupiter", "Saturn"],
        correct: 1,
        difficulty: "easy",
      },
      {
        question: "What is the largest mammal in the world?",
        options: ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
        correct: 1,
        difficulty: "medium",
      },
      {
        question: "In which year did World War II end?",
        options: ["1944", "1945", "1946", "1947"],
        correct: 1,
        difficulty: "medium",
      },
      {
        question: "What is the chemical symbol for gold?",
        options: ["Go", "Gd", "Au", "Ag"],
        correct: 2,
        difficulty: "hard",
      },
    ];

    // Shuffle and return requested count
    return questions.sort(() => Math.random() - 0.5).slice(0, count);
  }

  /**
   * Start AI Chess game
   */
  async startAIChess(channel, user, difficulty = "medium") {
    const gameId = `chess_${Date.now()}`;
    const game = {
      id: gameId,
      type: "ai_chess",
      channel,
      player: user,
      difficulty,
      board: this.initializeChessBoard(),
      currentTurn: "white",
      moveHistory: [],
      status: "active",
      startTime: Date.now(),
    };

    this.activeGames.set(gameId, game);

    const embed = new EmbedBuilder()
      .setTitle("♟️ AI Chess Match")
      .setDescription(
        `${user.username} vs AI (${difficulty})\n\nYou are playing as White. Make your move!`,
      )
      .setColor(0x8b4513)
      .addFields(
        { name: "Current Turn", value: "White (You)", inline: true },
        { name: "Difficulty", value: difficulty, inline: true },
        { name: "Moves", value: "0", inline: true },
      );

    const boardDisplay = this.renderChessBoard(game.board);
    embed.addFields({
      name: "Board",
      value: `\`\`\`\n${boardDisplay}\n\`\`\``,
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`chess_move_${gameId}`)
        .setLabel("Make Move")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("♟️"),
      new ButtonBuilder()
        .setCustomId(`chess_hint_${gameId}`)
        .setLabel("Get Hint")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("💡"),
      new ButtonBuilder()
        .setCustomId(`chess_resign_${gameId}`)
        .setLabel("Resign")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🏳️"),
    );

    const message = await channel.send({ embeds: [embed], components: [row] });
    game.message = message;

    analytics.trackEvent("ai_chess_started", {
      gameId,
      difficulty,
      playerId: user.id,
    });

    return gameId;
  }

  /**
   * Initialize chess board
   */
  initializeChessBoard() {
    return [
      ["r", "n", "b", "q", "k", "b", "n", "r"],
      ["p", "p", "p", "p", "p", "p", "p", "p"],
      [".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", "."],
      [".", ".", ".", ".", ".", ".", ".", "."],
      ["P", "P", "P", "P", "P", "P", "P", "P"],
      ["R", "N", "B", "Q", "K", "B", "N", "R"],
    ];
  }

  /**
   * Render chess board as text
   */
  renderChessBoard(board) {
    const pieces = {
      r: "♜",
      n: "♞",
      b: "♝",
      q: "♛",
      k: "♚",
      p: "♟",
      R: "♖",
      N: "♘",
      B: "♗",
      Q: "♕",
      K: "♔",
      P: "♙",
      ".": "·",
    };

    let display = "  a b c d e f g h\n";
    for (let i = 0; i < 8; i++) {
      display += `${8 - i} `;
      for (let j = 0; j < 8; j++) {
        display += pieces[board[i][j]] + " ";
      }
      display += `${8 - i}\n`;
    }
    display += "  a b c d e f g h";

    return display;
  }

  /**
   * Start word association chain game
   */
  async startWordChain(channel) {
    const gameId = `wordchain_${Date.now()}`;
    const game = {
      id: gameId,
      type: "word_chain",
      channel,
      participants: new Map(),
      words: [],
      currentWord: this.getRandomStartWord(),
      lastPlayer: null,
      timeLimit: 30000,
      status: "active",
      startTime: Date.now(),
    };

    this.activeGames.set(gameId, game);

    const embed = new EmbedBuilder()
      .setTitle("🔗 Word Association Chain")
      .setDescription(
        `Create a chain of associated words!\n\nCurrent word: **${game.currentWord}**\n\nType a word that relates to the current word. You have 30 seconds!`,
      )
      .setColor(0x9b59b6)
      .addFields(
        { name: "Chain Length", value: "1", inline: true },
        { name: "Participants", value: "0", inline: true },
        { name: "Time Left", value: "30s", inline: true },
      );

    const message = await channel.send({ embeds: [embed] });
    game.message = message;

    // Start countdown
    this.startWordChainTimer(gameId);

    analytics.trackEvent("word_chain_started", {
      gameId,
      startWord: game.currentWord,
      channelId: channel.id,
    });

    return gameId;
  }

  /**
   * Start collaborative story building
   */
  async startStoryBuilder(channel, theme = "adventure") {
    const gameId = `story_${Date.now()}`;
    const game = {
      id: gameId,
      type: "story_builder",
      channel,
      theme,
      story: [this.getStoryStarter(theme)],
      participants: new Map(),
      currentTurn: null,
      turnOrder: [],
      maxSentences: 20,
      status: "active",
      startTime: Date.now(),
    };

    this.activeGames.set(gameId, game);

    const embed = new EmbedBuilder()
      .setTitle("📚 Collaborative Story Builder")
      .setDescription(
        `Let's build a ${theme} story together!\n\n**Current Story:**\n${game.story[0]}\n\nReact with 📝 to join and add to the story!`,
      )
      .setColor(0xe67e22)
      .addFields(
        { name: "Theme", value: theme, inline: true },
        { name: "Sentences", value: `1/${game.maxSentences}`, inline: true },
        { name: "Writers", value: "0", inline: true },
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`join_story_${gameId}`)
        .setLabel("Join Story")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📝"),
      new ButtonBuilder()
        .setCustomId(`add_sentence_${gameId}`)
        .setLabel("Add Sentence")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✍️"),
    );

    const message = await channel.send({ embeds: [embed], components: [row] });
    game.message = message;

    analytics.trackEvent("story_builder_started", {
      gameId,
      theme,
      channelId: channel.id,
    });

    return gameId;
  }

  /**
   * Get random starting word for word chain
   */
  getRandomStartWord() {
    const words = [
      "ocean",
      "mountain",
      "forest",
      "city",
      "dream",
      "music",
      "adventure",
      "mystery",
      "friendship",
      "journey",
    ];
    return words[Math.floor(Math.random() * words.length)];
  }

  /**
   * Get story starter based on theme
   */
  getStoryStarter(theme) {
    const starters = {
      adventure:
        "The ancient map crackled in Sarah's hands as she stood at the edge of the forbidden forest.",
      mystery:
        "Detective Morgan stared at the locked room, knowing that the impossible had somehow happened.",
      fantasy:
        "The dragon's egg began to glow just as the last star faded from the dawn sky.",
      scifi:
        "Captain Chen received the distress signal from a planet that wasn't supposed to exist.",
      horror:
        "The old house had been empty for decades, but someone was definitely moving around upstairs.",
      romance:
        "Emma never believed in love at first sight until she collided with a stranger in the coffee shop.",
    };

    return starters[theme] || starters.adventure;
  }

  /**
   * Start word chain timer
   */
  startWordChainTimer(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game) return;

    setTimeout(async () => {
      if (game.status === "active") {
        await this.endWordChain(gameId, "timeout");
      }
    }, game.timeLimit);
  }

  /**
   * End word chain game
   */
  async endWordChain(gameId, reason = "completed") {
    const game = this.activeGames.get(gameId);
    if (!game) return;

    game.status = "ended";

    const embed = new EmbedBuilder()
      .setTitle("🔗 Word Chain Ended!")
      .setDescription(
        `The word chain has ended!\n\n**Final Chain:**\n${game.words.join(" → ")}\n\n**Chain Length:** ${game.words.length}`,
      )
      .setColor(0x95a5a6)
      .addFields(
        {
          name: "Reason",
          value: reason === "timeout" ? "Time ran out" : "Game completed",
          inline: true,
        },
        {
          name: "Participants",
          value: game.participants.size.toString(),
          inline: true,
        },
        {
          name: "Duration",
          value: `${Math.floor((Date.now() - game.startTime) / 1000)}s`,
          inline: true,
        },
      );

    await game.message.edit({ embeds: [embed], components: [] });

    analytics.trackEvent("word_chain_ended", {
      gameId,
      reason,
      chainLength: game.words.length,
      participants: game.participants.size,
      duration: Date.now() - game.startTime,
    });

    this.activeGames.delete(gameId);
  }

  /**
   * Process word chain input
   */
  async processWordChainInput(gameId, user, word) {
    const game = this.activeGames.get(gameId);
    if (!game || game.status !== "active") return false;

    // Prevent same user from playing twice in a row
    if (game.lastPlayer === user.id) {
      return false;
    }

    // Validate word association (simplified)
    if (this.isValidAssociation(game.currentWord, word)) {
      game.words.push(word);
      game.currentWord = word;
      game.lastPlayer = user.id;

      if (!game.participants.has(user.id)) {
        game.participants.set(user.id, {
          id: user.id,
          username: user.username,
          wordsAdded: 0,
        });
      }

      game.participants.get(user.id).wordsAdded++;

      // Update display
      await this.updateWordChainDisplay(game);

      // Reset timer
      this.startWordChainTimer(gameId);

      return true;
    }

    return false;
  }

  /**
   * Validate word association (simplified)
   */
  isValidAssociation(currentWord, newWord) {
    // In a real implementation, this would use NLP or a word association database
    // For now, just check that it's a valid word and not the same
    return (
      newWord.length > 1 && newWord.toLowerCase() !== currentWord.toLowerCase()
    );
  }

  /**
   * Update word chain display
   */
  async updateWordChainDisplay(game) {
    const embed = new EmbedBuilder()
      .setTitle("🔗 Word Association Chain")
      .setDescription(
        `Current word: **${game.currentWord}**\n\n**Chain so far:**\n${game.words.slice(-10).join(" → ")}\n\nNext player, add a related word!`,
      )
      .setColor(0x9b59b6)
      .addFields(
        {
          name: "Chain Length",
          value: game.words.length.toString(),
          inline: true,
        },
        {
          name: "Participants",
          value: game.participants.size.toString(),
          inline: true,
        },
        { name: "Time Left", value: "30s", inline: true },
      );

    await game.message.edit({ embeds: [embed] });
  }

  /**
   * Get game statistics
   */
  getGameStats(gameId) {
    const game = this.activeGames.get(gameId) || this.tournaments.get(gameId);
    if (!game) return null;

    return {
      id: game.id,
      type: game.type,
      status: game.status,
      participants: game.participants?.size || game.players?.size || 0,
      duration: Date.now() - game.startTime,
      startTime: game.startTime,
    };
  }

  /**
   * Get active games for a channel
   */
  getChannelGames(channelId) {
    const games = [];

    for (const game of this.activeGames.values()) {
      if (game.channel.id === channelId && game.status === "active") {
        games.push(this.getGameStats(game.id));
      }
    }

    for (const tournament of this.tournaments.values()) {
      if (
        tournament.channel.id === channelId &&
        tournament.status !== "ended"
      ) {
        games.push(this.getGameStats(tournament.id));
      }
    }

    return games;
  }

  /**
   * End any game
   */
  async endGame(gameId, reason = "manual") {
    const game = this.activeGames.get(gameId) || this.tournaments.get(gameId);
    if (!game) return false;

    game.status = "ended";

    analytics.trackEvent("game_ended", {
      gameId,
      type: game.type,
      reason,
      duration: Date.now() - game.startTime,
    });

    // Clean up
    this.activeGames.delete(gameId);
    this.tournaments.delete(gameId);

    return true;
  }
}

export const advancedGames = new AdvancedGamesManager();
