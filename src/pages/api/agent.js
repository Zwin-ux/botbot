// Next.js API route for /api/agent (POST): instantiates orchestrator and handles agent requests.
// Env vars used: inherits from orchestrator (OPENAI_API_KEY, VECTOR_STORE_PATH, etc.).

const { z } = require('zod');
const { AgentOrchestrator } = require('../../lib/agent/orchestrator');

const AgentRequestSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  userMessage: z.string(),
});

let orchestrator = null;

async function getOrchestrator() {
  if (!orchestrator) {
    orchestrator = new AgentOrchestrator();
    await orchestrator.initialize();
  }
  return orchestrator;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const parsed = AgentRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.errors });
    }

    const request = parsed.data;
    const orch = await getOrchestrator();
    const response = await orch.handle(request);

    return res.status(200).json(response);
  } catch (err) {
    console.error('Agent API error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
};
