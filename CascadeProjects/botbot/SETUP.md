# Detailed Setup Guide

This guide walks you through setting up BotBot from scratch.

## 1. Supabase Setup

### Create Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and region
4. Set database password (save this!)
5. Wait for project to be created

### Enable pgvector Extension

1. Go to "SQL Editor" in Supabase dashboard
2. Click "New Query"
3. Paste and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Get Database URLs

1. Go to "Project Settings" → "Database"
2. Scroll to "Connection string"
3. Copy both:
   - **Connection pooling** (for `DATABASE_URL`)
   - **Direct connection** (for `DIRECT_URL`)
4. Replace `[YOUR-PASSWORD]` with your actual password

### Setup Row Level Security (Optional but Recommended)

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write their own data
CREATE POLICY "Users can manage their own agents"
ON agents FOR ALL
USING (auth.uid()::text = owner_user_id);

CREATE POLICY "Users can manage their own memories"
ON memories FOR ALL
USING (
  user_id IN (
    SELECT id FROM users WHERE auth.uid()::text = discord_id
  )
);
```

## 2. Redis Setup (Upstash)

### Create Database

1. Go to [upstash.com](https://upstash.com)
2. Click "Create Database"
3. Choose a name (e.g., "botbot-redis")
4. Select region closest to your Supabase region
5. Click "Create"

### Get Connection URL

1. Go to database details
2. Scroll to "REST API"
3. Copy "UPSTASH_REDIS_REST_URL"
4. Use this as your `REDIS_URL`

## 3. OpenAI Setup

### Get API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Click "API Keys" in sidebar
3. Click "Create new secret key"
4. Name it "BotBot"
5. Copy the key (starts with `sk-`)
6. Save it securely - you won't see it again!

### Set Usage Limits (Recommended)

1. Go to "Settings" → "Limits"
2. Set a monthly budget (e.g., $10)
3. Enable email notifications for usage

### Pricing Note

Estimated costs for moderate usage:
- GPT-4-turbo: ~$0.01 per conversation
- text-embedding-3-large: ~$0.13 per 1M tokens
- Expected: ~$5-20/month for 100 daily active users

## 4. Discord Application Setup

### Create Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "BotBot" (or your preferred name)
4. Accept ToS and click "Create"

### Create Bot

1. Go to "Bot" tab in sidebar
2. Click "Add Bot" → "Yes, do it!"
3. Under "Privileged Gateway Intents", enable:
   - ✅ PRESENCE INTENT
   - ✅ SERVER MEMBERS INTENT
   - ✅ MESSAGE CONTENT INTENT
4. Click "Save Changes"
5. Under "Token", click "Reset Token"
6. Copy the token (this is your `DISCORD_TOKEN`)
7. Save it securely!

### Configure OAuth2

1. Go to "OAuth2" tab
2. Under "Redirects", add:
   - `http://localhost:3000/api/auth/callback` (for local dev)
   - `https://yourdomain.com/api/auth/callback` (for production)
3. Copy "CLIENT ID" (this is your `DISCORD_CLIENT_ID`)
4. Copy "CLIENT SECRET" (this is your `DISCORD_CLIENT_SECRET`)

### Get Public Key

1. Go to "General Information" tab
2. Copy "PUBLIC KEY" (this is your `DISCORD_PUBLIC_KEY`)

### Generate Bot Invite Link

1. Go to "OAuth2" → "URL Generator"
2. Select scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Select bot permissions:
   - ✅ Send Messages
   - ✅ Send Messages in Threads
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ Add Reactions
   - ✅ Use Slash Commands
4. Copy the generated URL
5. Open it in browser to invite bot to your server

## 5. Environment Configuration

Create `.env` file in project root:

```bash
# Discord
DISCORD_TOKEN=your_bot_token_from_step_4
DISCORD_CLIENT_ID=your_client_id_from_step_4
DISCORD_CLIENT_SECRET=your_client_secret_from_step_4
DISCORD_PUBLIC_KEY=your_public_key_from_step_4
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/callback

# OpenAI
OPENAI_API_KEY=sk-your-api-key-from-step-3
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDING_MODEL=text-embedding-3-large

# Database (Supabase)
DATABASE_URL=your_connection_pooling_url_from_step_1
DIRECT_URL=your_direct_connection_url_from_step_1

# Redis (Upstash)
REDIS_URL=your_redis_url_from_step_2

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=run: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

### Generate NextAuth Secret

On Mac/Linux:
```bash
openssl rand -base64 32
```

On Windows (PowerShell):
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

Paste the output as `NEXTAUTH_SECRET`.

## 6. Install Dependencies and Run

```bash
# Install all packages
npm install

# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Start development servers
npm run dev
```

You should see:
- Discord bot: "Logged in as BotBot#1234"
- Web app: Running on http://localhost:3000

## 7. Test the Bot

### In Discord

1. Go to server where you invited the bot
2. Mention the bot:
   ```
   @BotBot adopt a curious scientist named Atlas
   ```
3. You should get a response confirming agent creation
4. Try chatting:
   ```
   Hey Atlas, hello!
   ```

### On Web

1. Open http://localhost:3000
2. Click "Enter Garden"
3. You should see your agent "Atlas" in the garden

## 8. Production Deployment

### Deploy Discord Bot

**Railway:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Add environment variables in Railway dashboard
# Deploy
railway up
```

**Render:**
1. Connect your GitHub repo
2. Create a new "Web Service"
3. Build command: `npm run build --filter=@botbot/bot`
4. Start command: `npm run start --filter=@botbot/bot`
5. Add environment variables

### Deploy Web App

**Vercel:**
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

### Update Environment Variables

After deployment:
1. Update `NEXT_PUBLIC_APP_URL` to your production URL
2. Update `NEXTAUTH_URL` to your production URL
3. Update `DISCORD_REDIRECT_URI` to your production URL
4. Add the production redirect URI in Discord Developer Portal

## Troubleshooting

### Bot Not Responding

- Check bot has MESSAGE CONTENT intent enabled
- Verify bot has "Send Messages" permission in channel
- Check console for errors
- Ensure `.env` has correct `DISCORD_TOKEN`

### Database Connection Error

- Check DATABASE_URL format: `postgresql://user:password@host:port/database`
- Ensure pgvector extension is enabled
- Try `npm run db:push` again

### Memory Search Not Working

- Verify pgvector extension: `SELECT * FROM pg_extension WHERE extname = 'vector';`
- Check embeddings are being generated (check OpenAI API usage)
- Ensure OPENAI_API_KEY is correct

### Rate Limiting Issues

- Check Redis connection
- Verify REDIS_URL is correct
- Test Redis: `redis-cli -u $REDIS_URL ping`

## Next Steps

- Read [README.md](./README.md) for usage guide
- Customize agent system prompts in `packages/shared/src/constants.ts`
- Add custom tools in `packages/core/src/tools/`
- Explore memory visualization in web app

## Need Help?

- Check GitHub Issues
- Join our Discord server
- Read OpenAI documentation: https://platform.openai.com/docs
- Read Discord.js guide: https://discordjs.guide
