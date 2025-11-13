import React, { useEffect, useMemo, useState } from "react";
import type {
  BotbotBlueprint,
  ChannelProfile,
  LeakProfile,
  SurfacePersonality,
} from "../../src/botbot/models/blueprint.js";

export interface BlueprintEditorProps {
  initialBlueprint?: BotbotBlueprint;
}

type ConversationMessage = {
  role: "user" | "bot";
  text: string;
  debug?: {
    leakTriggered: boolean;
    leakChannel?: "wording" | "contentBias" | "stylisticTics";
    secretInfluenceScore?: number;
  };
};

const emptyPersonality: SurfacePersonality = {
  name: "Unnamed",
  archetype: "observer",
  baseTone: "warm",
  languageStyle: "formal",
  boundaries: {
    avoidTopics: [],
    maxDirectiveLevel: 2,
  },
};

const emptyLeakProfile: LeakProfile = {
  intensity: 0,
  channels: {
    wording: false,
    contentBias: false,
    stylisticTics: false,
  },
  minMessagesBetweenLeaks: 3,
  triggerKeywords: [],
};

function createEmptyBlueprint(): BotbotBlueprint {
  const timestamp = new Date().toISOString();
  return {
    id: `blueprint-${timestamp}`,
    version: 1,
    label: "New Blueprint",
    description: "",
    surfacePersonality: emptyPersonality,
    secretLayer: {
      secretType: "aboutSelf",
      payload: {},
      influenceWeight: 0.2,
      denialPolicy: "soft-dodge",
    },
    leakProfile: emptyLeakProfile,
    memoryPolicy: {
      enabled: true,
      maxEventsPerUser: 20,
      rememberedDimensions: ["emotion", "topic"],
      pretendStatelessAtSurface: false,
    },
    channelProfiles: [
      {
        channel: "web",
        maxResponseLength: 400,
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function updateArrayItem<T>(items: T[], index: number, value: Partial<T>): T[] {
  return items.map((item, idx) => (idx === index ? { ...item, ...value } : item));
}

function renderJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(error);
  }
}

const sectionStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "1rem",
  marginBottom: "1rem",
  borderRadius: "8px",
};

export const BlueprintEditor: React.FC<BlueprintEditorProps> = ({
  initialBlueprint,
}) => {
  const [blueprint, setBlueprint] = useState<BotbotBlueprint>(
    initialBlueprint ?? createEmptyBlueprint()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [testInput, setTestInput] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (initialBlueprint) {
      setBlueprint(initialBlueprint);
    }
  }, [initialBlueprint]);

  const channelProfiles = useMemo<ChannelProfile[]>(
    () => blueprint.channelProfiles,
    [blueprint.channelProfiles]
  );

  const handlePersonalityChange = (
    key: keyof SurfacePersonality,
    value: string
  ) => {
    setBlueprint((prev) => ({
      ...prev,
      surfacePersonality: {
        ...prev.surfacePersonality,
        [key]: key === "boundaries" ? prev.surfacePersonality.boundaries : value,
      },
    }));
  };

  const handleBoundaryChange = (
    key: keyof SurfacePersonality["boundaries"],
    value: string
  ) => {
    setBlueprint((prev) => ({
      ...prev,
      surfacePersonality: {
        ...prev.surfacePersonality,
        boundaries: {
          ...prev.surfacePersonality.boundaries,
          [key]:
            key === "avoidTopics"
              ? value.split(",").map((item) => item.trim()).filter(Boolean)
              : Number(value),
        },
      },
    }));
  };

  const handleLeakChannelChange = (
    channel: keyof LeakProfile["channels"],
    value: boolean
  ) => {
    setBlueprint((prev) => ({
      ...prev,
      leakProfile: {
        ...prev.leakProfile,
        channels: {
          ...prev.leakProfile.channels,
          [channel]: value,
        },
      },
    }));
  };

  const handleChannelProfileChange = (
    index: number,
    field: keyof ChannelProfile,
    value: string
  ) => {
    setBlueprint((prev) => ({
      ...prev,
      channelProfiles: updateArrayItem(prev.channelProfiles, index, {
        [field]:
          field === "maxResponseLength" ? Number(value) : (value as never),
      }),
    }));
  };

  const addChannelProfile = () => {
    setBlueprint((prev) => ({
      ...prev,
      channelProfiles: [
        ...prev.channelProfiles,
        {
          channel: "discord",
          maxResponseLength: 350,
        },
      ],
    }));
  };

  const saveBlueprint = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await fetch("/api/blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blueprint),
      });
      if (!response.ok) {
        throw new Error(`Save failed with status ${response.status}`);
      }
      const saved = (await response.json()) as BotbotBlueprint;
      setBlueprint(saved);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  };

  const sendTestMessage = async () => {
    if (!testInput.trim()) {
      return;
    }
    const userMessage: ConversationMessage = { role: "user", text: testInput };
    setConversation((prev) => [...prev, userMessage]);
    setTestInput("");

    try {
      const response = await fetch(`/api/agents/${blueprint.id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "web",
          userId: "test-user",
          message: userMessage.text,
        }),
      });
      const result = await response.json();
      const botMessage: ConversationMessage = {
        role: "bot",
        text: result.text,
        debug: result.debug,
      };
      setConversation((prev) => [...prev, botMessage]);
    } catch (error) {
      setConversation((prev) => [
        ...prev,
        {
          role: "bot",
          text:
            error instanceof Error
              ? `Error: ${error.message}`
              : "Unexpected error",
        },
      ]);
    }
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <header>
        <h1>Blueprint Editor</h1>
        <button onClick={saveBlueprint} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
        {saveError && <p style={{ color: "red" }}>{saveError}</p>}
      </header>

      <section style={sectionStyle}>
        <h2>Surface Personality</h2>
        <label>
          Name
          <input
            value={blueprint.surfacePersonality.name}
            onChange={(event) => handlePersonalityChange("name", event.target.value)}
          />
        </label>
        <label>
          Archetype
          <select
            value={blueprint.surfacePersonality.archetype}
            onChange={(event) =>
              handlePersonalityChange("archetype", event.target.value)
            }
          >
            <option value="withholder">Withholder</option>
            <option value="confessor">Confessor</option>
            <option value="observer">Observer</option>
            <option value="loyalist">Loyalist</option>
          </select>
        </label>
        <label>
          Base tone
          <select
            value={blueprint.surfacePersonality.baseTone}
            onChange={(event) =>
              handlePersonalityChange("baseTone", event.target.value)
            }
          >
            <option value="blunt">Blunt</option>
            <option value="warm">Warm</option>
            <option value="mysterious">Mysterious</option>
            <option value="deadpan">Deadpan</option>
          </select>
        </label>
        <label>
          Language style
          <select
            value={blueprint.surfacePersonality.languageStyle}
            onChange={(event) =>
              handlePersonalityChange("languageStyle", event.target.value)
            }
          >
            <option value="slangy">Slangy</option>
            <option value="formal">Formal</option>
            <option value="compressed">Compressed</option>
            <option value="rambling">Rambling</option>
          </select>
        </label>
        <label>
          Avoid topics
          <input
            value={blueprint.surfacePersonality.boundaries.avoidTopics.join(", ")}
            onChange={(event) =>
              handleBoundaryChange("avoidTopics", event.target.value)
            }
          />
        </label>
        <label>
          Max directive level
          <input
            type="number"
            min={1}
            max={3}
            value={blueprint.surfacePersonality.boundaries.maxDirectiveLevel}
            onChange={(event) =>
              handleBoundaryChange("maxDirectiveLevel", event.target.value)
            }
          />
        </label>
      </section>

      <section style={sectionStyle}>
        <h2>Secret Layer</h2>
        <label>
          Secret type
          <select
            value={blueprint.secretLayer.secretType}
            onChange={(event) =>
              setBlueprint((prev) => ({
                ...prev,
                secretLayer: {
                  ...prev.secretLayer,
                  secretType: event.target.value as BotbotBlueprint["secretLayer"]["secretType"],
                },
              }))
            }
          >
            <option value="aboutUser">About User</option>
            <option value="aboutSelf">About Self</option>
            <option value="faction">Faction</option>
            <option value="worldview">Worldview</option>
          </select>
        </label>
        <label>
          Influence weight
          <input
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={blueprint.secretLayer.influenceWeight}
            onChange={(event) =>
              setBlueprint((prev) => ({
                ...prev,
                secretLayer: {
                  ...prev.secretLayer,
                  influenceWeight: Number(event.target.value),
                },
              }))
            }
          />
        </label>
        <label>
          Denial policy
          <select
            value={blueprint.secretLayer.denialPolicy}
            onChange={(event) =>
              setBlueprint((prev) => ({
                ...prev,
                secretLayer: {
                  ...prev.secretLayer,
                  denialPolicy: event.target.value as BotbotBlueprint["secretLayer"]["denialPolicy"],
                },
              }))
            }
          >
            <option value="hard-deny">Hard deny</option>
            <option value="soft-dodge">Soft dodge</option>
          </select>
        </label>
        <label>
          Secret payload (JSON)
          <textarea
            rows={4}
            value={renderJson(blueprint.secretLayer.payload)}
            onChange={(event) => {
              try {
                const parsed = JSON.parse(event.target.value);
                setBlueprint((prev) => ({
                  ...prev,
                  secretLayer: {
                    ...prev.secretLayer,
                    payload: parsed,
                  },
                }));
              } catch (error) {
                // ignore malformed json to avoid blocking typing
              }
            }}
          />
        </label>
      </section>

      <section style={sectionStyle}>
        <h2>Leak Profile</h2>
        <label>
          Intensity
          <input
            type="number"
            min={0}
            max={10}
            value={blueprint.leakProfile.intensity}
            onChange={(event) =>
              setBlueprint((prev) => ({
                ...prev,
                leakProfile: {
                  ...prev.leakProfile,
                  intensity: Number(event.target.value) as LeakProfile["intensity"],
                },
              }))
            }
          />
        </label>
        <label>
          Min messages between leaks
          <input
            type="number"
            min={0}
            value={blueprint.leakProfile.minMessagesBetweenLeaks}
            onChange={(event) =>
              setBlueprint((prev) => ({
                ...prev,
                leakProfile: {
                  ...prev.leakProfile,
                  minMessagesBetweenLeaks: Number(event.target.value),
                },
              }))
            }
          />
        </label>
        <label>
          Trigger keywords
          <input
            value={blueprint.leakProfile.triggerKeywords.join(", ")}
            onChange={(event) =>
              setBlueprint((prev) => ({
                ...prev,
                leakProfile: {
                  ...prev.leakProfile,
                  triggerKeywords: event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                },
              }))
            }
          />
        </label>
        <div>
          <h3>Channels</h3>
          {Object.entries(blueprint.leakProfile.channels).map(([key, value]) => (
            <label key={key} style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={value}
                onChange={(event) =>
                  handleLeakChannelChange(key as keyof LeakProfile["channels"], event.target.checked)
                }
              />
              {key}
            </label>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2>Memory Policy</h2>
        <label>
          <input
            type="checkbox"
            checked={blueprint.memoryPolicy.enabled}
            onChange={(event) =>
              setBlueprint((prev) => ({
                ...prev,
                memoryPolicy: {
                  ...prev.memoryPolicy,
                  enabled: event.target.checked,
                },
              }))
            }
          />
          Memory enabled
        </label>
        <label>
          Max events per user
          <input
            type="number"
            min={1}
            value={blueprint.memoryPolicy.maxEventsPerUser}
            onChange={(event) =>
              setBlueprint((prev) => ({
                ...prev,
                memoryPolicy: {
                  ...prev.memoryPolicy,
                  maxEventsPerUser: Number(event.target.value),
                },
              }))
            }
          />
        </label>
        <label>
          Pretend stateless at surface
          <input
            type="checkbox"
            checked={blueprint.memoryPolicy.pretendStatelessAtSurface}
            onChange={(event) =>
              setBlueprint((prev) => ({
                ...prev,
                memoryPolicy: {
                  ...prev.memoryPolicy,
                  pretendStatelessAtSurface: event.target.checked,
                },
              }))
            }
          />
        </label>
      </section>

      <section style={sectionStyle}>
        <h2>Channel Profiles</h2>
        <table>
          <thead>
            <tr>
              <th>Channel</th>
              <th>Max response length</th>
            </tr>
          </thead>
          <tbody>
            {channelProfiles.map((profile, index) => (
              <tr key={`${profile.channel}-${index}`}>
                <td>
                  <select
                    value={profile.channel}
                    onChange={(event) =>
                      handleChannelProfileChange(index, "channel", event.target.value)
                    }
                  >
                    <option value="web">Web</option>
                    <option value="discord">Discord</option>
                    <option value="sms">SMS</option>
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    value={profile.maxResponseLength}
                    onChange={(event) =>
                      handleChannelProfileChange(
                        index,
                        "maxResponseLength",
                        event.target.value
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addChannelProfile}>Add channel profile</button>
      </section>

      <section style={{ ...sectionStyle, display: "flex", gap: "1rem" }}>
        <div style={{ flex: 2 }}>
          <h2>Test Conversation</h2>
          <div
            style={{
              border: "1px solid #ddd",
              padding: "0.5rem",
              minHeight: "200px",
            }}
          >
            {conversation.map((item, index) => (
              <div key={index}>
                <strong>{item.role === "user" ? "User" : "Bot"}:</strong> {item.text}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", marginTop: "0.5rem", gap: "0.5rem" }}>
            <input
              value={testInput}
              onChange={(event) => setTestInput(event.target.value)}
              placeholder="Send a test message"
              style={{ flex: 1 }}
            />
            <button onClick={sendTestMessage}>Send</button>
          </div>
        </div>
        <aside style={{ flex: 1 }}>
          <h3>Debug</h3>
          {conversation
            .filter((message) => message.role === "bot")
            .slice(-1)
            .map((message, index) => (
              <pre key={index}>{renderJson(message.debug)}</pre>
            ))}
        </aside>
      </section>
    </div>
  );
};

export default BlueprintEditor;
