# Design system — EV Charging Station Nepal

Design reference for [evchargingstationnepal.com](https://evchargingstationnepal.com): a map-first EV charging directory for Nepal with light and dark themes.

Source of truth: `src/styles/global.css` and `data-theme` on `<html>`.

---

## Brand

| Item | Value |
|------|--------|
| Product name | **EV Charging Station Nepal** |
| Tagline | Charging Stations Finder |
| Logo | `/logo.svg` (green plug mark) |
| Domain | `https://evchargingstationnepal.com` |
| Tone | Practical, map-first, Nepal-focused — clear green accents on ink/paper surfaces |

---

## Theme model

Themes are applied with `data-theme="light"` or `data-theme="dark"` on `<html>`.

| Behavior | Detail |
|----------|--------|
| Default | Dark (also follows `prefers-color-scheme` when no preference is stored) |
| Persistence | `localStorage.theme` = `"light"` \| `"dark"` |
| Toggle | Header `ThemeToggle` (sun / moon switch) |
| FOUC guard | Inline script in `Layout.astro` sets theme before paint |
| Browser chrome | `theme-color` meta: `#0B0D0C` (dark) / `#F2F5F2` (light) |
| Transition | Body background and text color ease over `0.2s` |

Semantic Tailwind colors map to CSS variables:

```
bg-ink / text-paper / bg-panel / border-line / text-charge / …
→ --color-* → --theme-*
```

---

## Color tokens

### Dark theme (`data-theme="dark"` / `:root`)

| Token | Hex | Role |
|-------|-----|------|
| `--theme-ink` | `#0B0D0C` | Page background |
| `--theme-panel` | `#171A19` | Cards, inputs, panels |
| `--theme-footer` | `#0A0C0B` | Footer surface |
| `--theme-paper` | `#F8FAF8` | Primary text |
| `--theme-muted` | `#B8C1BC` | Secondary text |
| `--theme-subtle` | `#6E7672` | Tertiary / meta text |
| `--theme-line` | `#2A2F2D` | Borders, dividers |
| `--theme-charge` | `#8EE36A` | Accent (links, CTAs, highlights) |
| `--theme-charge-deep` | `#58AE37` | Accent depth / gradient end |
| `--theme-gradient-start` | `#B8F39A` | Gradient highlight start |
| `--theme-map-bg` | `#111413` | Map canvas |
| `--theme-map-popup` | `#0F1211` | Map popup surface |

### Light theme (`data-theme="light"`)

| Token | Hex | Role |
|-------|-----|------|
| `--theme-ink` | `#F2F5F2` | Page background |
| `--theme-panel` | `#FFFFFF` | Cards, inputs, panels |
| `--theme-footer` | `#E7ECE7` | Footer surface |
| `--theme-paper` | `#0F1411` | Primary text |
| `--theme-muted` | `#5A655E` | Secondary text |
| `--theme-subtle` | `#7A857C` | Tertiary / meta text |
| `--theme-line` | `#D5DDD6` | Borders, dividers |
| `--theme-charge` | `#3D8A20` | Accent (darker green for contrast) |
| `--theme-charge-deep` | `#2A6015` | Accent depth / gradient end |
| `--theme-gradient-start` | `#58AE37` | Gradient highlight start |
| `--theme-map-bg` | `#E8EEE8` | Map canvas |
| `--theme-map-popup` | `#FFFFFF` | Map popup surface |

### Usage rules

- **Background stack:** `ink` (page) → `panel` (surfaces) → `footer` (site footer).
- **Text stack:** `paper` (primary) → `muted` (secondary) → `subtle` (meta).
- **Accent:** use `charge` for interactive emphasis; avoid purple / neon glow.
- **Borders:** `line` at full or `/80` `/70` opacity on sticky header / footer rules.
- **Selected station card:** `border-charge` + `bg-charge/10` + soft charge glow.
- **Active chips / filters:** `border-charge` + `bg-charge/15` + `text-charge`.
- **Selection highlight:** `color-mix(in oklab, charge 35%, transparent)`.

### Accent gradient (headlines)

Utility: `.text-gradient-green`

```
120deg → gradient-start → charge → charge-deep
```

Used sparingly on hero keywords (e.g. “EV Charging”).

---

## Typography

| Role | Family | Weights | Tailwind |
|------|--------|---------|----------|
| Display | **Space Grotesk** | 500, 600, 700 | `font-display` |
| Body | **Manrope** | 400–800 | `font-body` (default on `body`) |

### Scale patterns

| Element | Typical classes |
|---------|-----------------|
| Hero H1 | `font-display font-extrabold tracking-[-0.04em] text-[clamp(1.75rem,4vw,3.4rem)]` |
| Section H1 | `font-display font-extrabold tracking-tight text-[clamp(2rem,4vw,3rem)]` |
| Brand wordmark | `font-display font-extrabold tracking-tight text-base sm:text-lg` |
| Eyebrow / section label | `text-xs font-semibold tracking-[0.08em] text-charge uppercase` |
| Body | `text-sm`–`text-[0.95rem] leading-relaxed text-muted` |
| Meta / mono chips | `font-mono text-[0.68rem]`–`text-xs` on plug badges |

---

## Layout

| Token | Value |
|-------|--------|
| Content max width | `1280px` (`max-w-[1280px]`) |
| Page padding | `px-6` |
| Header | Sticky, `z-40`, solid `bg-ink`, bottom `border-line/80` |
| Footer | `bg-footer`, top `border-line` |
| Network grid | `grid-cols-1` → `lg:grid-cols-[1fr_380px]` (map + list) |
| Map height | Mobile `350px`; desktop `calc(100vh - 160px)` |
| Station list | Scrollable panel: mobile `max-h-[min(60vh,520px)]`; desktop `max-h-[calc(100vh-160px)]` |

---

## Radius & surfaces

| Pattern | Radius | Notes |
|---------|--------|-------|
| Pills / chips / nav | `rounded-full` | Filters, tags, theme toggle, CTAs |
| Cards / panels | `rounded-2xl` | Station cards, FAQ, contact blocks |
| Large panels | `rounded-3xl` | Map frame, major sections |
| Inputs | `rounded-[12px]`–`rounded-[14px]` | Search, trip selects |
| Plug badges | `rounded-md` / icon wells `rounded-xl` | Compact technical chips |

Borders: `border` or `border-[1.5px]` with `border-line`. Prefer borders over heavy shadows; selected map cards may use a soft charge glow.

---

## Components

### Theme toggle

- Track: `h-9 w-[3.75rem]`, `rounded-full`, `border-line`, `bg-panel`
- Thumb: `bg-charge`, sun (light) / moon (dark)
- Labels: muted sun/moon icons in the track

### Buttons & chips

| Variant | Style |
|---------|--------|
| Primary CTA | Solid / filled `bg-charge` + dark/light ink text as needed (e.g. Get Directions) |
| Secondary | `border-line bg-panel text-charge` or `text-muted` |
| Active filter | `border-charge bg-charge/15 text-charge` |
| Idle filter | `border-line bg-panel text-muted` |
| Warning / GPS | Amber tint (`amber-500/10`, `text-amber-700`) — exception to green palette |

### Station cards

- Idle: `border-line bg-panel`
- Selected: `border-charge bg-charge/10` + charge shadow
- Distance pill: `border-charge/20 bg-charge/15 text-charge`
- Actions: primary directions + secondary “View station page”

### Plug badges

- Compact chips with CCS2 / GB/T icons
- `border-charge/20 bg-charge/10 text-charge` (uppercase mono label)

### Mobile nav

- Full-screen sheet: `.mobile-nav-overlay` → solid `var(--theme-panel)`
- Portaled to `document.body` (avoids sticky-header containment bugs)
- Links: large tap targets, `hover:text-charge`

### Map (Leaflet)

- Canvas / popup colors follow `--theme-map-bg` and `--theme-map-popup`
- Popup: `16px` radius, `border-line`, soft paper-tinted shadow

---

## Motion

| Interaction | Spec |
|-------------|------|
| Theme switch | Thumb `translate` `200ms`; body color `200ms` |
| Hover links / chips | Color / border transitions |
| Selected station | Border + background + glow |
| Keep motion purposeful | Prefer 2–3 intentional transitions; avoid decorative noise |

---

## Iconography

- Library: **Lucide React**
- Common: `MapPin`, `Search`, `Compass`, `Route`, `Menu`, `X`, `Sun`, `Moon`, navigation arrow for directions
- Stroke: typically default; theme toggle uses `strokeWidth={2.5}` on the active icon

---

## Do / don’t

**Do**

- Use semantic tokens (`ink`, `panel`, `paper`, `charge`) — never hard-code theme hex in components unless documenting fallbacks.
- Keep charge green as the only primary accent.
- Preserve light-theme darker greens (`#3D8A20`) for readable contrast on pale ink.
- Match list/map scroll behavior: contained scroll regions, page scroll for footer.

**Don’t**

- Introduce purple / indigo gradients, cream+terracotta, or broadsheet newspaper styling.
- Rely on `backdrop-blur` on ancestors of `position: fixed` overlays (breaks mobile menus).
- Overload the first viewport with stats, pills, and secondary marketing blocks.
- Use cards where a borderless layout still reads clearly (except interactive containers).

---

## File map

| File | Role |
|------|------|
| `src/styles/global.css` | Theme tokens, fonts, map + overlay utilities |
| `src/components/ThemeToggle.tsx` | Theme switch + `localStorage` |
| `src/layouts/Layout.astro` | Shell, FOUC script, fonts, chrome |
| `public/logo.svg` | Brand mark |

When adding UI, prefer existing tokens and patterns above so light and dark stay in sync automatically.
