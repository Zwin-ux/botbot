# Design Document - Feature Enhancements

## Overview

This design transforms the AI Encounters Engine from a basic encounter generation system into a comprehensive platform for creating, managing, and experiencing dynamic AI-powered content. The enhancements focus on empowering three key user groups: game developers, content creators, and players.

## Architecture

### Enhanced System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI Encounters Platform                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Template   │  │   Visual     │  │  Marketplace │         │
│  │   Library    │  │   Editor     │  │   & Sharing  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Dynamic    │  │  Analytics   │  │   Webhook    │         │
│  │  Difficulty  │  │   Engine     │  │   System     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐       │
│  │            Core Encounters Engine                    │       │
│  │  (Session Management, LLM Proxy, Storage)           │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Multi-LLM   │  │     NPC      │  │   Campaign   │         │
│  │   Support    │  │    Memory    │  │   Manager    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Voice     │  │     i18n     │  │   CLI Tools  │         │
│  │  Integration │  │  Translation │  │   & DevKit   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Encounter Template System

**New Package:** `packages/templates`

**Structure:**
```typescript
// packages/templates/src/types.ts
export interface EncounterTemplate {
  id: string;
  name: string;
  category: 'combat' | 'puzzle' | 'social' | 'exploration' | 'stealth';
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDuration: number;
  structure: Partial<EncounterSpec>;
  customizableFields: string[];
  requiredFields: string[];
  tags: string[];
}

// packages/templates/src/library.ts
export const TEMPLATE_LIBRARY: Record<string, EncounterTemplate> = {
  'combat-ambush': {
    id: 'combat-ambush',
    name: 'Ambush Encounter',
    category: 'combat',
    description: 'Surprise attack by enemies',
    difficulty: 'medium',
    estimatedDuration: 15,
    structure: {
      title: 'Ambush!',
      objectives: [
        {
          id: 'obj_1',
          description: 'Defeat all enemies',
          type: 'eliminate',
          target: '{{enemy_type}}',
          quantity: '{{enemy_count}}',
          completed: false
        }
      ],
      npcs: [],
      rewards: [
        {
          type: 'experience',
          amount: '{{xp_reward}}'
        }
      ]
    },
    customizableFields: ['enemy_type', 'enemy_count', 'xp_reward'],
    requiredFields: ['enemy_type', 'enemy_count'],
    tags: ['combat', 'action', 'quick']
  }
};
```

**API Endpoints:**
```typescript
// GET /templates - List all templates
// GET /templates/:id - Get specific template
// POST /templates/:id/generate - Generate encounter from template
{
  "templateId": "combat-ambush",
  "parameters": {
    "enemy_type": "bandits",
    "enemy_count": 5,
    "xp_reward": 100
  },
  "playerContext": { /* ... */ }
}
```

### 2. Dynamic Difficulty System

**New Package:** `packages/difficulty-engine`

**Implementation:**
```typescript
// packages/difficulty-engine/src/DifficultyManager.ts
export class DifficultyManager {
  private playerHistory: Map<string, PlayerPerformance>;
  
  calculateDifficulty(playerId: string, baseDifficulty: number): number {
    const history = this.getPlayerHistory(playerId);
    const successRate = history.calculateSuccessRate();
    const avgCompletionTime = history.getAverageCompletionTime();
    
    let adjustment = 0;
    
    // Adjust based on success rate
    if (successRate < 0.3) {
      adjustment = -0.2; // Make easier
    } else if (successRate > 0.8) {
      adjustment = 0.2; // Make harder
    }
    
    // Adjust based on completion speed
    if (avgCompletionTime < history.expectedTime * 0.7) {
      adjustment += 0.1; // Player is fast, increase difficulty
    }
    
    return Math.max(0.1, Math.min(1.0, baseDifficulty + adjustment));
  }
  
  recordPerformance(playerId: string, encounter: EncounterResult): void {
    const history = this.getPlayerHistory(playerId);
    history.addResult({
      encounterId: encounter.id,
      success: encounter.completed,
      completionTime: encounter.duration,
      objectivesCompleted: encounter.objectivesCompleted,
      timestamp: new Date()
    });
  }
}

// Integration with LLM Proxy
// Add difficulty parameter to generation prompt
const prompt = `Generate an encounter with difficulty ${difficulty} (0.1=very easy, 1.0=very hard)...`;
```

### 3. Analytics Engine

**New Service:** `services/analytics`

**Database Schema:**
```typescript
// Store in JSON files or add optional PostgreSQL support
interface EncounterAnalytics {
  encounterId: string;
  totalPlays: number;
  completions: number;
  averageCompletionTime: number;
  successRate: number;
  objectiveStats: {
    [objectiveId: string]: {
      completionRate: number;
      averageTime: number;
    };
  };
  choiceDistribution: {
    [choiceId: string]: number; // Count of times chosen
  };
  commonFailurePoints: string[];
  playerFeedback: {
    rating: number;
    comments: string[];
  }[];
}
```

**API Endpoints:**
```typescript
// GET /analytics/encounter/:id - Get analytics for specific encounter
// GET /analytics/player/:playerId - Get player statistics
// GET /analytics/global - Get platform-wide statistics
// POST /analytics/feedback - Submit player feedback
```

### 4. Visual Encounter Editor

**New Adapter:** `adapters/editor-web`

**Technology Stack:**
- React with TypeScript
- React Flow for visual node editing
- Monaco Editor for JSON editing
- Tailwind CSS for styling

**Features:**
```typescript
// Editor Components
- EncounterCanvas: Drag-and-drop encounter builder
- ObjectiveEditor: Form-based objective creation
- NPCDialogueTree: Visual dialogue branching
- PreviewPanel: Live encounter simulation
- ValidationPanel: Real-time error checking

// Editor State Management
interface EditorState {
  encounter: Partial<EncounterSpec>;
  selectedNode: string | null;
  validationErrors: ValidationError[];
  previewMode: boolean;
  isDirty: boolean;
}
```

**API Integration:**
```typescript
// POST /editor/validate - Validate encounter structure
// POST /editor/preview - Generate preview with test data
// POST /editor/publish - Save encounter to library
// GET /editor/templates - Get available templates
```

### 5. Multi-LLM Provider Support

**Enhanced LLM Proxy:**
```typescript
// packages/llm-proxy/src/providers/base.ts
export interface LLMProvider {
  name: string;
  generateEncounter(prompt: string, options: GenerationOptions): Promise<EncounterSpec>;
  estimateCost(prompt: string): number;
  checkHealth(): Promise<boolean>;
}

// packages/llm-proxy/src/providers/openai.ts
export class OpenAIProvider implements LLMProvider {
  // Existing implementation
}

// packages/llm-proxy/src/providers/anthropic.ts
export class AnthropicProvider implements LLMProvider {
  async generateEncounter(prompt: string, options: GenerationOptions): Promise<EncounterSpec> {
    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    return this.parseResponse(response.content[0].text);
  }
}

// packages/llm-proxy/src/providers/local.ts
export class LocalLLMProvider implements LLMProvider {
  // Support for Ollama, LM Studio, etc.
  async generateEncounter(prompt: string, options: GenerationOptions): Promise<EncounterSpec> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false
      })
    });
    
    return this.parseResponse(await response.json());
  }
}

// packages/llm-proxy/src/ProviderManager.ts
export class ProviderManager {
  private providers: Map<string, LLMProvider>;
  private fallbackOrder: string[];
  
  async generate(prompt: string, options: GenerationOptions): Promise<EncounterSpec> {
    for (const providerName of this.fallbackOrder) {
      try {
        const provider = this.providers.get(providerName);
        return await provider.generateEncounter(prompt, options);
      } catch (error) {
        logger.warn({ provider: providerName, error }, 'Provider failed, trying fallback');
        continue;
      }
    }
    
    throw new Error('All LLM providers failed');
  }
}
```

**Configuration:**
```typescript
// .env additions
LLM_PRIMARY_PROVIDER=openai
LLM_FALLBACK_PROVIDER=anthropic
LLM_LOCAL_ENABLED=false
LLM_LOCAL_URL=http://localhost:11434

ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### 6. Webhook System

**New Package:** `packages/webhooks`

**Implementation:**
```typescript
// packages/webhooks/src/WebhookManager.ts
export class WebhookManager {
  async sendWebhook(event: WebhookEvent): Promise<void> {
    const webhooks = await this.getWebhooksForEvent(event.type);
    
    await Promise.allSettled(
      webhooks.map(webhook => this.deliverWebhook(webhook, event))
    );
  }
  
  private async deliverWebhook(webhook: Webhook, event: WebhookEvent): Promise<void> {
    const payload = {
      event: event.type,
      timestamp: new Date().toISOString(),
      data: event.data
    };
    
    const signature = this.generateSignature(payload, webhook.secret);
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event.type
          },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          logger.info({ webhookId: webhook.id, event: event.type }, 'Webhook delivered');
          return;
        }
      } catch (error) {
        logger.warn({ webhookId: webhook.id, attempt, error }, 'Webhook delivery failed');
        await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
      }
    }
    
    logger.error({ webhookId: webhook.id, event: event.type }, 'Webhook delivery failed after 3 attempts');
  }
}

// Webhook Events
type WebhookEventType = 
  | 'session.started'
  | 'session.completed'
  | 'objective.completed'
  | 'choice.made'
  | 'npc.interaction';
```

**API Endpoints:**
```typescript
// POST /webhooks - Register a webhook
// GET /webhooks - List webhooks
// DELETE /webhooks/:id - Remove webhook
// POST /webhooks/:id/test - Test webhook delivery
```

### 7. NPC Memory System

**Enhanced NPC Storage:**
```typescript
// packages/core/src/types/npc.ts
export interface NPCMemory {
  npcId: string;
  playerId: string;
  interactions: Interaction[];
  relationshipLevel: number; // -100 to 100
  knownFacts: string[];
  personalityTraits: {
    [trait: string]: number; // e.g., friendly: 0.8, suspicious: 0.2
  };
}

export interface Interaction {
  timestamp: Date;
  encounterId: string;
  dialogue: string[];
  playerChoices: string[];
  outcome: 'positive' | 'neutral' | 'negative';
}

// services/engine/src/services/NPCMemoryManager.ts
export class NPCMemoryManager {
  async getMemory(npcId: string, playerId: string): Promise<NPCMemory> {
    // Load from storage
  }
  
  async recordInteraction(npcId: string, playerId: string, interaction: Interaction): Promise<void> {
    const memory = await this.getMemory(npcId, playerId);
    memory.interactions.push(interaction);
    
    // Update relationship based on outcome
    if (interaction.outcome === 'positive') {
      memory.relationshipLevel = Math.min(100, memory.relationshipLevel + 10);
    } else if (interaction.outcome === 'negative') {
      memory.relationshipLevel = Math.max(-100, memory.relationshipLevel - 10);
    }
    
    await this.saveMemory(memory);
  }
  
  generateContextPrompt(memory: NPCMemory): string {
    return `
      This NPC has met the player ${memory.interactions.length} times before.
      Relationship level: ${memory.relationshipLevel}/100
      Previous interactions: ${memory.interactions.slice(-3).map(i => i.dialogue.join(' ')).join('; ')}
      The NPC should remember these facts: ${memory.knownFacts.join(', ')}
    `;
  }
}
```

### 8. Campaign System

**New Package:** `packages/campaigns`

```typescript
// packages/campaigns/src/types.ts
export interface Campaign {
  id: string;
  name: string;
  description: string;
  encounters: CampaignEncounter[];
  currentEncounterIndex: number;
  playerContext: PlayerContext;
  startedAt: Date;
  completedAt?: Date;
}

export interface CampaignEncounter {
  encounterId: string;
  order: number;
  prerequisites?: string[]; // IDs of encounters that must be completed first
  stateTransfer: {
    carryForward: string[]; // Which state to pass to next encounter
    transformations: Record<string, (prev: any) => any>;
  };
}

// services/engine/src/services/CampaignManager.ts
export class CampaignManager {
  async startCampaign(campaignId: string, playerId: string): Promise<Campaign> {
    const campaign = await this.loadCampaign(campaignId);
    campaign.playerContext = { playerId };
    campaign.currentEncounterIndex = 0;
    campaign.startedAt = new Date();
    
    await this.saveCampaign(campaign);
    return campaign;
  }
  
  async advanceCampaign(campaignId: string, completedEncounter: Session): Promise<Campaign | null> {
    const campaign = await this.getCampaign(campaignId);
    
    // Transfer state to next encounter
    const nextEncounter = campaign.encounters[campaign.currentEncounterIndex + 1];
    if (!nextEncounter) {
      campaign.completedAt = new Date();
      await this.saveCampaign(campaign);
      return null; // Campaign complete
    }
    
    // Apply state transformations
    for (const [key, transform] of Object.entries(nextEncounter.stateTransfer.transformations)) {
      campaign.playerContext[key] = transform(completedEncounter[key]);
    }
    
    campaign.currentEncounterIndex++;
    await this.saveCampaign(campaign);
    
    return campaign;
  }
}
```

### 9. CLI Tools

**New Package:** `packages/cli`

```typescript
// packages/cli/src/commands/validate.ts
export async function validateCommand(filePath: string): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8');
  const spec = JSON.parse(content);
  
  const result = validateEncounterSpec(spec);
  
  if (result.valid) {
    console.log('✓ Encounter is valid');
  } else {
    console.error('✗ Validation failed:');
    result.errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
}

// packages/cli/src/commands/test.ts
export async function testCommand(filePath: string): Promise<void> {
  const spec = await loadEncounterSpec(filePath);
  const client = new EncountersClient(process.env.ENGINE_URL);
  
  console.log('Starting test session...');
  const session = await client.startSession('test-player', {
    level: 5,
    preferences: []
  });
  
  console.log(`Session created: ${session.id}`);
  console.log(`Objectives: ${session.encounter.objectives.length}`);
  
  // Simulate completing objectives
  for (const objective of session.encounter.objectives) {
    await client.updateObjective(session.id, objective.id, { completed: true });
    console.log(`✓ Completed: ${objective.description}`);
  }
  
  await client.completeSession(session.id);
  console.log('✓ Test completed successfully');
}

// CLI Usage
// npx ae-cli validate ./encounters/my-encounter.json
// npx ae-cli test ./encounters/my-encounter.json
// npx ae-cli deploy ./encounters/*.json --env production
```

## 10. Multiworld Deployment System

### Persona Core (Portable AI Identity)

**New Package:** `packages/persona`

```typescript
// packages/persona/src/types.ts
export interface PersonaCore {
  id: string;
  name: string;
  traits: {
    tone: 'curious' | 'serious' | 'playful' | 'mysterious';
    ethics: 'helper' | 'neutral' | 'trickster';
    risk: 'low' | 'medium' | 'high';
  };
  goals: string[]; // e.g., ['guide', 'entertain', 'challenge']
  memoryRef: string; // Reference to vector DB or memory storage
  safety: {
    blockedTopics: string[]; // e.g., ['self-harm', 'nsfw', 'politics']
    maxActionsPerMinute: number;
    allowedActions: string[];
  };
  voice?: {
    id: string;
    rate: number;
  };
  embodiment: {
    avatar: string; // Model/skin identifier
    emotes: string[]; // Available emote animations
  };
  creatorId: string;
  reputation: number; // 0-100 based on user feedback
  deploymentHistory: DeploymentRecord[];
}

export interface DeploymentRecord {
  sessionId: string;
  world: 'gmod' | 'minecraft' | 'web';
  serverId: string;
  startedAt: Date;
  endedAt?: Date;
  metrics: {
    sessionLength: number;
    interactions: number;
    abuseReports: number;
    playerRating?: number;
  };
}
```

### Deployment Flow API

**New Service:** `services/deployment`

```typescript
// services/deployment/src/routes/personas.ts

// POST /personas/submit - Create and submit persona for moderation
{
  "name": "Helpful Guide",
  "traits": {
    "tone": "curious",
    "ethics": "helper",
    "risk": "low"
  },
  "goals": ["guide", "entertain"],
  "safety": {
    "blockedTopics": ["self-harm", "nsfw"],
    "maxActionsPerMinute": 10,
    "allowedActions": ["chat", "move", "emote"]
  },
  "embodiment": {
    "avatar": "humanoid_a",
    "emotes": ["wave", "sit", "point"]
  }
}

// Response: { "id": "persona_abc123", "status": "pending_moderation" }

// POST /personas/:id/approve - Approve persona (admin only)
// Response: { "token": "deploy_xyz789", "ttl": 3600 }

// POST /spawn - Spawn persona in a world
{
  "personaId": "persona_abc123",
  "deploymentToken": "deploy_xyz789",
  "world": "minecraft",
  "serverId": "server_001",
  "spawnLocation": { "x": 100, "y": 64, "z": 200 }
}

// Response: { "sessionId": "sess_def456", "status": "spawning" }

// POST /signal - Send action to spawned persona
{
  "sessionId": "sess_def456",
  "actions": [
    { "type": "chat", "message": "Hello, player!" },
    { "type": "move_to", "x": 105, "y": 64, "z": 205 }
  ]
}

// POST /session/:id/end - End deployment session
// Response: { "summary": {...}, "logsUri": "s3://logs/sess_def456.json" }
```

### Game Adapters

**GMod Adapter (Lua + WebSocket)**

```lua
-- adapters/gmod-sidecar/lua/autorun/client/ai_companion.lua

local ws = nil
local companion = {}

function companion.Connect(sessionId, token)
    ws = WebSocket("ws://localhost:3002/ws")
    
    ws:on("open", function()
        ws:send(json.encode({
            type = "auth",
            sessionId = sessionId,
            token = token
        }))
    end)
    
    ws:on("message", function(data)
        local action = json.decode(data)
        companion.HandleAction(action)
    end)
end

function companion.HandleAction(action)
    if action.type == "chat" then
        chat.AddText(Color(100, 200, 255), "[AI] ", Color(255, 255, 255), action.message)
    elseif action.type == "move_to" then
        -- Pathfind to location
        companion.entity:SetPos(Vector(action.x, action.y, action.z))
    elseif action.type == "emote" then
        companion.entity:EmitSound("npc/metropolice/vo/" .. action.emote .. ".wav")
    elseif action.type == "use_entity" then
        local ent = Entity(action.entityId)
        if IsValid(ent) then
            ent:Use(companion.entity)
        end
    end
end

function companion.SendEvent(eventType, data)
    if ws and ws:isConnected() then
        ws:send(json.encode({
            type = eventType,
            data = data,
            timestamp = os.time()
        }))
    end
end
```

**Minecraft Adapter (Paper/Spigot + Node Bridge)**

```typescript
// adapters/minecraft-bridge/src/MinecraftAdapter.ts

export class MinecraftAdapter {
  private ws: WebSocket;
  private bot: any; // Mineflayer bot instance
  
  async connect(sessionId: string, token: string): Promise<void> {
    this.ws = new WebSocket('ws://localhost:3002/ws');
    
    this.ws.on('open', () => {
      this.ws.send(JSON.stringify({
        type: 'auth',
        sessionId,
        token
      }));
    });
    
    this.ws.on('message', (data: string) => {
      const action = JSON.parse(data);
      this.handleAction(action);
    });
  }
  
  private async handleAction(action: any): Promise<void> {
    switch (action.type) {
      case 'chat':
        this.bot.chat(action.message);
        break;
        
      case 'navigate':
        const goal = new goals.GoalNear(action.x, action.y, action.z, 1);
        await this.bot.pathfinder.goto(goal);
        break;
        
      case 'interact':
        if (action.targetType === 'block') {
          const block = this.bot.blockAt(vec3(action.x, action.y, action.z));
          await this.bot.activateBlock(block);
        } else if (action.targetType === 'entity') {
          const entity = this.bot.entities[action.entityId];
          await this.bot.useOn(entity);
        }
        break;
        
      case 'inventory':
        if (action.action === 'use') {
          const item = this.bot.inventory.items().find(i => i.name === action.itemName);
          await this.bot.equip(item, 'hand');
        }
        break;
        
      case 'title':
        // Send title/actionbar via plugin API
        this.sendPluginMessage('title', action.text);
        break;
    }
  }
  
  sendEvent(eventType: string, data: any): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: eventType,
        data,
        timestamp: Date.now()
      }));
    }
  }
}
```

### Safety and Moderation

**New Package:** `packages/moderation`

```typescript
// packages/moderation/src/ContentModerator.ts

export class ContentModerator {
  private profanityFilter: ProfanityFilter;
  private topicClassifier: TopicClassifier;
  
  async moderateMessage(message: string, persona: PersonaCore): Promise<ModerationResult> {
    // Check profanity
    if (this.profanityFilter.containsProfanity(message)) {
      return {
        allowed: false,
        reason: 'profanity_detected',
        sanitized: this.profanityFilter.sanitize(message)
      };
    }
    
    // Check blocked topics
    const topics = await this.topicClassifier.classify(message);
    const blockedTopic = topics.find(t => persona.safety.blockedTopics.includes(t));
    
    if (blockedTopic) {
      return {
        allowed: false,
        reason: 'blocked_topic',
        topic: blockedTopic
      };
    }
    
    return { allowed: true };
  }
  
  async moderateAction(action: Action, persona: PersonaCore): Promise<boolean> {
    // Check if action is in allowlist
    if (!persona.safety.allowedActions.includes(action.type)) {
      return false;
    }
    
    // Check rate limiting
    const recentActions = await this.getRecentActions(persona.id, 60); // Last minute
    if (recentActions.length >= persona.safety.maxActionsPerMinute) {
      return false;
    }
    
    return true;
  }
}

// packages/moderation/src/AuditLogger.ts

export class AuditLogger {
  async logInteraction(interaction: Interaction): Promise<void> {
    await this.storage.write({
      sessionId: interaction.sessionId,
      timestamp: new Date(),
      type: interaction.type,
      data: interaction.data,
      moderationResult: interaction.moderationResult,
      replayable: true
    });
  }
  
  async getSessionReplay(sessionId: string): Promise<Interaction[]> {
    return await this.storage.query({ sessionId });
  }
}
```

### Consumer UX Flow

**Web Interface:** `adapters/web-next/app/deploy`

```typescript
// adapters/web-next/app/deploy/page.tsx

export default function DeployPage() {
  const [persona, setPersona] = useState<PersonaCore | null>(null);
  const [selectedWorld, setSelectedWorld] = useState<'gmod' | 'minecraft' | 'web'>('minecraft');
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'queued' | 'spawning' | 'live'>('idle');
  
  const handleDeploy = async () => {
    // Submit persona for moderation
    const result = await fetch('/api/personas/submit', {
      method: 'POST',
      body: JSON.stringify(persona)
    });
    
    const { id, status } = await result.json();
    
    if (status === 'approved') {
      // Get deployment token
      const approval = await fetch(`/api/personas/${id}/approve`, {
        method: 'POST'
      });
      
      const { token } = await approval.json();
      
      // Spawn in selected world
      setDeploymentStatus('spawning');
      
      const spawn = await fetch('/api/spawn', {
        method: 'POST',
        body: JSON.stringify({
          personaId: id,
          deploymentToken: token,
          world: selectedWorld,
          serverId: 'default'
        })
      });
      
      const { sessionId } = await spawn.json();
      setDeploymentStatus('live');
      
      // Open live session view
      router.push(`/session/${sessionId}/live`);
    }
  };
  
  return (
    <div>
      <h1>Deploy Your AI Companion</h1>
      
      {/* Persona editor */}
      <PersonaEditor persona={persona} onChange={setPersona} />
      
      {/* World selector */}
      <WorldSelector selected={selectedWorld} onChange={setSelectedWorld} />
      
      {/* Deploy button */}
      <button onClick={handleDeploy} disabled={deploymentStatus !== 'idle'}>
        {deploymentStatus === 'idle' && 'Deploy'}
        {deploymentStatus === 'queued' && 'In Queue...'}
        {deploymentStatus === 'spawning' && 'Spawning...'}
        {deploymentStatus === 'live' && 'Live!'}
      </button>
    </div>
  );
}
```

### Metrics and Monitoring

```typescript
// services/deployment/src/MetricsCollector.ts

export class MetricsCollector {
  async recordMetric(metric: DeploymentMetric): Promise<void> {
    await this.storage.write({
      timestamp: new Date(),
      sessionId: metric.sessionId,
      type: metric.type,
      value: metric.value
    });
  }
  
  async getMetrics(timeRange: TimeRange): Promise<MetricsSummary> {
    const metrics = await this.storage.query(timeRange);
    
    return {
      userTouch: this.calculateUserTouch(metrics),
      shipCadence: this.calculateShipCadence(metrics),
      sessionLength: this.calculateAvgSessionLength(metrics),
      retentionD1: this.calculateRetention(metrics, 1),
      retentionD7: this.calculateRetention(metrics, 7),
      abuseRate: this.calculateAbuseRate(metrics),
      moderationMTTR: this.calculateModerationMTTR(metrics),
      crashRate: this.calculateCrashRate(metrics)
    };
  }
}
```

## Data Models

### Enhanced Session Model

```typescript
export interface EnhancedSession extends Session {
  // Existing fields...
  
  // New fields
  difficulty: number; // 0.1 to 1.0
  choicesMade: Choice[];
  npcInteractions: NPCInteraction[];
  analyticsId: string;
  campaignId?: string;
  webhooksTriggered: string[];
  language: string;
  voiceEnabled: boolean;
}

export interface Choice {
  id: string;
  timestamp: Date;
  description: string;
  selectedOption: string;
  availableOptions: string[];
  consequences: string[];
}
```

## Testing Strategy

### Feature Testing Priorities

1. **Template System** - Unit tests for template loading and customization
2. **Difficulty Engine** - Tests for adjustment calculations
3. **Analytics** - Integration tests for data collection
4. **Webhooks** - Tests for delivery and retry logic
5. **Multi-LLM** - Tests for provider switching and fallback
6. **NPC Memory** - Tests for memory persistence and retrieval
7. **Campaign Flow** - End-to-end tests for multi-encounter campaigns

## Performance Considerations

### Caching Strategy

```typescript
// Cache frequently used templates
const templateCache = new LRU({ max: 100 });

// Cache NPC memories for active sessions
const npcMemoryCache = new LRU({ max: 1000 });

// Cache analytics for dashboard
const analyticsCache = new LRU({ max: 50, ttl: 300000 }); // 5 min TTL
```

### Optimization

- Lazy load editor components
- Paginate marketplace listings
- Stream large analytics exports
- Batch webhook deliveries
- Use CDN for template assets

## Security Considerations

- Validate all user-generated content
- Sanitize template parameters
- Rate limit webhook endpoints
- Encrypt stored NPC memories
- Audit marketplace submissions

## Deployment Strategy

### Phase 1: Core Enhancements (Week 1-2)
- Template system
- Dynamic difficulty
- Basic analytics

### Phase 2: Creator Tools (Week 3-4)
- Visual editor
- Marketplace foundation
- CLI tools

### Phase 3: Advanced Features (Week 5-6)
- Multi-LLM support
- NPC memory
- Campaign system

### Phase 4: Polish & Integration (Week 7-8)
- Voice integration
- Localization
- Webhook system
- Performance optimization
