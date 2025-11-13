const { describe, test, expect } = global;

async function loadBlueprintModel() {
  return import("../../build/src/botbot/models/blueprint.js");
}

describe("Blueprint channel overrides", () => {
  test("merges channel style overrides", async () => {
    const { resolveEffectivePersonality, resolveEffectiveLeakProfile } =
      await loadBlueprintModel();
    const blueprint = {
      id: "merge-test",
      version: 1,
      label: "Merge",
      description: "Merge test",
      surfacePersonality: {
        name: "Baseline",
        archetype: "observer",
        baseTone: "warm",
        languageStyle: "formal",
        boundaries: {
          avoidTopics: ["politics"],
          maxDirectiveLevel: 2,
        },
      },
      secretLayer: {
        secretType: "worldview",
        payload: { doctrine: "balance" },
        influenceWeight: 0.4,
        denialPolicy: "hard-deny",
      },
      leakProfile: {
        intensity: 3,
        channels: {
          wording: true,
          contentBias: false,
          stylisticTics: false,
        },
        minMessagesBetweenLeaks: 3,
        triggerKeywords: [],
      },
      memoryPolicy: {
        enabled: true,
        maxEventsPerUser: 5,
        rememberedDimensions: ["emotion"],
        pretendStatelessAtSurface: false,
      },
      channelProfiles: [
        {
          channel: "web",
          maxResponseLength: 200,
          styleOverrides: {
            languageStyle: "slangy",
            boundaries: {
              avoidTopics: ["politics", "finance"],
            },
          },
          leakOverrides: {
            channels: {
              wording: false,
              contentBias: true,
            },
          },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const personality = resolveEffectivePersonality(blueprint, "web");
    const leakProfile = resolveEffectiveLeakProfile(blueprint, "web");

    expect(personality.languageStyle).toBe("slangy");
    expect(personality.boundaries.avoidTopics).toEqual([
      "politics",
      "finance",
    ]);
    expect(leakProfile.channels.contentBias).toBe(true);
    expect(leakProfile.channels.wording).toBe(false);
  });
});
