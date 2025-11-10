# PostgreSQL Storage Plugin

A production-ready storage provider plugin that stores sessions in PostgreSQL for persistence, scalability, and advanced querying.

## Features

- **Persistent Storage**: Sessions survive server restarts
- **ACID Compliance**: Transactional guarantees for data integrity
- **Advanced Querying**: Complex filters, sorting, and pagination
- **High Performance**: Connection pooling and optimized indexes
- **JSON Support**: JSONB columns for flexible encounter and state storage
- **Statistics**: Built-in functions for session analytics

## Prerequisites

1. **PostgreSQL 12+** installed and running
2. **Node.js pg package**: `npm install pg @types/pg`
3. **Database created**: `createdb aiencounters`

## Installation

### 1. Set up the database

Run the schema migration:

```bash
psql -U postgres -d aiencounters -f services/engine/plugins/postgres-storage/schema.sql
```

### 2. Configure the plugin

Edit `plugin.json` to set your connection string:

```json
{
  "config": {
    "connectionString": "postgresql://username:password@localhost:5432/aiencounters",
    "poolSize": 10,
    "connectionTimeout": 5000
  }
}
```

### 3. Build the plugin

```bash
cd services/engine/plugins/postgres-storage
npm install pg @types/pg
npx tsc index.ts --target ES2022 --module ES2022 --moduleResolution node --declaration --skipLibCheck --esModuleInterop
```

### 4. Enable the plugin

The plugin will be auto-discovered and loaded on server startup.

## Database Schema

### Sessions Table

```sql
CREATE TABLE sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  player_id VARCHAR(255) NOT NULL,
  encounter JSONB NOT NULL,
  state JSONB NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes

- `idx_sessions_player_id` - Fast lookups by player
- `idx_sessions_started_at` - Chronological ordering
- `idx_sessions_completed_at` - Filter by completion status
- `idx_sessions_difficulty` - Filter by encounter difficulty
- `idx_sessions_incomplete` - Find active sessions

### Views and Functions

- **active_sessions view**: Lists all incomplete sessions with duration
- **get_session_stats()**: Returns aggregated statistics

```sql
-- Get all active sessions
SELECT * FROM active_sessions;

-- Get global stats
SELECT * FROM get_session_stats();

-- Get stats for specific player
SELECT * FROM get_session_stats('player123');
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `connectionString` | string | required | PostgreSQL connection URL |
| `poolSize` | number | 10 | Maximum number of connections in pool |
| `connectionTimeout` | number | 5000 | Connection timeout in milliseconds |

## Environment Variables

Alternatively, use environment variables:

```bash
export PGHOST=localhost
export PGPORT=5432
export PGDATABASE=aiencounters
export PGUSER=postgres
export PGPASSWORD=yourpassword
```

Then set `connectionString` to:
```json
{
  "connectionString": "postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}"
}
```

## Querying Sessions

The plugin implements all `IStorageProvider` methods:

### Read a session
```typescript
const session = await storage.readSession('session-123');
```

### Query with filters
```typescript
const sessions = await storage.querySessions(
  {
    playerId: 'player-456',
    completed: false,
    difficulty: 'hard'
  },
  {
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit: 10,
    offset: 0
  }
);
```

### Count sessions
```typescript
const count = await storage.countSessions({
  playerId: 'player-456',
  completed: true
});
```

### Delete a session
```typescript
const deleted = await storage.deleteSession('session-123');
```

## Performance Tips

1. **Connection Pooling**: Set `poolSize` based on your expected concurrency
2. **Indexes**: The schema includes optimized indexes for common queries
3. **JSONB**: Use JSONB operators for efficient JSON querying
4. **Monitoring**: Use `pg_stat_statements` to identify slow queries

## Monitoring

Check connection pool stats:

```sql
SELECT * FROM pg_stat_database WHERE datname = 'aiencounters';
```

Monitor active connections:

```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'aiencounters';
```

## Troubleshooting

### Connection refused
- Ensure PostgreSQL is running: `systemctl status postgresql`
- Check `postgresql.conf`: `listen_addresses = '*'`
- Check `pg_hba.conf`: Allow connections from your host

### Permission denied
- Grant privileges: `GRANT ALL ON DATABASE aiencounters TO your_user;`
- Verify with: `\du` in psql

### Slow queries
- Analyze query plans: `EXPLAIN ANALYZE SELECT ...`
- Check indexes: `\di` in psql
- Vacuum regularly: `VACUUM ANALYZE sessions;`

## Migration from FileStorage

To migrate existing sessions from FileStorage to PostgreSQL:

1. Export sessions from FileStorage directory
2. Use the migration script:

```bash
node scripts/migrate-to-postgres.js --source=data/sessions --connection="postgresql://..."
```

(Migration script not included in this template - needs to be created)

## Advanced Features

### JSON Queries

Query by encounter properties:

```sql
-- Find hard difficulty sessions
SELECT * FROM sessions WHERE encounter->>'difficulty' = 'hard';

-- Find sessions with specific objectives
SELECT * FROM sessions
WHERE encounter @> '{"objectives": [{"type": "combat"}]}';
```

### Partitioning

For very large datasets, consider partitioning by date:

```sql
CREATE TABLE sessions_2025_01 PARTITION OF sessions
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

## Security

- **Never commit credentials** to version control
- Use **environment variables** or **secrets management**
- Enable **SSL/TLS** for production connections:
  ```
  postgresql://user:pass@host:5432/db?sslmode=require
  ```
- **Sanitize inputs** - the plugin uses parameterized queries to prevent SQL injection

## License

MIT - Part of the AI Encounters platform
