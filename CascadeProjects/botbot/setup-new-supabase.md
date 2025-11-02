# Setup New Supabase Project

## Steps:

1. **Go to [supabase.com](https://supabase.com)**
2. **Click "New Project"**
3. **Choose settings:**
   - Name: `botbot-db`
   - Database Password: `BotBot2024!` (or your choice)
   - Region: `West US (Oregon)` (closest to you)
4. **Wait 2-3 minutes for setup**
5. **Enable pgvector extension:**
   - Go to SQL Editor
   - Run: `CREATE EXTENSION IF NOT EXISTS vector;`
6. **Get connection strings:**
   - Go to Settings → Database
   - Copy "Connection pooling" URL for DATABASE_URL
   - Copy "Direct connection" URL for DIRECT_URL
7. **Get API keys:**
   - Go to Settings → API
   - Copy "anon public" key for NEXT_PUBLIC_SUPABASE_ANON_KEY
   - Copy "service_role" key for SUPABASE_SERVICE_ROLE_KEY
   - Copy "URL" for NEXT_PUBLIC_SUPABASE_URL

## Update .env with new values:
```bash
DATABASE_URL=your_new_pooled_connection_string
DIRECT_URL=your_new_direct_connection_string
NEXT_PUBLIC_SUPABASE_URL=https://your-new-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_new_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key
```