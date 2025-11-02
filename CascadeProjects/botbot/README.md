# BotBot - Character-AI-style Agent with Persistent Memory

A Discord bot and web application that creates AI companions with persistent memory, living in both Discord and a "Chao Garden" web interface.

## Features

- **Natural Language Interaction**: No slash commands - just talk naturally with your agents
- **Persistent Memory**: Vector-based memory system that remembers facts, preferences, and events
- **Discord Integration**: Fully-featured Discord bot with DM and server support
- **Web Garden**: Beautiful web interface to manage agents and view memories
- **Mood System**: Agents have emotional states that affect their responses
- **Multi-Platform**: Conversations sync between Discord and web

## Architecture

### Tech Stack

- **Frontend**: Next.js 14 + React 18 + Tailwind CSS
- **Backend**: Next.js API Routes + Discord.js v14
- **Database**: PostgreSQL (Supabase) + pgvector for embeddings
- **Cache**: Redis (Upstash)
- **LLM**: OpenAI GPT-4 + text-embedding-3-large
- **Monorepo**: Turborepo

### Project Structure

```
botbot/
├── apps/
│   ├── bot/          # Discord bot
│   └── web/          # Next.js web app
├── packages/
│   ├── core/         # LLM, memory, tools, moderation
│   ├── db/           # Prisma schema & client
│   ├── shared/       # Common types & utilities
│   └── ui/           # Shared React components
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (Supabase recommended)
- Redis instance (Upstash free tier works)
- OpenAI API key
- Discord Developer Application

### 1. Clone and Install

```bash
git clone <your-repo>
cd botbot
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
# Discord Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_PUBLIC_KEY=your_public_key_here

# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here

# Database (Supabase)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Redis (Upstash)
REDIS_URL=redis://...

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Setup Supabase Database

1. Create a new Supabase project
2. Enable the pgvector extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

3. Run Prisma migrations:

```bash
npm run db:generate
npm run db:push
```

### 4. Setup Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" tab:
   - Create a bot
   - Enable "MESSAGE CONTENT INTENT"
   - Copy bot token to `.env`
4. Go to "OAuth2" tab:
   - Copy Client ID and Client Secret to `.env`
5. Go to "General Information":
   - Copy Public Key to `.env`

### 5. Invite Bot to Server

Generate an invite URL with these scopes:
- `bot`
- `applications.commands`

Required permissions:
- Send Messages
- Read Messages/View Channels
- Read Message History
- Add Reactions

### 6. Run Development Servers

```bash
# Run everything
npm run dev

# Or run individually
npm run dev --filter=@botbot/bot    # Discord bot
npm run dev --filter=@botbot/web    # Web app
```

The bot will connect to Discord and the web app will be at `http://localhost:3000`.

## Usage

### Discord Commands (Natural Language)

**Adopt an Agent**
```
@BotBot adopt a curious scientist named Atlas
@BotBot adopt a playful cat named Whiskers
```

**Chat**
```
Hey Atlas, how are you?
@BotBot hello!
Whiskers, tell me a joke!
```

**Memory**
```
@BotBot remember that I love pizza
@BotBot what do you remember about me?
```

**Mood**
```
@BotBot set your mood to playful
```

Options: happy, sad, excited, calm, playful, serious, curious, tired

**Help**
```
@BotBot help
```

**Garden Link**
```
@BotBot show garden
```

### Web Interface

Visit `http://localhost:3000` to:
- View all your agents in the "Chao Garden"
- See agent stats (memories, conversations, energy, mood)
- Manage agent personalities
- View and edit memories
- Chat with agents from the web

## Development

### Database Migrations

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes (dev)
npm run db:push

# Create migration (production)
npm run db:migrate
```

### Build for Production

```bash
npm run build
```

### Lint & Format

```bash
npm run lint
npm run format
```

## How It Works

### Memory System

1. **Short-term memory**: Last 30 messages in conversation context
2. **Long-term memory**: Facts/preferences stored as vector embeddings
3. **Retrieval**: Top-K similarity search on user message
4. **Extraction**: GPT-4 extracts stable facts after conversations
5. **Decay**: Salience scores decay over time, boosted on access

### Conversation Flow

```
User Message
    ↓
Rate Limiting & Moderation
    ↓
Load Agent Context (persona, mood, energy)
    ↓
Retrieve Relevant Memories (vector search)
    ↓
Build Prompt (system + memories + history + user msg)
    ↓
GPT-4 Response
    ↓
Save Messages & Extract New Memories
    ↓
Reply to User
```

### Natural Language Parsing

The bot uses regex patterns to parse intents:
- `adopt a [persona] named [name]` → Create agent
- `remember that [content]` → Add memory
- `what do you (know|remember)` → Recall memories
- `set mood to [mood]` → Update mood

Falls back to chat mode when mentioned or in DMs.

## Deployment

### Discord Bot

Deploy to Railway, Render, or Fly.io:

```bash
# Build
npm run build --filter=@botbot/bot

# Start
npm run start --filter=@botbot/bot
```

### Web App

Deploy to Vercel:

```bash
vercel --prod
```

Set environment variables in your hosting platform.

## Roadmap

- [x] Discord bot with natural language
- [x] Persistent memory with vector search
- [x] Web garden UI
- [x] Mood system
- [ ] Discord OAuth for web login
- [ ] Realtime WebSocket sync
- [ ] Tool system (reminders, tasks, web search)
- [ ] Multi-agent conversations
- [ ] Memory visualization
- [ ] Export/import agent personas
- [ ] Voice channel integration

## Contributing

Contributions welcome! Please open an issue first to discuss changes.

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [your-repo/issues]
- Discord: [your-discord-server]
