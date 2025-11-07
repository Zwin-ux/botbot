# ATC Visualization - Vercel Deployment

This directory contains the Vercel-optimized deployment configuration for the ATC Training Visualization Dashboard.

## Architecture Overview

### Frontend (Vercel)
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + TypeScript + Tailwind CSS
- **Real-time**: Server-Sent Events (SSE) instead of WebSockets
- **Deployment**: Vercel Edge Functions + Static Assets

### Backend (Serverless)
- **API Routes**: Next.js API routes deployed as Vercel Serverless Functions
- **Data Streaming**: SSE (Server-Sent Events) for real-time updates
- **Storage**: Vercel KV (Redis) for session state and historical data

### Why SSE instead of WebSockets?
Vercel's serverless environment doesn't support persistent WebSocket connections. SSE provides:
- One-way server→client streaming (perfect for visualization)
- Automatic reconnection
- Native browser support
- Works with serverless/edge functions

## Project Structure

```
vercel-deployment/
├── README.md                    # This file
├── package.json                 # Dependencies
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS config
├── tsconfig.json               # TypeScript config
├── .env.example                # Environment variables template
├── vercel.json                 # Vercel deployment config
│
├── public/                     # Static assets
│   └── favicon.ico
│
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page (dashboard)
│   │   ├── api/                # API routes (serverless)
│   │   │   ├── stream/route.ts     # SSE endpoint
│   │   │   ├── training/route.ts   # Training control
│   │   │   ├── scenarios/route.ts  # Scenario management
│   │   │   └── history/route.ts    # Historical data
│   │   └── globals.css         # Global styles
│   │
│   ├── components/             # React components
│   │   ├── Dashboard.tsx       # Main dashboard
│   │   ├── AircraftVisualizer.tsx
│   │   ├── MetricsPanel.tsx
│   │   ├── TrainingControls.tsx
│   │   ├── ConnectionStatus.tsx
│   │   └── ui/                 # Reusable UI components
│   │
│   ├── lib/                    # Utilities
│   │   ├── sse-client.ts       # SSE client wrapper
│   │   ├── data-transform.ts   # Data transformation
│   │   └── store.ts            # Client-side state
│   │
│   └── types/                  # TypeScript types
│       └── index.ts
│
└── scripts/
    └── deploy.sh               # Deployment helper
```

## Quick Start

### 1. Install Dependencies

```bash
cd visualization/web/vercel-deployment
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Redis/KV for state storage (optional, for production)
KV_REST_API_URL=your_vercel_kv_url
KV_REST_API_TOKEN=your_vercel_kv_token

# Python backend endpoint (for local development)
PYTHON_BACKEND_URL=http://localhost:8765
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect your GitHub repo to Vercel for automatic deployments.

## Local Development Setup

### Option A: Mock Data (No Python Backend)
The dashboard can run in demo mode with simulated data:

```bash
npm run dev
```

Visit `http://localhost:3000?demo=true`

### Option B: Connect to Python Backend
Run the Python visualization server locally:

```bash
# In ATC root directory
python visualization/viz_server.py
```

Then start the Next.js dev server:
```bash
npm run dev
```

The Next.js API will proxy requests to the Python server.

## Deployment Options

### Option 1: Full Serverless (Recommended for Demo)
- Deploy frontend to Vercel
- Use Vercel KV for data storage
- Use demo/mock data or connect to external Python API

### Option 2: Hybrid (Best for Production)
- Deploy frontend to Vercel
- Host Python backend on Railway/Render/Fly.io
- Use SSE to stream data from Python → Vercel API → Browser

### Option 3: Static Export (Simplest)
- Build static HTML/CSS/JS
- Deploy to Vercel as static site
- Use client-side polling to fetch data from external API

## API Endpoints

### `GET /api/stream`
Server-Sent Events endpoint for real-time updates.

**Query Params:**
- `episode`: Episode ID to stream (optional)

**Response:** SSE stream
```
event: step
data: {"type":"step","aircraft":[...],"metrics":{...}}

event: episode_end
data: {"type":"episode_end","total_reward":123.45}
```

### `POST /api/training/start`
Start a training episode.

**Body:**
```json
{
  "scenario": "scenarios/straight_4.scn",
  "config": {
    "num_steps": 400,
    "seed": 42
  }
}
```

### `GET /api/scenarios`
List available scenarios.

### `GET /api/history`
Get historical training data.

## Environment Variables

```env
# Vercel KV (Redis) - for state storage
KV_REST_API_URL=
KV_REST_API_TOKEN=

# External Python Backend (optional)
PYTHON_BACKEND_URL=

# Feature flags
NEXT_PUBLIC_ENABLE_MOCK_DATA=true
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-backend.com
```

## Performance Optimizations

1. **Edge Functions**: API routes run on Vercel Edge (faster than serverless)
2. **Incremental Static Regeneration**: Historical data cached and regenerated
3. **Image Optimization**: Next.js automatic image optimization
4. **Code Splitting**: Automatic by Next.js
5. **Compression**: Brotli compression enabled

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Build test
npm run build
```

## Monitoring

Vercel provides:
- Real-time logs
- Performance analytics
- Error tracking
- Usage metrics

Access via Vercel dashboard after deployment.

## Cost Estimation

**Vercel Free Tier:**
- 100 GB bandwidth/month
- Unlimited deployments
- Serverless function execution: 100 GB-hours
- Edge functions: 500k invocations

**Typical Usage:**
- Dashboard visit: ~2 MB
- SSE stream (1 hour): ~10 MB
- **Estimate**: 500-1000 concurrent users on free tier

## Troubleshooting

### "Function exceeded timeout"
- Vercel functions timeout after 10s (hobby) / 60s (pro)
- Solution: Use edge functions or break into smaller chunks

### "Rate limit exceeded"
- Vercel KV has rate limits
- Solution: Add caching layer or upgrade plan

### "SSE connection drops"
- Vercel has connection limits
- Solution: Implement reconnection logic (included in client)

## Next Steps

1. **Add Authentication**: Implement auth (e.g., Vercel Auth, Clerk)
2. **Add Database**: Use Vercel Postgres or external DB
3. **Add Analytics**: Integrate Vercel Analytics
4. **Add Monitoring**: Use Sentry or similar
5. **Add CI/CD**: GitHub Actions for testing before deploy

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

## Support

For issues or questions, refer to:
- Main project README: `../../README.md`
- Visualization docs: `../README.md`
