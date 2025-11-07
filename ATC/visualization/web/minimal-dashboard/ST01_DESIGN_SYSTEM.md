# ST-01 Observer Design System

## Identity

**Name:** ST-01 Observer  
**Descriptor:** Experimental AI ATC observation platform with real-time visualization, automated reasoning, and minimal engineering UI  
**Logo:** Synthetic Eye (concentric circles with observation point)

## Principles

1. **Truth over aesthetics** - Real data > pretty UI
2. **SVG-first** - No gradients, no drop shadows
3. **Dark neutral base** - Cyan as functional accent
4. **Readable** - 12–14px minimum, WCAG AA or better
5. **Deterministic motion** - Radar sweep every 3s

## Color Palette

```css
--st-bg: #1A1B1D;           /* Graphite - Main background */
--st-panel: #0B0C0E;        /* Carbon Black - Panels/cards */
--st-text: #F5F7FA;         /* White - Primary text */
--st-muted: #7A7C80;        /* Neutral Gray - Secondary text */
--st-accent: #3BF4FB;       /* Radar Cyan - Accents/highlights */
--st-danger: #FF4D4D;       /* Alert Red - Errors/warnings */
--st-border: #2A2B2E;       /* Subtle borders */
```

### Usage

- **Background:** Graphite (#1A1B1D)
- **Surfaces:** Carbon Black (#0B0C0E) with 1px Neutral Gray borders
- **Text:** White (#F5F7FA) primary, Neutral Gray (#7A7C80) secondary
- **Accents:** Radar Cyan (#3BF4FB) for interactive elements, focus states
- **Alerts:** Alert Red (#FF4D4D) on Carbon background

### Contrast Ratios

All combinations meet WCAG AA:
- White on Graphite: 14.2:1 (AAA)
- White on Carbon: 16.8:1 (AAA)
- Cyan on Carbon: 12.1:1 (AAA)
- Neutral Gray on Graphite: 4.8:1 (AA)

## Typography

### Fonts

**UI Primary:** Inter Tight, Inter, system-ui  
**Data/Code:** JetBrains Mono, ui-monospace

### Scale

- **H1:** 22–28px, semibold (600), -0.02em tracking
- **H2:** 18–22px, semibold (600), -0.01em tracking
- **Body:** 14–16px, regular (400), -0.01em tracking
- **Code:** 12–13px, regular (400), -0.02em tracking
- **Small:** 12–13px, medium (500), -0.01em tracking

### Line Height

- Headings: 1.3
- Body: 1.4–1.5
- Code: 1.5

## Iconography

**Style:** Monoline, 1.5–2px stroke at 24px grid  
**Caps:** Rounded  
**Fills:** None except state dots

**Core Set:**
- play, pause, reset
- alert, aircraft, sector
- chart, terminal

## Layout

### Grid

- 12-column fluid
- 8px base spacing scale (8, 16, 24, 32, 48, 64)
- Max width: 1400px

### Surfaces

- Background: Graphite
- Panels: Carbon with 1px border
- Border radius: 8–12px
- Padding: 1rem (16px) standard

## Motion

### Timing

- **Radar sweep:** 3s period, linear
- **Blip pulse:** 240ms, ease-out
- **UI transitions:** 120–180ms, ease-out
- **Hover states:** 150ms, ease-out

### Transforms

- Prefer `opacity` + `translateY` (4–8px)
- Use CSS transforms over `top`/`left`
- Batch WebSocket updates to avoid thrash

## Components

### Buttons

```css
/* Ghost (default) */
background: transparent;
border: 1px solid var(--st-border);
border-radius: 6px;
padding: 0.5rem 1rem;

/* Primary */
background: var(--st-accent);
color: var(--st-panel);
```

### Cards

```css
background: var(--st-panel);
border: 1px solid var(--st-border);
border-radius: 10px;
padding: 1rem;
```

### Status Dots

```css
width: 8px;
height: 8px;
border-radius: 50%;

.connected { background: var(--st-accent); }
.disconnected { background: var(--st-danger); }
.connecting { background: var(--st-muted); }
```

### Badges

```css
padding: 0.25rem 0.5rem;
border-radius: 3px;
font-size: 0.75em;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.05em;

.success { background: rgba(59, 244, 251, 0.1); color: var(--st-accent); }
.error { background: rgba(255, 77, 77, 0.1); color: var(--st-danger); }
```

## Accessibility

### Focus States

```css
:focus-visible {
  outline: 2px solid var(--st-accent);
  outline-offset: 2px;
}
```

### Disabled States

```css
opacity: 0.6;
cursor: not-allowed;
```

### ARIA

- All interactive elements have labels
- Status indicators use `aria-live`
- SVG logos have `role="img"` and `aria-label`

## Logo Usage

### SVG Code

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <g fill="none" stroke="currentColor" stroke-width="8">
    <circle cx="100" cy="100" r="70"/>
    <circle cx="100" cy="100" r="45"/>
  </g>
  <circle cx="140" cy="80" r="6" fill="currentColor"/>
</svg>
```

### Sizes

- Nav: 28px
- Icon: 24px
- Favicon: 32px, 512px

### Colors

- Default: Radar Cyan (#3BF4FB)
- On dark: White (#F5F7FA)
- Monochrome: currentColor

## Copy Tone

**Style:** Research-log. Declarative. No hype.

**Examples:**
- ✅ "Decision Feed"
- ✅ "Safety Violations / 1k steps"
- ✅ "Open Dashboard"
- ❌ "Amazing AI Insights!"
- ❌ "Revolutionary Platform"

## Forbidden

- ❌ Stock gradients
- ❌ Glassmorphism
- ❌ Drop shadows > 8px blur
- ❌ Random animated backgrounds
- ❌ Low-contrast text (<4.5:1)
- ❌ Comic Sans, Papyrus, or decorative fonts

## Performance

- Avoid re-render thrash; batch WebSocket updates
- Canvas only updates dirty regions
- Prefer CSS transforms over top/left for motion
- Lazy load heavy components
- Debounce filter inputs

## Browser Support

Modern browsers only (ES2020+):
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

No IE11, no polyfills.

## Implementation

### React Component

```tsx
import { Logo } from './components/Logo';

<Logo size={28} className="text-[var(--st-accent)]" />
```

### CSS Tokens

```css
@import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --st-bg: #1A1B1D;
  --st-panel: #0B0C0E;
  --st-text: #F5F7FA;
  --st-muted: #7A7C80;
  --st-accent: #3BF4FB;
  --st-danger: #FF4D4D;
  --st-border: #2A2B2E;
}
```

## Resources

- **Figma:** (TBD)
- **Storybook:** (TBD)
- **GitHub:** visualization/web/minimal-dashboard/

---

**ST-01 Observer - Precision. Vigilance. Synthetic cognition.**
