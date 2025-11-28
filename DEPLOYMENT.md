# 🚀 BotBot v2 Deployment Guide

This guide covers deploying BotBot to production environments.

## 📋 Pre-Deployment Checklist

### 1. Discord Bot Setup
- [ ] Create Discord application at https://discord.com/developers/applications
- [ ] Create bot user and copy the token
- [ ] Copy the Client ID from the application
- [ ] Invite bot to your server with appropriate permissions

### 2. Environment Variables
Set these environment variables in your deployment platform:

```bash
# Required
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here

# Optional
NODE_ENV=production
DB_PATH=./data/botbot.db
LOG_LEVEL=info
PORT=3000
OPENAI_API_KEY=sk-your-key  # For LLM features
```

### 3. Bot Permissions
Your bot needs these Discord permissions:
- Send Messages
- Read Message History
- Add Reactions
- Use Slash Commands (optional)
- Manage Messages (for games/moderation)

---

## 🐳 Docker (Recommended)

Docker is the **primary and recommended** deployment method for BotBot v2.

### Quick Start

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Manual Docker Build

```bash
# Build image
docker build -t botbot:latest .

# Run container
docker run -d \
  --name botbot \
  -e DISCORD_TOKEN=your_token \
  -e CLIENT_ID=your_client_id \
  -v botbot-data:/app/data \
  botbot:latest
```

### Docker Compose Configuration

The `docker-compose.yml` provides:
- ✅ Automatic restarts
- ✅ Persistent data volume
- ✅ Environment variable management
- ✅ Health checks

---

## 🌐 Alternative Platforms (Legacy)

> **Note**: These deployment methods are maintained for backwards compatibility but Docker is preferred.

### Railway
```bash
npm i -g @railway/cli
railway up
```
**Configuration**: Uses `railway.json`

### Render
Connect GitHub repo to Render dashboard. Auto-deploys using `render.yaml`.

### Vercel
```bash
npm i -g vercel
vercel --prod
```
**Configuration**: Uses `vercel.json`
- Best for web interface only
- Not recommended for persistent bot processes

### Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod
```
**Configuration**: Uses `netlify.toml`
- Best for web interface only
- Not recommended for persistent bot processes

---

## 🔧 Local Development

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
# Then run:
npm run dev
```

---

## 🏥 Health Checks

Run health check before deployment:
```bash
npm run health-check
```

This verifies:
- ✅ Environment variables
- ✅ Critical files exist
- ✅ Database configuration
- ✅ Discord connection (if token provided)

---

## 🔒 Security

- Never commit `.env` files
- Use environment variables for secrets
- Regularly rotate Discord tokens
- Monitor bot permissions
- The `.dockerignore` excludes sensitive files from builds

---

## 🐛 Troubleshooting

### Common Issues

**Bot not responding:**
- Check Discord token is correct
- Verify bot has message permissions
- Ensure bot is online in Discord

**Database errors:**
- Check file permissions
- Verify database path is writable
- Run database migrations: `npm run db:migrate`

**Docker issues:**
- Check container logs: `docker logs botbot`
- Verify volume mounts
- Ensure ports are not in use

---

**Need help?** Check the logs, run health checks, and verify environment variables!
