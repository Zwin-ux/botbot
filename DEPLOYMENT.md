# 🚀 BotBot Deployment Guide

This guide covers deploying BotBot Discord bot to various cloud platforms.

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
```

### 3. Bot Permissions
Your bot needs these Discord permissions:
- Send Messages
- Read Message History
- Add Reactions
- Use Slash Commands (optional)
- Manage Messages (for games/moderation)

## 🌐 Platform-Specific Deployment

### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
npm run deploy:vercel
```

**Configuration**: Uses `vercel.json`
- ✅ Serverless functions
- ✅ Automatic scaling
- ✅ Environment variables via dashboard

### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
npm run deploy:netlify
```

**Configuration**: Uses `netlify.toml`
- ✅ Functions support
- ✅ Continuous deployment
- ✅ Environment variables via dashboard

### Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
npm run deploy:railway
```

**Configuration**: Uses `railway.json`
- ✅ Always-on hosting
- ✅ Database support
- ✅ Automatic deployments

### Render
```bash
# Connect GitHub repo to Render dashboard
# Render will auto-deploy using render.yaml
```

**Configuration**: Uses `render.yaml`
- ✅ Free tier available
- ✅ Persistent storage
- ✅ Auto-deploy from Git

### Heroku
```bash
# Install Heroku CLI
npm i -g heroku

# Create app and deploy
heroku create your-botbot-app
git push heroku main
```

**Configuration**: Add `Procfile`:
```
web: npm start
```

## 🔧 Environment Setup

### Local Development
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
# Then run:
npm run dev
```

### Production Environment
Set these variables in your platform's dashboard:
- `DISCORD_TOKEN` - Your bot token
- `CLIENT_ID` - Your Discord application ID
- `NODE_ENV=production`

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

## 🎯 Natural Language Features

BotBot includes these NLP capabilities:
- **Intent Recognition**: Understands greetings, reminders, help requests
- **Wake Word Detection**: Responds to "hey bot", "botbot", etc.
- **Time Parsing**: Processes "in 5 minutes", "tomorrow at 3pm"
- **Multi-language Support**: English, Spanish, French
- **Context Awareness**: Maintains conversation state

## 🎮 Available Features

- **Reminders**: Natural language reminder setting
- **Team Games**: Emoji races, trivia, story building
- **Standups**: Structured team standup meetings
- **Retrospectives**: Team retrospective facilitation
- **Help System**: Contextual help and guidance

## 🐛 Troubleshooting

### Common Issues

**Bot not responding:**
- Check Discord token is correct
- Verify bot has message permissions
- Ensure bot is online in Discord

**Database errors:**
- Check file permissions
- Verify database path is writable
- Run database migrations

**Memory issues:**
- Monitor memory usage
- Consider upgrading plan
- Check for memory leaks

### Logs and Monitoring

Check platform-specific logs:
- **Vercel**: Functions tab in dashboard
- **Netlify**: Functions logs
- **Railway**: Deployment logs
- **Render**: Service logs

## 📊 Performance Tips

1. **Database**: Use persistent storage for production
2. **Memory**: Monitor memory usage and optimize
3. **Scaling**: Most platforms auto-scale
4. **Caching**: Bot includes built-in caching

## 🔒 Security

- Never commit `.env` files
- Use environment variables for secrets
- Regularly rotate Discord tokens
- Monitor bot permissions

## 📈 Monitoring

Set up monitoring for:
- Bot uptime
- Response times
- Error rates
- Memory usage
- Database performance

## 🎉 Post-Deployment

After successful deployment:
1. Test bot in Discord server
2. Verify all features work
3. Monitor logs for errors
4. Set up alerts/monitoring
5. Document any custom configurations

---

**Need help?** Check the logs, run health checks, and verify environment variables!
