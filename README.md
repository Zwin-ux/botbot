# BotBot - Discord Listening Bot
![assisntat](https://github.com/user-attachments/assets/f6f5567e-2fff-4742-8534-99cb10153d33)

A comprehensive Discord bot for team productivity, featuring reminders, standups, retrospectives, and project management tools.

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

### Reminder Commands

- `remind me to [task] [time]` - Create a new reminder
- `todo [task]` - Create a quick todo without a specific time
- `show my reminders` - View all your reminders
- `show today's reminders` - See just today's tasks
- `subscribe 🚀` - Subscribe to a category

### Standup Commands

- `!standup setup [channel] [time]` - Schedule daily standups
- `!standup start` - Manually start a standup session
- `!standup list` - List all active standups
- `!standup summary [id]` - Get a summary of responses

### Retrospective Commands

- `!retro setup [frequency] [channel] [day] [time]` - Schedule retrospectives
- `!retro start` - Manually start a retrospective session
- `!retro list` - List all active retrospectives
- `!retro summary [id]` - Get a summary of feedback

## Implementation Status

1. ✅ Core reminder system with natural language processing
2. ✅ Interactive controls (buttons, emoji reactions)
3. ✅ Categories and voting functionality
4. ✅ Daily/weekly scheduled reminders with `node-cron`
5. ✅ Daily standup meeting support
6. ✅ Team retrospective functionality
7. ✅ Personal summary notifications
8. ⏳ Advanced analytics and reporting
9. ⏳ External integrations (GitHub, Jira, etc.)

