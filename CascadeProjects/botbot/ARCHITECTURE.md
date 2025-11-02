# Architecture Documentation

## System Overview

BotBot is a Character-AI-style agent system with persistent memory, built as a monorepo with a Discord bot and web application sharing core logic.

```
┌─────────────────────────────────────────────────────────────┐
│                         User Layer                          │
│                                                              │
│   Discord Client          Web Browser                       │
│   (discord.js)           (Next.js 14)                       │
└──────────────┬──────────────────┬─────────────────────────┘
               │                   │
               ▼                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│                                                              │
│  ┌─────────────────┐       ┌──────────────────────┐        │
│  │  Discord Bot    │       │   Next.js API        │        │
│  │  (@botbot/bot)  │       │   (@botbot/web)      │        │
│  └────────┬────────┘       └──────────┬───────────┘        │
│           │                             │                    │
│           └──────────┬──────────────────┘                    │
│                      ▼                                       │
│            ┌──────────────────────┐                          │
│            │   AgentRuntime       │                          │
│            │   (@botbot/core)     │                          │
│            │                      │                          │
│            │  - LLM Client        │                          │
│            │  - Memory Manager    │                          │
│            │  - Prompt Builder    │                          │
│            │  - Safety Layer      │                          │
│            └──────────┬───────────┘                          │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│                                                              │
│  ┌──────────┐  ┌────────┐  ┌─────────┐  ┌───────────┐     │
│  │PostgreSQL│  │ Redis  │  │ OpenAI  │  │ Supabase  │     │
│  │+pgvector │  │(Upstash)  │   API   │  │  Storage  │     │
│  └──────────┘  └────────┘  └─────────┘  └───────────┘     │
└──────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Packages

#### @botbot/db
**Purpose**: Database access layer

**Key Files**:
- `prisma/schema.prisma` - Database schema with pgvector
- `src/index.ts` - Prisma client singleton
- Helper functions for vector search

**Exports**:
- `prisma` - Prisma client instance
- `searchMemoriesByEmbedding()` - Vector similarity search
- `touchMemory()` - Update memory access time
- `decayMemories()` - Batch salience decay

#### @botbot/shared
**Purpose**: Common types, utilities, and constants

**Key Files**:
- `src/types.ts` - TypeScript interfaces
- `src/schemas.ts` - Zod validation schemas
- `src/constants.ts` - Constants (prompts, patterns, presets)
- `src/utils.ts` - Helper functions

**Exports**:
- Type definitions for agents, messages, memories
- Natural language intent parser
- Token estimation
- Memory formatting utilities

#### @botbot/core
**Purpose**: Business logic for agent runtime

**Key Modules**:

**LLM** (`src/llm/`):
- `LLMClient` - OpenAI API wrapper
  - `chat()` - Standard completion
  - `chatStream()` - Streaming completion
  - `embed()` - Generate embeddings
  - `moderate()` - Content moderation
- `PromptBuilder` - Construct prompts from context

**Memory** (`src/memory/`):
- `MemoryManager` - Memory lifecycle
  - `retrieve()` - Vector search for relevant memories
  - `store()` - Save new memories
  - `extractFromConversation()` - LLM-based extraction

**Safety** (`src/safety/`):
- `RateLimiter` - Redis-based rate limiting
- `ContentModerator` - Blocklist + OpenAI moderation

**Tools** (`src/tools/`):
- `ToolExecutor` - Execute LLM tool calls

**Agent** (`src/agent/`):
- `AgentRuntime` - Main orchestrator
  - `handleMessage()` - Process user message
  - `handleMessageStream()` - Process with streaming
  - `createAgent()` - Create new agent
  - `getOrCreateConversation()` - Conversation management

### 2. Applications

#### @botbot/bot (Discord Bot)

**Entry Point**: `src/index.ts`

**Flow**:
```
Discord Message
    ↓
IntentParser
    ↓
MessageHandler
    ↓
Route by Intent (ADOPT, CHAT, REMEMBER, etc.)
    ↓
AgentRuntime
    ↓
Discord Reply
```

**Handlers**:
- `IntentParser` - Parse natural language → Intent
- `MessageHandler` - Route intents to appropriate actions

**Supported Intents**:
- `ADOPT` - Create new agent
- `CHAT` - Normal conversation
- `REMEMBER` - Manual memory addition
- `RECALL` - List memories
- `MOOD` - Change agent mood
- `HELP` - Show help
- `GARDEN` - Get web URL

#### @botbot/web (Next.js App)

**Structure** (App Router):
```
app/
├── layout.tsx          # Root layout
├── globals.css         # Tailwind styles
├── page.tsx           # Landing page
└── garden/
    └── page.tsx       # Agent grid (server component)

components/
└── agent-grid.tsx     # Client component for agents
```

**Tech**:
- Next.js 14 (App Router)
- React 18
- TypeScript

**Features**:
- Server-side agent fetching
- Client-side interactivity
- Tailwind + custom animations
- Responsive design

## Data Model

### Database Schema

```sql
users
├── id (PK)
├── discord_id (unique)
├── email
└── created_at

agents
├── id (PK)
├── owner_user_id (FK → users)
├── name
├── persona
├── system_prompt
├── traits (JSONB)
└── status

agent_instances
├── id (PK)
├── agent_id (FK → agents)
├── environment (JSONB)
├── mood (JSONB: {valence, arousal, dominance})
└── energy (0-100)

conversations
├── id (PK)
├── agent_id (FK → agents)
├── user_id (FK → users)
├── channel_type (DM | GUILD_TEXT | THREAD | WEB)
└── discord_channel_id

messages
├── id (PK)
├── conversation_id (FK → conversations)
├── sender (USER | AGENT | SYSTEM)
├── content
└── created_at

memories
├── id (PK)
├── agent_id (FK → agents)
├── user_id (FK → users, nullable)
├── kind (FACT | PREFERENCE | EVENT | EMOTION)
├── content
├── embedding (vector(1536))
├── salience (0-1)
├── last_accessed_at
└── expires_at

tools
├── id (PK)
├── agent_id (FK → agents)
├── name
├── schema (JSONB)
└── enabled

events
├── id (PK)
├── agent_instance_id (FK → agent_instances)
├── type
└── payload (JSONB)
```

### Key Relationships

- User `1:N` Agents
- User `1:N` Conversations
- Agent `1:N` Conversations
- Agent `1:N` Memories
- Conversation `1:N` Messages
- Agent `1:N` Agent Instances (one per environment)

## Memory System

### Architecture

```
User Message
    ↓
Generate Embedding (text-embedding-3-large)
    ↓
Vector Search in PostgreSQL
    SELECT * FROM memories
    WHERE agent_id = ?
    ORDER BY embedding <=> query_embedding
    LIMIT 5
    ↓
Filter by Similarity Threshold (>0.7)
    ↓
Touch Memories (boost salience, update access time)
    ↓
Return Top-K Memories
```

### Memory Lifecycle

1. **Creation**:
   - Manual: User says "remember that..."
   - Automatic: Post-conversation extraction via GPT-4

2. **Storage**:
   - Generate embedding (1536 dimensions)
   - Store with initial salience (0.6-1.0)
   - Set optional expiry date

3. **Retrieval**:
   - Embed query
   - Vector similarity search
   - Filter by threshold
   - Sort by relevance

4. **Access**:
   - Boost salience (+0.1)
   - Update `last_accessed_at`

5. **Decay**:
   - Nightly job multiplies salience by 0.95
   - Recent access provides immunity

6. **Deletion**:
   - Manual via web UI
   - Automatic when salience < 0.1
   - Automatic when expired

### Memory Extraction

After each conversation, async process:

```typescript
// Extract structured memories from conversation
const candidates = await llm.extractMemories([
  { role: 'user', content: 'I love pizza' },
  { role: 'assistant', content: 'Good to know!' }
]);

// Result:
[{
  type: 'PREFERENCE',
  subject: 'food',
  content: 'User loves pizza',
  confidence: 0.9,
  expiryHint: 'never'
}]
```

## Conversation Flow

### Complete Flow Diagram

```
1. User sends message in Discord/Web
        ↓
2. Check rate limit (Redis sorted set)
        ↓ (allowed)
3. Moderate input content (OpenAI Moderation)
        ↓ (safe)
4. Load agent context:
   - Agent profile (name, persona, system_prompt, traits)
   - Agent instance (mood, energy, environment)
   - Last 30 messages from conversation
        ↓
5. Retrieve relevant memories:
   - Generate embedding for user message
   - Vector search top-5 memories
   - Touch accessed memories
        ↓
6. Build prompt:
   - System: agent's system_prompt + mood + traits
   - System: formatted memories
   - History: last 30 messages
   - User: current message
        ↓
7. Call OpenAI GPT-4 (with optional streaming)
        ↓
8. Moderate response
        ↓ (safe)
9. Save messages to database:
   - User message
   - Agent response
        ↓
10. Extract and store new memories (async)
        ↓
11. Return response to user
```

### Prompt Structure

```
[SYSTEM]
You are Atlas, a persistent companion in Discord and on the web.
Goals: be helpful, concise, proactive...

Current State:
- Mood: positive, energized, confident
- Energy: 85/100
- Traits: curious: true, analytical: high

[SYSTEM]
**Relevant Memories:**
1. [FACT] User is a software developer (95% relevant)
2. [PREFERENCE] User prefers TypeScript over JavaScript (89% relevant)
3. [EVENT] User shipped a major feature last week (78% relevant)

[USER]
Hey Atlas, I'm working on a new project

[ASSISTANT]
Oh exciting! What kind of project? Is it TypeScript-based?

[USER]
Yeah, it's a Discord bot

[ASSISTANT]
← Current response being generated
```

## Safety & Moderation

### Rate Limiting

**Implementation**: Redis sorted sets with sliding window

```typescript
// Key: "rate:user:{userId}"
// Value: Sorted set of timestamps

// Algorithm:
1. Remove entries older than window (60s)
2. Count remaining entries
3. If < limit (20), allow and add current timestamp
4. Else, deny and return resetAt
```

**Limits**:
- Per user: 20 requests/minute
- Global: 100 requests/minute (shared across all users)

### Content Moderation

**Two-layer approach**:

1. **Blocklist**: Fast regex/substring match
   - Custom blocklist per agent
   - Default blocklist for explicit content

2. **OpenAI Moderation**: AI-based classification
   - Categories: hate, violence, sexual, self-harm
   - Applied to both input and output

**Flow**:
```
Message → Blocklist → OpenAI Mod → Process
                ↓              ↓
              Block          Block
```

## Natural Language Understanding

### Intent Parsing

**Current**: Regex-based pattern matching

```typescript
const INTENT_PATTERNS = {
  ADOPT: /adopt\s+(?:a\s+)?(.+?)\s+named\s+(\w+)/i,
  REMEMBER: /remember\s+(?:that\s+)?(.+)/i,
  RECALL: /what\s+do\s+you\s+(know|remember)/i,
  MOOD: /set\s+(?:your\s+)?mood\s+to\s+(\w+)/i,
  // ...
};
```

**Future**: LLM-based intent classification for more flexibility

### Context Detection

- **Mentioned**: `<@BOT_ID>` or agent name
- **Direct Message**: No guild context
- **Thread**: Automatically respond in own threads

## Performance Considerations

### Database Optimization

- **Indexes**: On `agent_id`, `user_id`, `conversation_id`, `salience`
- **Embeddings**: Cosine similarity with HNSW index (pgvector)
- **Connection Pooling**: Supabase connection pooler

### Caching Strategy

- **Prisma**: Built-in query caching
- **Redis**: Rate limit state, session data
- **Future**: LRU cache for agent profiles

### Token Management

- **Context Limit**: Max 4000 tokens for conversation history
- **Truncation**: Oldest messages removed first
- **Estimation**: ~4 chars per token

## Scalability

### Current Capacity (Single Instance)

- **Agents**: Unlimited (database-limited)
- **Concurrent Conversations**: ~100 (rate-limited)
- **Memory Operations**: ~1000/s (pgvector-limited)

### Scaling Strategy

**Horizontal**:
- Multiple bot instances with shared database
- Redis pub/sub for event distribution
- Load balancer for web app

**Vertical**:
- Increase Supabase tier (more connections)
- Dedicated Redis instance
- Batch embedding operations

## Monitoring & Observability

### Recommended Metrics

- Message volume (per agent, per user)
- Response latency (p50, p95, p99)
- OpenAI API costs
- Memory growth rate
- Rate limit hits
- Moderation blocks

### Logging

- Structured JSON logs
- Error tracking (Sentry recommended)
- Audit trail for memories

## Security

### Secrets Management

- Environment variables only
- Never commit `.env`
- Rotate keys quarterly

### Data Privacy

- User data encrypted at rest (Supabase)
- Memories can be deleted by users
- No message persistence beyond conversation window (optional)

### Rate Limiting

- Prevent abuse
- Protect API costs
- Fair usage per user

## Future Enhancements

### Short Term (1-3 months)

- Discord OAuth for web login
- WebSocket realtime sync
- Tool system (reminders, tasks)
- Memory visualization UI

### Medium Term (3-6 months)

- Voice channel integration
- Multi-agent conversations
- Fine-tuned embeddings
- Advanced analytics dashboard

### Long Term (6-12 months)

- Custom LLM fine-tuning
- Agent marketplace
- Plugin system for tools
- Mobile app

## References

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Discord.js Guide](https://discordjs.guide)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
