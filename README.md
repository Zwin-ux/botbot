# BotBot - Discord Listening Bot
![botbot](https://github.com/user-attachments/assets/f6f5567e-2fff-4742-8534-99cb10153d33)

A comprehensive Discord bot for team productivity, featuring reminders, standups, retrospectives, interactive games, and project management tools.

## Project Overview

This bot enhances team collaboration and productivity. It accepts reminders and todos via regular chat messages, uses buttons and emoji for interaction, facilitates standups and retrospectives, and helps teams stay organized with categorized tasks and voting.

**Key Principles:**

- Natural language interface with minimal commands
- Interactive team collaboration features
- Multi-channel reminders and personal summaries
- Structured standup and retrospective workflows
- Community engagement through voting and categories

## Tech Stack

- **Language**: Node.js
- **Library**: discord.js v14+
- **Database**: SQLite
- **Scheduler**: node-cron

## Getting Started

1.  **Clone the repository (or set up project files).**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Configure your bot:**
    *   Create a `.env` file in the root directory.
    *   Add your Discord Bot Token to the `.env` file:
        ```
        DISCORD_TOKEN=your_bot_token_here
        ```
    *   You'll also need to provide your `CLIENT_ID` and `GUILD_ID` if you plan to register slash commands (though this bot aims to avoid them, it's good for future reference or other bot features).
        ```
        CLIENT_ID=your_client_id_here
        GUILD_ID=your_guild_id_here 
        ```
4.  **Run the bot:**
    ```bash
    npm start
    ```

## Features

### 🎮 Games

BotBot includes fun, interactive games to engage your server members. All games support natural language commands and include rate limiting to prevent spam.

#### Available Games

1. **Emoji Race**
   - Race to type the correct emoji sequence as fast as you can
   - Start with: `start emoji race`
   - Compete against others for the fastest time

2. **Story Builder**
   - Collaborative storytelling where each player adds one word at a time
   - Start with: `start story builder`
   - Watch as your story takes unexpected turns

3. **Who Said It**
   - Guess which server member said a particular quote
   - Start with: `start who said it`
   - Test your knowledge of your server members

### Game Commands

- `start [game name]` - Start a new game (e.g., `start emoji race`)
- `join` - Join the current game in your channel
- `end game` - End the current game (game starter or admin only)
- `game help` - Show game commands and descriptions

### Game Rules & Tips

- Games are limited to 3 starts per minute per user to prevent spam
- Only the game starter or server admins can end a game
- Some games may have player limits (check game-specific help for details)
- Use reactions to interact with game prompts when available

### Reminder System

- **Natural Language Processing**: Type a message like `remind me to finish report tomorrow` or `todo add meeting notes`.
- **Interactive Controls**: Use buttons or emoji reactions to mark reminders as done, snooze, or delete them.
- **Categories & Tags**: Organize reminders with categories using emoji tags (e.g., 🚀 for high priority).
- **Voting**: React to reminders with various emoji to vote on their priority.
- **Personal Summaries**: Get daily DMs with your upcoming tasks.

### Daily Standups

- **Scheduled Prompts**: Automatic daily standup prompts in your team channel.
- **Structured Responses**: Interactive forms for team members to submit what they did yesterday, what they're working on today, and any blockers.
- **Summary Generation**: Compile team responses into a comprehensive summary with action items.
- **Example**: `!standup setup #team-channel 09:30` to schedule a daily standup.

### Team Retrospectives

- **Regular Reflection**: Schedule weekly, biweekly, or monthly retrospective sessions.
- **Anonymous Feedback**: Option for team members to submit feedback anonymously.
- **Structured Format**: Collect input on what went well, what could improve, and action items.
- **Example**: `!retro setup weekly #team-channel friday 16:00` to schedule a weekly retrospective.

## Command Reference

##### 🤖 How I Can Help You

I’m your friendly reminder and to-do buddy! Just chat with me naturally—no special commands or symbols needed.


### Standup Commands

- `setup standup in #channel at [time]` - Schedule daily standups
  - Example: `setup standup in #team-standup at 9:30am`
- `start standup` - Manually start a standup session
- `standup list` - List all active standups
- `standup summary` - Get a summary of responses
- `end standup` - End the current standup session

### Retrospective Commands

- `schedule retro [frequency] in #channel on [day] at [time]` - Schedule retrospectives
  - Example: `schedule retro weekly in #retro on fridays at 4pm`
- `start retro` - Manually start a retrospective session
- `retro list` - List all active retrospectives
- `retro summary` - Get a summary of feedback
- `end retro` - End the current retrospective

### Game Commands

- `start emoji race` - Start an emoji reaction race game
  - First to react with the correct sequence of emojis wins!
  - Commands during game:
    - `join` - Join the game
    - `end game` - End the game (moderators only)

- `start story` - Start a collaborative story building game
  - Take turns adding sentences to create a story together
  - Commands during game:
    - `join` - Join the game
    - `start` - Begin the game after players have joined
    - `end game` - End the game early (moderators only)

- `start who said it` - Start a quote guessing game
  - Guess who said the famous quote
  - Features:
    - Automatic hints if no one guesses correctly
    - Multiple difficulty levels
  - Commands during game:
    - `skip` - Skip the current quote (moderators only)
    - `end game` - End the game (moderators only)

- `games` - Show available games and commands

### Help Commands

- `help` - Show main help menu
- `reminder help` - Show reminder commands
- `standup help` - Show standup commands
- `retro help` - Show retrospective commands
- `game help` - Show game commands

## Implementation Status

1. ✅ Core game system with rate limiting and input validation
2. ✅ Multiple game types (Emoji Race, Story Builder, Who Said It)
3. ✅ Game help and documentation
4. ✅ Core reminder system with natural language processing
5. ✅ Interactive controls (buttons, emoji reactions)
6. ✅ Categories and voting functionality
7. ✅ Daily/weekly scheduled reminders with `node-cron`
8. ✅ Daily standup meeting support
9. ✅ Team retrospective functionality
10. ✅ Personal summary notifications
11. ✅ Message persistence across restarts
12. ✅ Error handling and logging
13. ✅ Comprehensive test coverage
14. ✅ Documentation and examples

## Usage Tips

- Most commands work in natural language - just type what you want to do!
- Use `@BotBot help` in any channel for quick assistance
- Games have a cooldown of 1 hour per channel to prevent spam
- All games support both text commands and button interactions where applicable

## Support

For support or to report issues, please [open an issue](https://github.com/yourusername/botbot/issues) on GitHub.

