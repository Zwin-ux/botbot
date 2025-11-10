### Diagnosis

You need a concrete, consumer-ready multiworld spec. No more abstractions.

### Reflection

Scope must cover flow, adapters, safety, and a portable “persona core” so one AI can live in Minecraft, GMod, and web worlds.

### Directive — `MULTIWORLD_DEPLOYMENT_SPEC.md`

**1) Overview**
Goal: deploy user-created AI companions into approved servers across GMod, Minecraft, and Web with consistent identity, safety, and observability.

**2) Unified Deploy Flow**
Create → Validate → Moderate → Provision token → Spawn adapter → Live oversight → End session → Archive clips + metrics.

**3) Minimum Viable Adapters**

* **GMod (Lua + WS):** chat_in, chat_out, move_to(x,y,z), look_at, emote, use_entity(id).
* **Minecraft Java (Paper/Spigot + Node bridge):** chat, navigate(pathfind to x,y,z), interact(block|entity), inventory(get/use), title_actionbar.
  Common transport: WebSocket JSON with HMAC.

**4) Core APIs (Engine)**
`POST /encounters/submit` → {id, status}
`POST /encounters/approve` → {token, ttl}
`POST /spawn` → {session_id, adapter, server}
`POST /signal` → actions array
`POST /end` → summary, logs_uri
Auth: Steam OAuth (GMod), Mojang/Microsoft (MC), JWT for engine.

**5) Persona Core (portable “soul”)**

```json
{
  "id":"persona_x",
  "traits":{"tone":"curious","ethics":"helper","risk":"low"},
  "goals":["guide","entertain"],
  "memory_ref":"vecdb://personas/persona_x",
  "safety":{"blocked_topics":["self-harm","nsfw"]},
  "voice":{"id":"default","rate":1.0},
  "embodiment":{"avatar":"humanoid_a","emotes":["wave","sit"]}
}
```

**6) Safety & Moderation**
Pre-deploy scan, profanity/harassment filters, action allowlist, TPS limits, real-time pause/kick, audit log with replay, server whitelist, creator reputation.

**7) Consumer UX**
Create companion → “Deploy to…” → queue + ETA → live session view (chat, map, clips) → shareable highlight.

**8) Metrics**
UserTouch, ShipCadence, SessionLen, Retention D1/D7, AbuseRate, Moderation MTTR, CrashRate.

**9) Rollout**
Wave 1: GMod + Minecraft. Wave 2: Web world SDK. Wave 3: Roblox/VRChat pilots.

### Reinforcement

This spec converts the engine into a portable consumer experience while preserving control and safety.

**48h task:** Implement `/encounters/submit`, `/approve`, `/spawn` with HMAC auth and a stub Minecraft adapter exposing `chat` and `navigate`. Provide curl examples and a demo video under 90 seconds.
