// AgentOrchestrator: loads skills, queries memory, selects skill, executes with timeout, upserts to memory.
// Env vars used: inherits from skills, embeddings, and memory modules.

import { loadBuiltinSkills } from '../skills/loader';
import { Skill, SkillContext, SkillResult } from '../skills/skill';
import { VectorStore, JsonlVectorStore } from '../memory/vector-memory';
import { EmbeddingAdapter, MockEmbeddings, OpenAIEmbeddings } from '../llm/embeddings';

export interface AgentRequest {
  userId: string;
  sessionId: string;
  userMessage: string;
}

export interface AgentResponse {
  success: boolean;
  skillUsed: string;
  result: SkillResult;
  timings: {
    skillSelection: number;
    skillExecution: number;
    memoryUpsert: number;
  };
  trace: string[];
}

const SKILL_TIMEOUT_MS = 15000;

export class AgentOrchestrator {
  private skills: Skill[] = [];
  private vectorStore: VectorStore;
  private embeddingAdapter: EmbeddingAdapter;

  constructor(embeddingAdapter?: EmbeddingAdapter, vectorStore?: VectorStore) {
    this.embeddingAdapter =
      embeddingAdapter || (process.env.OPENAI_API_KEY ? new OpenAIEmbeddings() : new MockEmbeddings());
    this.vectorStore = vectorStore || new JsonlVectorStore(this.embeddingAdapter);
  }

  async initialize(): Promise<void> {
    this.skills = await loadBuiltinSkills();
  }

  async handle(request: AgentRequest): Promise<AgentResponse> {
    const trace: string[] = [];
    const timings = { skillSelection: 0, skillExecution: 0, memoryUpsert: 0 };

    // Skill selection
    const selectionStart = Date.now();
    const selectedSkill = await this.selectSkill(request.userMessage, trace);
    timings.skillSelection = Date.now() - selectionStart;

    // Execute skill
    const execStart = Date.now();
    const context: SkillContext = {
      userId: request.userId,
      sessionId: request.sessionId,
      userMessage: request.userMessage,
      timestamp: Date.now(),
    };
    const result = await this.executeSkillWithTimeout(selectedSkill, context, trace);
    timings.skillExecution = Date.now() - execStart;

    // Upsert to memory (async, don't block response)
    const upsertStart = Date.now();
    await this.vectorStore
      .upsert({
        id: `${request.userId}:${Date.now()}`,
        text: request.userMessage,
        metadata: { userId: request.userId, sessionId: request.sessionId },
      })
      .catch((err) => {
        trace.push(`Memory upsert error: ${err instanceof Error ? err.message : String(err)}`);
      });
    timings.memoryUpsert = Date.now() - upsertStart;

    return {
      success: result.success,
      skillUsed: selectedSkill.name,
      result,
      timings,
      trace,
    };
  }

  private async selectSkill(message: string, trace: string[]): Promise<Skill> {
    // Simple embeddings-based selection: embed message and skill descriptions, pick highest cosine sim
    try {
      const messageEmbed = await this.embeddingAdapter.embed(message);
      const skillEmbeds = await Promise.all(
        this.skills.map((s) => this.embeddingAdapter.embed(s.description))
      );
      let bestIdx = 0;
      let bestScore = -Infinity;
      for (let i = 0; i < skillEmbeds.length; i++) {
        const score = this.cosineSim(messageEmbed, skillEmbeds[i]);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      trace.push(`Selected skill: ${this.skills[bestIdx].name} (score: ${bestScore.toFixed(3)})`);
      return this.skills[bestIdx];
    } catch (err) {
      trace.push(`Skill selection error: ${err instanceof Error ? err.message : String(err)}`);
      // Fallback to first skill
      return this.skills[0] || this.getFallbackSkill();
    }
  }

  private cosineSim(a: number[], b: number[]): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  private async executeSkillWithTimeout(
    skill: Skill,
    context: SkillContext,
    trace: string[]
  ): Promise<SkillResult> {
    try {
      const result = await Promise.race<SkillResult>([
        skill.execute(context),
        new Promise<SkillResult>((_, reject) =>
          setTimeout(() => reject(new Error('Skill execution timeout')), SKILL_TIMEOUT_MS)
        ),
      ]);
      trace.push(`Skill ${skill.name} executed successfully`);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      trace.push(`Skill ${skill.name} execution error: ${error}`);
      return { success: false, error };
    }
  }

  private getFallbackSkill(): Skill {
    return {
      name: 'fallback',
      description: 'Fallback skill when no other skill is available.',
      async execute(): Promise<SkillResult> {
        return { success: true, data: { reply: 'No skills available' } };
      },
    };
  }
}
