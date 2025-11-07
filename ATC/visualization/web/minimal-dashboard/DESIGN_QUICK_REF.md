# ST-01 Observer - Design Quick Reference

## Colors (Copy/Paste)

```css
--st-bg: #1A1B1D;           /* Graphite */
--st-panel: #0B0C0E;        /* Carbon Black */
--st-text: #F5F7FA;         /* White */
--st-muted: #7A7C80;        /* Neutral Gray */
--st-accent: #3BF4FB;       /* Radar Cyan */
--st-danger: #FF4D4D;       /* Alert Red */
--st-border: #2A2B2E;       /* Subtle border */
```

## Typography

```css
/* UI */
font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;

/* Code */
font-family: 'JetBrains Mono', ui-monospace, monospace;
```

## Logo SVG

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <g fill="none" stroke="currentColor" stroke-width="8">
    <circle cx="100" cy="100" r="70"/>
    <circle cx="100" cy="100" r="45"/>
  </g>
  <circle cx="140" cy="80" r="6" fill="currentColor"/>
</svg>
```

## React Logo Component

```tsx
import { Logo } from './components/Logo';

<Logo size={28} className="text-[var(--st-accent)]" />
```

## Button Styles

```css
/* Ghost */
button {
  background: transparent;
  border: 1px solid var(--st-border);
  color: var(--st-text);
}

/* Primary */
button.primary {
  background: var(--st-accent);
  color: var(--st-panel);
}
```

## Card Style

```css
.card {
  background: var(--st-panel);
  border: 1px solid var(--st-border);
  border-radius: 10px;
  padding: 1rem;
}
```

## Status Dots

```css
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.connected { background: var(--st-accent); }
.disconnected { background: var(--st-danger); }
.connecting { background: var(--st-muted); }
```

## Focus State

```css
:focus-visible {
  outline: 2px solid var(--st-accent);
  outline-offset: 2px;
}
```

## Sora Prompt

```
Top-down minimal UI scene of concentric radar rings on a graphite background. 
A cyan radar sweep rotates once every 3 seconds. A single cyan blip pulses 
gently every 240ms when it crosses the sweep. No gradients, no 3D lighting, 
no textures. Orthographic camera, fixed. Monochrome lines with cyan accent. 
Loop seamlessly in 10 seconds.
```

## Copy Tone

✅ "Decision Feed"  
✅ "Safety Violations / 1k steps"  
✅ "Open Dashboard"  

❌ "Amazing AI Insights!"  
❌ "Revolutionary Platform"  

## Forbidden

- Stock gradients
- Glassmorphism
- Drop shadows > 8px
- Random animations
- Low contrast text

---

**Full docs:** `ST01_DESIGN_SYSTEM.md`  
**Prompt pack:** `st01_observer_prompt_pack.json`
