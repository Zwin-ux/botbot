# 🚀 Deploy BotBot to Render

## Quick Deployment Steps

### 1. Push Your Code to GitHub
```bash
git add .
git commit -m "Fix Docker build for Render deployment"
git push origin main
```

### 2. Create Render Service
1. Go to [render.com](https://render.com) and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `Zwin-ux/botbot`
4. Configure the service:
   - **Name**: `botbot-discord`
   - **Environment**: `Docker`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Build Command**: (leave empty - Docker handles this)
   - **Start Command**: (leave empty - Docker handles this)

### 3. Set Environment Variables
In Render dashboard, add these environment variables:

**Required:**
- `DISCORD_TOKEN` = `your_discord_bot_token_here`
- `CLIENT_ID` = `your_discord_client_id_here`

**Optional:**
- `NODE_ENV` = `production`
- `LOG_LEVEL` = `info`
- `DB_PATH` = `/app/data/botbot.db`

### 4. Deploy
- Click "Create Web Service"
- Render will automatically build and deploy your bot
- Monitor the build logs for any issues

## Discord Bot Setup

### Get Your Bot Token
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select existing one
3. Go to "Bot" section
4. Copy the "Token" (this is your `DISCORD_TOKEN`)
5. Copy the "Application ID" from General Information (this is your `CLIENT_ID`)

### Bot Permissions
Your bot needs these permissions:
- Send Messages
- Read Message History
- Use Slash Commands
- Add Reactions
- Embed Links

### Invite Bot to Server
Use this URL (replace `YOUR_CLIENT_ID`):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147483648&scope=bot%20applications.commands
```

## Render Configuration

The `render.yaml` file is already configured with:
- ✅ Docker build environment
- ✅ Health checks
- ✅ Auto-deploy on push
- ✅ Environment variable setup
- ✅ Proper restart policies

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Ensure all environment variables are set
- Verify Docker build works locally: `docker build -t botbot .`

### Bot Doesn't Respond
- Check service logs in Render dashboard
- Verify `DISCORD_TOKEN` and `CLIENT_ID` are correct
- Ensure bot is invited to your Discord server
- Check bot has proper permissions

### Database Issues
- Database will be created automatically on first run
- Data persists in `/app/data/` directory
- For persistent storage, consider Render's disk storage

## Monitoring

- **Health Check**: Automatic via Docker HEALTHCHECK
- **Logs**: Available in Render dashboard
- **Metrics**: Monitor CPU/Memory usage in Render
- **Uptime**: Render provides 99.9% uptime SLA

## Next Steps After Deployment

1. **Test the bot** in your Discord server
2. **Monitor logs** for any errors
3. **Set up alerts** in Render dashboard
4. **Scale if needed** (upgrade plan for more resources)

## Support

- **Render Docs**: https://render.com/docs
- **Discord.js Guide**: https://discordjs.guide/
- **BotBot Issues**: Check GitHub repository issues

---

🎉 **Your BotBot is now ready for production on Render!**
