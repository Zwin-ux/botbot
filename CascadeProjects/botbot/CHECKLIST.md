# BotBot Setup Checklist

Use this checklist to track your setup progress.

## Pre-Setup

- [ ] Node.js 20+ installed (`node --version`)
- [ ] npm 10+ installed (`npm --version`)
- [ ] Git installed
- [ ] Text editor ready (VS Code recommended)
- [ ] Discord account created
- [ ] Credit card ready (for OpenAI, optional for Supabase/Upstash free tiers)

## Service Signups

- [ ] Supabase account created at [supabase.com](https://supabase.com)
- [ ] Upstash account created at [upstash.com](https://upstash.com)
- [ ] OpenAI account created at [platform.openai.com](https://platform.openai.com)
- [ ] Discord Developer Portal accessed at [discord.com/developers](https://discord.com/developers)

## Supabase Setup

- [ ] New project created
- [ ] Database password saved securely
- [ ] pgvector extension enabled (`CREATE EXTENSION vector;`)
- [ ] Connection pooling URL copied
- [ ] Direct connection URL copied
- [ ] Both URLs added to `.env`

## Upstash Setup

- [ ] New Redis database created
- [ ] Region selected (same as Supabase recommended)
- [ ] REST URL copied
- [ ] URL added to `.env` as `REDIS_URL`

## OpenAI Setup

- [ ] API key created
- [ ] Key saved securely (starts with `sk-`)
- [ ] Usage limit set (optional but recommended)
- [ ] Key added to `.env` as `OPENAI_API_KEY`

## Discord Setup

### Application Creation
- [ ] New application created in Developer Portal
- [ ] Application name set (e.g., "BotBot")
- [ ] Application icon uploaded (optional)

### Bot Configuration
- [ ] Bot created ("Bot" tab → "Add Bot")
- [ ] MESSAGE CONTENT INTENT enabled
- [ ] PRESENCE INTENT enabled (optional)
- [ ] SERVER MEMBERS INTENT enabled (optional)
- [ ] Bot token copied
- [ ] Token added to `.env` as `DISCORD_TOKEN`

### OAuth2 Configuration
- [ ] Client ID copied
- [ ] Client ID added to `.env` as `DISCORD_CLIENT_ID`
- [ ] Client Secret copied
- [ ] Client Secret added to `.env` as `DISCORD_CLIENT_SECRET`
- [ ] Redirect URI added: `http://localhost:3000/api/auth/callback`

### Application Info
- [ ] Public Key copied from "General Information"
- [ ] Public Key added to `.env` as `DISCORD_PUBLIC_KEY`

### Bot Invitation
- [ ] Invite URL generated (OAuth2 → URL Generator)
- [ ] Scopes selected: `bot`, `applications.commands`
- [ ] Permissions selected: Send Messages, Read Message History
- [ ] Bot invited to test server

## Project Setup

### Clone & Install
- [ ] Repository cloned (or in correct directory)
- [ ] `npm install` completed successfully
- [ ] No error messages during install

### Environment Configuration
- [ ] `.env.example` copied to `.env`
- [ ] All Discord variables filled in
- [ ] All OpenAI variables filled in
- [ ] All database variables filled in
- [ ] Redis URL filled in
- [ ] NEXTAUTH_SECRET generated (`openssl rand -base64 32`)
- [ ] All variables validated (no placeholder text remaining)

### Database Migration
- [ ] `npm run db:generate` completed
- [ ] `npm run db:push` completed
- [ ] No errors in Prisma output
- [ ] Supabase dashboard shows new tables

## First Run

### Start Development Servers
- [ ] `npm run dev` executed
- [ ] No error messages in console
- [ ] Discord bot shows "Logged in as [BotName]"
- [ ] Web app shows "ready" message
- [ ] Web app accessible at http://localhost:3000

### Test Discord Bot
- [ ] Go to Discord server with bot
- [ ] Send: `@BotBot help`
- [ ] Bot responds with help message
- [ ] Send: `@BotBot adopt a curious scientist named Atlas`
- [ ] Bot responds confirming adoption
- [ ] Send: `Hey Atlas, hello!`
- [ ] Bot responds conversationally
- [ ] Send: `@BotBot remember that I love coding`
- [ ] Bot confirms memory saved
- [ ] Send: `@BotBot what do you remember?`
- [ ] Bot lists saved memory

### Test Web App
- [ ] Open http://localhost:3000
- [ ] Landing page loads correctly
- [ ] Click "Enter Garden"
- [ ] See "Atlas" agent in grid
- [ ] Agent card shows correct info
- [ ] No console errors in browser

## Production Deployment (Optional)

### Discord Bot Deployment
- [ ] Railway/Render account created
- [ ] New project created
- [ ] GitHub repo connected
- [ ] Environment variables set
- [ ] Bot deployed successfully
- [ ] Bot online 24/7

### Web App Deployment
- [ ] Vercel account created
- [ ] New project created
- [ ] GitHub repo connected
- [ ] Environment variables set
- [ ] App deployed successfully
- [ ] Custom domain configured (optional)

### Post-Deployment
- [ ] Production URLs updated in `.env`
- [ ] Discord redirect URIs updated
- [ ] Bot tested in production
- [ ] Web app tested in production
- [ ] All features working

## Documentation Review

- [ ] `README.md` read
- [ ] `QUICKSTART.md` followed
- [ ] `SETUP.md` referenced for troubleshooting
- [ ] `ARCHITECTURE.md` skimmed (for understanding)
- [ ] `PROJECT_SUMMARY.md` reviewed

## Optional Enhancements

- [ ] Custom system prompts added (`packages/shared/src/constants.ts`)
- [ ] Custom mood presets added
- [ ] Blocklist configured
- [ ] Rate limits adjusted
- [ ] Custom Discord bot avatar uploaded
- [ ] Custom favicon for web app
- [ ] Analytics configured

## Troubleshooting Checklist

If something doesn't work, check:

### Bot Not Responding
- [ ] MESSAGE CONTENT INTENT is enabled
- [ ] Bot has "Send Messages" permission
- [ ] DISCORD_TOKEN is correct
- [ ] Bot is online in server member list
- [ ] Console shows no errors

### Database Errors
- [ ] DATABASE_URL format is correct
- [ ] Password contains no special characters that need encoding
- [ ] pgvector extension is enabled
- [ ] Prisma migration completed
- [ ] Supabase project is active

### Memory Not Working
- [ ] OpenAI API key is valid
- [ ] OpenAI account has credits
- [ ] pgvector extension is installed
- [ ] Embeddings are being generated (check OpenAI usage)

### Rate Limiting Issues
- [ ] Redis URL is correct
- [ ] Upstash database is active
- [ ] Connection from your IP is allowed

### Web App Errors
- [ ] All environment variables are set
- [ ] NEXT_PUBLIC_APP_URL is correct
- [ ] Port 3000 is not in use
- [ ] `npm run dev --filter=@botbot/web` shows no errors

## Success Criteria

You're done when:

- ✅ Bot responds to Discord messages
- ✅ Agent can be adopted
- ✅ Conversations work
- ✅ Memories are saved and retrieved
- ✅ Web garden shows agents
- ✅ No errors in console
- ✅ All features tested

## Next Steps After Setup

1. **Explore Features**:
   - Try different agent personas
   - Test memory system
   - Experiment with moods

2. **Customize**:
   - Edit system prompts
   - Add custom tools
   - Modify UI

3. **Scale**:
   - Deploy to production
   - Invite to multiple servers
   - Monitor usage

4. **Enhance**:
   - Add Discord OAuth
   - Implement WebSockets
   - Build more tools

## Getting Help

If stuck:

1. Check error messages in console
2. Review relevant documentation
3. Verify environment variables
4. Check service dashboards (Supabase, Upstash, OpenAI)
5. Search GitHub Issues
6. Ask in community Discord

## Estimated Time

- **Quick Setup** (using QUICKSTART.md): 10-15 minutes
- **Full Setup** (using SETUP.md): 30-45 minutes
- **Production Deployment**: 15-30 minutes
- **Total**: 1-2 hours for complete setup

---

**Pro Tip**: Do the quick setup first to test everything, then deploy to production later.

Good luck! 🚀
