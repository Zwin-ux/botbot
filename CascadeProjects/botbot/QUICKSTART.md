# Quick Start Guide

Get BotBot running in 10 minutes.

## Prerequisites

- Node.js 20+ installed
- Git installed
- Discord account

## Step 1: Clone and Install (2 min)

```bash
cd botbot
npm install
```

## Step 2: Copy Environment File (1 min)

```bash
cp .env.example .env
```

## Step 3: Get Service Keys (5 min)

### Supabase (Database)

1. Go to [supabase.com](https://supabase.com) → Sign up → New Project
2. Wait 2 minutes for provisioning
3. Go to Project Settings → Database
4. Copy connection strings to `.env`:
   - `DATABASE_URL` = Connection pooling URL
   - `DIRECT_URL` = Direct connection URL
5. Go to SQL Editor → New Query → Run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### Upstash (Redis)

1. Go to [upstash.com](https://upstash.com) → Sign up → Create Database
2. Copy REST URL to `.env` as `REDIS_URL`

### OpenAI

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create new key → Copy to `.env` as `OPENAI_API_KEY`

### Discord

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. New Application → Name it "BotBot"
3. **Bot tab**:
   - Add Bot → Enable "MESSAGE CONTENT INTENT"
   - Reset Token → Copy to `.env` as `DISCORD_TOKEN`
4. **OAuth2 tab**:
   - Copy CLIENT ID and CLIENT SECRET to `.env`
5. **General Information tab**:
   - Copy PUBLIC KEY to `.env`
6. **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Permissions: Send Messages, Read Message History
   - Copy URL → Open in browser → Add to your server

### NextAuth Secret

Run one of these:

**Mac/Linux:**
```bash
openssl rand -base64 32
```

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

Paste output as `NEXTAUTH_SECRET` in `.env`.

## Step 4: Setup Database (1 min)

```bash
npm run db:generate
npm run db:push
```

Wait for "Done" message.

## Step 5: Start Everything (1 min)

```bash
npm run dev
```

You should see:
- ✅ Discord bot: "Logged in as BotBot#1234"
- ✅ Web app: http://localhost:3000

## Step 6: Test It! (1 min)

### In Discord

Go to your server and type:
```
@BotBot adopt a curious scientist named Atlas
```

Then chat:
```
Hey Atlas, hello!
```

### On Web

1. Open http://localhost:3000
2. Click "Enter Garden"
3. See your agent!

## Done! 🎉

Your AI companion is ready. Next steps:

- Adopt more agents with different personas
- Try memory commands: `@BotBot remember that I love coding`
- Change moods: `@BotBot set your mood to playful`
- Read [README.md](./README.md) for full documentation

## Troubleshooting

**Bot not responding?**
- Check Discord Developer Portal → Bot → Message Content Intent is ON
- Verify `DISCORD_TOKEN` in `.env` is correct
- Look at terminal for error messages

**Database errors?**
- Run `npm run db:push` again
- Check `DATABASE_URL` has your password
- Ensure pgvector extension is created

**OpenAI errors?**
- Verify `OPENAI_API_KEY` starts with `sk-`
- Check you have credits: platform.openai.com/usage

**Need help?**
- Read [SETUP.md](./SETUP.md) for detailed instructions
- Check GitHub Issues
