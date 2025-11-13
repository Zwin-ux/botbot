export type BotbotChannel = "web" | "discord" | "sms";

export type SurfacePersonality = {
  name: string;
  archetype: "withholder" | "confessor" | "observer" | "loyalist";
  baseTone: "blunt" | "warm" | "mysterious" | "deadpan";
  languageStyle: "slangy" | "formal" | "compressed" | "rambling";
  boundaries: {
    avoidTopics: string[];
    maxDirectiveLevel: 1 | 2 | 3;
  };
};

export type SecretLayer = {
  secretType: "aboutUser" | "aboutSelf" | "faction" | "worldview";
  payload: Record<string, unknown>;
  influenceWeight: number;
  denialPolicy: "hard-deny" | "soft-dodge";
};

export type LeakProfile = {
  intensity: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  channels: {
    wording: boolean;
    contentBias: boolean;
    stylisticTics: boolean;
  };
  minMessagesBetweenLeaks: number;
  triggerKeywords: string[];
};

export type MemoryPolicy = {
  enabled: boolean;
  maxEventsPerUser: number;
  rememberedDimensions: ("emotion" | "decision" | "topic" | "time")[];
  pretendStatelessAtSurface: boolean;
};

export type ChannelProfile = {
  channel: BotbotChannel;
  maxResponseLength: number;
  styleOverrides?: Partial<SurfacePersonality>;
  leakOverrides?: Partial<LeakProfile>;
};

export type BotbotBlueprint = {
  id: string;
  version: number;
  label: string;
  description: string;
  surfacePersonality: SurfacePersonality;
  secretLayer: SecretLayer;
  leakProfile: LeakProfile;
  memoryPolicy: MemoryPolicy;
  channelProfiles: ChannelProfile[];
  createdAt: string;
  updatedAt: string;
};

export type EffectivePersonality = SurfacePersonality & {
  maxResponseLength: number;
};

export type EffectiveLeakProfile = LeakProfile & {
  lastLeakAt?: number;
};

/**
 * Resolve the effective personality for a blueprint on a given channel.
 */
export function resolveEffectivePersonality(
  blueprint: BotbotBlueprint,
  channel: BotbotChannel
): EffectivePersonality {
  const channelProfile = blueprint.channelProfiles.find(
    (profile) => profile.channel === channel
  );

  const base = blueprint.surfacePersonality;
  const overrides = channelProfile?.styleOverrides ?? {};

  return {
    ...base,
    ...overrides,
    boundaries: {
      ...base.boundaries,
      ...overrides.boundaries,
      avoidTopics:
        overrides.boundaries?.avoidTopics ?? base.boundaries.avoidTopics,
    },
    maxResponseLength: channelProfile?.maxResponseLength ?? 500,
  } as EffectivePersonality;
}

/**
 * Resolve the effective leak profile for a blueprint on a given channel.
 */
export function resolveEffectiveLeakProfile(
  blueprint: BotbotBlueprint,
  channel: BotbotChannel
): LeakProfile {
  const channelProfile = blueprint.channelProfiles.find(
    (profile) => profile.channel === channel
  );
  const baseLeak = blueprint.leakProfile;
  const overrides = channelProfile?.leakOverrides ?? {};
  return {
    ...baseLeak,
    ...overrides,
    channels: {
      ...baseLeak.channels,
      ...overrides.channels,
    },
    triggerKeywords:
      overrides.triggerKeywords ?? baseLeak.triggerKeywords ?? [],
  };
}
