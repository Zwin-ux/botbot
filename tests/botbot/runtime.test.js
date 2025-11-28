const { describe, test, expect } = global;

async function loadRuntime() {
  return import("../../build/src/botbot/runtime/index.js");
}

async function loadStore() {
  return import("../../build/src/botbot/store/blueprintStore.js");
}

function createBlueprintPayload(overrides = {}) {
  const timestamp = new Date().toISOString();
  return {
    id: `bp-${Math.random().toString(36).slice(2)}`,
    version: 1,
    label: "Test",
    description: "Test blueprint",
    surfacePersonality: {
      name: "Tester",
      archetype: "observer",
      baseTone: "warm",
      languageStyle: "formal",
      boundaries: {
        avoidTopics: [],
        maxDirectiveLevel: 2,
      },
    },
    secretLayer: {
      secretType: "aboutSelf",
      payload: { focus: "oranges" },
      influenceWeight: 0.7,
      denialPolicy: "soft-dodge",
    },
    leakProfile: {
      intensity: 6,
      channels: {
        wording: true,
        contentBias: false,
        stylisticTics: false,
      },
      minMessagesBetweenLeaks: 2,
      triggerKeywords: ["leak"],
    },
    memoryPolicy: {
      enabled: true,
      maxEventsPerUser: 10,
      rememberedDimensions: ["emotion", "topic"],
      pretendStatelessAtSurface: false,
    },
    channelProfiles: [
      {
        channel: "web",
        maxResponseLength: 300,
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

describe("runBotbotTurn", () => {
  test("returns secret influence score when secret weight is applied", async () => {
    const { runBotbotTurn } = await loadRuntime();
    const { createBlueprint } = await loadStore();
    const blueprint = createBlueprintPayload({
      secretLayer: {
        secretType: "faction",
        payload: { agenda: "promote oranges" },
        influenceWeight: 0.9,
        denialPolicy: "soft-dodge",
      },
      leakProfile: {
        intensity: 7,
        channels: {
          wording: true,
          contentBias: false,
          stylisticTics: false,
        },
        minMessagesBetweenLeaks: 5,
        triggerKeywords: [],
      },
    });
    await createBlueprint(blueprint);

    const result = await runBotbotTurn({
      blueprintId: blueprint.id,
      channel: "web",
      userId: "user-secret",
      message: "What should I focus on?",
    });

    expect(result.debug).toBeDefined();
    expect(result.debug.secretInfluenceScore).toBeGreaterThan(0);
  });

  test("triggers leak after threshold", async () => {
    const { runBotbotTurn } = await loadRuntime();
    const { createBlueprint } = await loadStore();
    const blueprint = createBlueprintPayload({
      leakProfile: {
        intensity: 8,
        channels: {
          wording: false,
          contentBias: true,
          stylisticTics: false,
        },
        minMessagesBetweenLeaks: 2,
        triggerKeywords: [],
      },
    });
    await createBlueprint(blueprint);

    const first = await runBotbotTurn({
      blueprintId: blueprint.id,
      channel: "web",
      userId: "user-leak",
      message: "hello",
    });

    const second = await runBotbotTurn({
      blueprintId: blueprint.id,
      channel: "web",
      userId: "user-leak",
      message: "tell me more",
    });

    expect(first.debug?.leakTriggered).toBeFalsy();
    expect(second.debug?.leakTriggered).toBeTruthy();
    expect(second.debug?.leakChannel).toBe("contentBias");
  });
});
