# Deployment Guide (Railway)

This repository contains two distinct applications:
1.  **BotBot (Discord Bot)**: Runs on Node.js.
2.  **Marketing Site (Web App)**: Runs on Next.js.

To deploy "everything" to Railway, you should create **two separate services** from this same repository.

## 1. Deploying the Bot

The bot uses the `Dockerfile` in the root directory.

1.  **New Service** -> **GitHub Repo** -> Select `botbot`.
2.  Railway will automatically detect the `Dockerfile`.
3.  **Variables**: Add your environment variables:
    *   `DISCORD_TOKEN`
    *   `OPENAI_API_KEY`
    *   (Any other bot secrets)
4.  **Deploy**.

## 2. Deploying the Web App

The web app uses Next.js and should be deployed using Nixpacks (Railway's default builder).

1.  **New Service** -> **GitHub Repo** -> Select `botbot`.
2.  **Settings** -> **Build & Deploy**:
    *   **Builder**: Select `Nixpacks`.
    *   **Build Command**: `npm run web:build`
    *   **Start Command**: `npm run web:start`
3.  **Variables**:
    *   `NEXT_PUBLIC_DISCORD_INVITE_URL`
    *   `NEXT_PUBLIC_SUPPORT_SERVER_URL`
4.  **Networking**:
    *   Generate a domain (e.g., `botbot-web.up.railway.app`).
5.  **Deploy**.

## Directory Structure

*   `src/index.js`: Entry point for the Bot.
*   `src/pages/`: Entry point for the Web App.
*   `Dockerfile`: Configuration for the Bot container.
*   `package.json`: Scripts for both (`start` for bot, `web:start` for web).
