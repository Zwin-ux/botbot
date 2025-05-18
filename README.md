# BotBot - Discord Listening Bot
![assisntat](https://github.com/user-attachments/assets/f6f5567e-2fff-4742-8534-99cb10153d33)

A minimal, message-driven Discord bot for tracking projects and pinging reminders—no slash commands.

## Project Overview

This bot helps track personal and team projects. It accepts reminders and todos via regular chat messages, uses buttons and emoji for interaction, and pings users at set or random intervals to keep them on track.

**Key Principles:**

- No `/commands`. All actions via messages, buttons, emoji.
- Fast, human, "team buddy" energy.
- Occasional, not spammy. Motivational nudges, not nagging.
- Easy to self-host and hack on.

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

## Bot Interaction Flow

(Refer to the original design document for detailed interaction flows.)

-   **Add Reminder**: Type a message like `remindme finish report tomorrow`.
-   **Mark Done / Snooze / Delete**: Use buttons or emoji on the bot's confirmation message.
-   **Daily/Weekly Ping**: Automated DMs or channel posts with open reminders.
-   **List Reminders**: Type `list projects` or `show todos`.

## Implementation Roadmap (MVP)

1.  ✅ Set up Node.js project with discord.js, SQLite, and basic config.
2.   ✅ Implement message listener for "remindme" and "todo" patterns (store to SQLite).
3.  Build daily/weekly scheduled reminder with `node-cron`.
4.   Add message component buttons to reminders ("Done," "Snooze," "Delete").
5.  Implement motivational nudge logic.
6.  Polish regex, confirm informal language works, and refine UX.
7.  Deploy (e.g., Glitch, Replit, Railway).

