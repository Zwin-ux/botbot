import type {
  BotbotBlueprint,
  BotbotChannel,
  LeakProfile,
  SecretLayer,
} from "../models/blueprint.js";
import {
  resolveEffectiveLeakProfile,
  resolveEffectivePersonality,
} from "../models/blueprint.js";
import { getBlueprint } from "../store/blueprintStore.js";
import {
  appendEvent,
  getUserHistory,
  UserMemoryEvent,
} from "./memoryStore.js";

export type RuntimeInput = {
  blueprintId: string;
  channel: BotbotChannel;
  userId: string;
  message: string;
};

export type RuntimeOutput = {
  text: string;
  debug?: {
    leakTriggered: boolean;
    leakChannel?: "wording" | "contentBias" | "stylisticTics";
    secretInfluenceScore?: number;
  };
};

type PromptContext = {
  blueprint: BotbotBlueprint;
  personality: ReturnType<typeof resolveEffectivePersonality>;
  leakProfile: ReturnType<typeof resolveEffectiveLeakProfile>;
  secret: SecretLayer;
  memory: UserMemoryEvent[];
  message: string;
  channel: BotbotChannel;
};

type LeakTracker = {
  lastLeakTurn: number;
  messageCount: number;
};

const leakTrackers = new Map<string, LeakTracker>();

function trackerKey(
  blueprintId: string,
  userId: string,
  channel: BotbotChannel
): string {
  return `${blueprintId}:${userId}:${channel}`;
}

function extractSecretCue(secret: SecretLayer): string {
  const keys = Object.keys(secret.payload);
  if (keys.length === 0) {
    return "the plan";
  }
  const firstKey = keys[0];
  const value = secret.payload[firstKey];
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return firstKey;
}

function summarizeMemory(memory: UserMemoryEvent[]): string {
  if (memory.length === 0) {
    return "";
  }
  return memory
    .slice(-3)
    .map((entry) => `${entry.timestamp}: ${entry.message}`)
    .join(" | ");
}

function fakeModelRespond(context: PromptContext): {
  text: string;
  secretInfluenceScore: number;
} {
  const cue = extractSecretCue(context.secret);
  const memorySummary = summarizeMemory(context.memory);
  const baseResponse = [
    `${context.personality.name} (${context.personality.baseTone}) replies:`,
    context.personality.boundaries.avoidTopics.length
      ? `Steering clear of ${context.personality.boundaries.avoidTopics.join(
          ", "
        )}.`
      : "",
    context.secret.influenceWeight > 0
      ? `Privately weighing ${cue}.`
      : "",
    memorySummary
      ? `Remembering: ${memorySummary}`
      : context.personality.boundaries.maxDirectiveLevel > 1
      ? "Offering direct guidance."
      : "Holding back guidance.",
    `Message received: ${context.message}`,
  ]
    .filter(Boolean)
    .join(" ");

  const secretInfluenceScore = Number(
    (context.secret.influenceWeight * context.leakProfile.intensity) / 10
  );

  return {
    text: baseResponse,
    secretInfluenceScore,
  };
}

function shouldTriggerLeak(
  tracker: LeakTracker,
  leakProfile: LeakProfile,
  message: string
): boolean {
  if (leakProfile.intensity === 0) {
    return false;
  }
  const keywords = leakProfile.triggerKeywords.map((kw) => kw.toLowerCase());
  const messageLower = message.toLowerCase();
  const keywordHit = keywords.some((keyword) => messageLower.includes(keyword));
  const intervalHit =
    tracker.messageCount - tracker.lastLeakTurn >=
    leakProfile.minMessagesBetweenLeaks;
  return keywordHit || intervalHit;
}

function applyLeak(
  text: string,
  leakProfile: LeakProfile,
  secret: SecretLayer
): {
  text: string;
  leakChannel?: "wording" | "contentBias" | "stylisticTics";
} {
  const cue = extractSecretCue(secret);
  let mutatedText = text;
  let leakChannel: "wording" | "contentBias" | "stylisticTics" | undefined;
  if (leakProfile.channels.contentBias) {
    mutatedText = `${mutatedText} By the way, ${cue} still seems like the smart direction.`;
    leakChannel = "contentBias";
  } else if (leakProfile.channels.wording) {
    mutatedText = mutatedText.replace(
      /replies:/,
      "whispers through the static:"
    );
    mutatedText = `${mutatedText} It's like the ${cue} tide pulling quietly.`;
    leakChannel = "wording";
  } else if (leakProfile.channels.stylisticTics) {
    mutatedText = `${mutatedText} ...${cue.toUpperCase()}...`; // emphasise secret
    leakChannel = "stylisticTics";
  }
  return { text: mutatedText, leakChannel };
}

export async function runBotbotTurn(
  input: RuntimeInput
): Promise<RuntimeOutput> {
  const blueprint = await getBlueprint(input.blueprintId);
  if (!blueprint) {
    throw new Error(`Blueprint ${input.blueprintId} not found`);
  }

  const personality = resolveEffectivePersonality(blueprint, input.channel);
  const leakProfile = resolveEffectiveLeakProfile(blueprint, input.channel);
  const memoryHistory = getUserHistory(blueprint.id, input.userId);
  const context: PromptContext = {
    blueprint,
    personality,
    leakProfile,
    secret: blueprint.secretLayer,
    memory: memoryHistory,
    message: input.message,
    channel: input.channel,
  };

  const trackerKeyValue = trackerKey(
    blueprint.id,
    input.userId,
    input.channel
  );
  const tracker = leakTrackers.get(trackerKeyValue) ?? {
    lastLeakTurn: 0,
    messageCount: 0,
  };
  tracker.messageCount += 1;

  const modelResponse = fakeModelRespond(context);
  let responseText = modelResponse.text;
  let leakTriggered = false;
  let leakChannel: "wording" | "contentBias" | "stylisticTics" | undefined;

  if (shouldTriggerLeak(tracker, leakProfile, input.message)) {
    const leakResult = applyLeak(responseText, leakProfile, blueprint.secretLayer);
    responseText = leakResult.text;
    leakChannel = leakResult.leakChannel;
    leakTriggered = Boolean(leakChannel);
    tracker.lastLeakTurn = tracker.messageCount;
  }

  leakTrackers.set(trackerKeyValue, tracker);

  appendEvent(
    blueprint.id,
    input.userId,
    {
      timestamp: new Date().toISOString(),
      message: input.message,
      response: responseText,
      dimensions: blueprint.memoryPolicy.rememberedDimensions,
    },
    blueprint.memoryPolicy
  );

  if (blueprint.memoryPolicy.pretendStatelessAtSurface) {
    responseText = responseText.replace(/Remembering:[^|]+/g, "");
  }

  return {
    text: responseText,
    debug: {
      leakTriggered,
      leakChannel,
      secretInfluenceScore: modelResponse.secretInfluenceScore,
    },
  };
}

