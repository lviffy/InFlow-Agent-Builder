# Yellow & Orange Palettes

Built around a shared yellow-orange spectrum — both modes feel like siblings.

---

## 🌑 Dark Mode — Ember Noir

> Charred blacks with molten yellow-orange glow

| Role           | Hex       |
|----------------|-----------|
| Background     | `#12100A` |
| Surface        | `#1C1608` |
| Border         | `#3A2E10` |
| Muted text     | `#6B5120` |
| Orange primary | `#F5A623` |
| Yellow primary | `#F5C842` |
| Accent / value | `#FDE68A` |
| Body text      | `#FEF3C7` |

---

## ☀️ Light Mode — Saffron Cream

> Warm ivory base with deep amber and golden accents

| Role           | Hex       |
|----------------|-----------|
| Background     | `#FFFDF5` |
| Surface        | `#FFFFFF` |
| Border         | `#FCD34D` |
| Muted text     | `#D97706` |
| Yellow primary | `#F59E0B` |
| Orange primary | `#EA7C0A` |
| Emphasis       | `#B45309` |
| Body text      | `#431407` |

---

## Notes

- Both palettes share the **yellow-orange spectrum** for visual sibling consistency
- Dark mode backgrounds use **brown-amber undertones** (not pure black) so warm accents glow naturally
- Light mode uses **warm ivory** (`#FFFDF5`) instead of sterile white for a toasty feel
- Deep burnt amber (`#431407`) for light mode body text keeps strong contrast within the warm family
- Orange and Yellow each get their own primary slot — use **orange for CTAs**, **yellow for highlights/values**


# Hero Section — UI Refactor Instructions

> **Scope:** `page.tsx` — everything inside `<main>` (the Hero section) and the `<nav>` above it.  
> Do **not** touch the `By the Numbers`, `Features`, `How It Works`, or `Footer` sections.

---

## Goals

- Make the hero feel premium, modern, and distinct — not generic SaaS
- Add motion and depth without harming performance
- Improve hierarchy: badge → headline → subheadline → CTAs → visual
- Make the nav feel more intentional and polished
- The layout should be **full-bleed centered**, not constrained too early

---

## 1. Navigation

### Current issues
- The floating pill nav feels slightly underdeveloped — border blends into the background
- Logo label `"InFlow"` and icon are inconsistently sized on mobile
- CTA button ("Connect Wallet") is too muted — it should draw attention

### Changes

**Container**
- Keep the `sticky top-2 rounded-2xl` pill shape
- Increase the border contrast slightly: use `border-border/60`
- Backdrop blur should be `backdrop-blur-xl` (stronger than current `backdrop-blur-md`)

**Logo**
- Increase the logo mark to `w-10 h-10` on desktop, `w-9 h-9` on mobile
- The `"InFlow"` text should be `font-bold` not `font-semibold`, tracking slightly tighter: `tracking-tight`

**Nav links**
- Add a subtle hover underline animation: `after:` pseudo-element that scales from `scaleX(0)` to `scaleX(1)` on hover, pinned `bottom-0 left-0`
- Use `text-sm font-medium` (unchanged) but bump to `text-foreground/70` (slightly brighter than `muted-foreground`)

**Connect Wallet button**
- Replace the `variant="outline"` with a solid, slightly glowing variant:
  ```tsx
  className="bg-primary/10 border border-primary/40 text-primary hover:bg-primary/20 font-semibold text-xs sm:text-sm px-4 rounded-lg transition-all duration-200"
  ```

---

## 2. Background

### Current issues
- The existing glowing orb divs add visual noise and look generic

### Changes
- **Remove the orb entirely** — delete all three nested orb `<div>`s inside the `absolute -top-[300px]` container
- **Do not replace with any other orb, blob, radial gradient, or glow effect**
- Instead, use a **subtle noise texture + grid pattern** as the background for depth:
  ```tsx
  <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]" style={{
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  }} />
  ```
- Alternatively, a very low-opacity SVG noise overlay (`opacity-[0.025]`) using an inline SVG `feTurbulence` filter works well for texture without any glow

---

## 3. Hero Badge

### Current
```tsx
<div className="mb-6 sm:mb-10 inline-flex items-center gap-2 bg-muted border border-border rounded-full px-3 sm:px-4 py-1.5 sm:py-2">
  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
  <span className="text-xs sm:text-sm text-muted-foreground">Build your army of agents</span>
  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent" />
</div>
```

### Changes
- Wrap in a `motion.div` with `initial={{ opacity: 0, y: -12 }}` → `animate={{ opacity: 1, y: 0 }}`, `transition={{ duration: 0.5, ease: "easeOut" }}`
- Change background to `bg-primary/8 border border-primary/25` for a warm glowing pill
- Add a pulsing dot before the `Bot` icon:
  ```tsx
  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
  ```
- Update copy to something more punchy: `"Autonomous agents for on-chain automation"`
- Remove `ArrowRight` — replace with a `ChevronRight` at `w-3 h-3 text-primary/60`

---

## 4. Main Heading

### Current
```tsx
<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-6 max-w-4xl mt-2 sm:mt-4 px-4">
  <span className="text-foreground">Build AI agents that</span>
  <br />
  <span className="text-primary">automate blockchain</span>
</h1>
```

### Changes
- Bump max size to `xl:text-7xl` — the current ceiling of `text-6xl` is conservative
- Change `tracking-tight` to `tracking-tighter` for the large desktop size
- Add `leading-[1.05]` to tighten the line height on large screens
- Wrap each line in a `motion.span` with staggered `initial={{ opacity: 0, y: 20 }}` → `animate={{ opacity: 1, y: 0 }}` with `delay: 0.1` and `delay: 0.2`
- The second line (`text-primary`) should have a **text gradient** instead of a flat color:
  ```tsx
  className="bg-gradient-to-r from-primary via-primary/90 to-amber-400 bg-clip-text text-transparent"
  ```
- Consider rewording to increase impact:
  > **"Build AI agents that"**  
  > **"move markets on-chain"**

---

## 5. Subheading

### Current
```
At InFlow, we believe automation should be simple, scalable, and accessible creating a experience where ideas thrive and boundaries fade.
```

### Changes
- Fix the grammar: `"creating a experience"` → `"creating an experience"`
- Rewrite for clarity and punch:
  > `"InFlow lets you deploy autonomous AI agents that execute DeFi strategies, manage NFTs, and react to on-chain events — all without writing a line of code."`
- Animate with `motion.p`: `initial={{ opacity: 0, y: 16 }}` → `animate={{ opacity: 1, y: 0 }}`, `delay: 0.3`
- Increase size slightly on desktop: `md:text-xl`

---

## 6. CTA Buttons

### Current
- Stacked on mobile, side-by-side on desktop
- Primary: solid `bg-primary`
- Secondary: `variant="outline"`

### Changes
- Wrap the button group in `motion.div` with `delay: 0.4`
- **Primary button** — increase font weight to `font-semibold`, use `rounded-xl` for a more refined shape, add `transition-colors duration-200` for smooth hover
- **Secondary button** — make it feel more intentional: `border-border/60 hover:border-border text-foreground/80 hover:text-foreground`
- Add `gap-1.5` between icon and label inside buttons, and use a `→` arrow icon (`ArrowRight`, size `w-4 h-4`) inside the primary CTA

---

## 7. Hero Image

### Current
```tsx
<div className="w-full max-w-3xl mx-auto px-4">
  <Image src="/hero-diagram.png" ... className="w-full h-auto" />
</div>
```

### Changes
- Wrap in `motion.div` with `initial={{ opacity: 0, y: 32, scale: 0.97 }}` → `animate={{ opacity: 1, y: 0, scale: 1 }}`, `delay: 0.5`, `duration: 0.7`
- Add a container that creates a **vignette / fade-out at the bottom** so the image bleeds naturally into the next section:
  ```tsx
  <div className="relative w-full max-w-4xl mx-auto px-4">
    <Image ... />
    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
  </div>
  ```
- Increase `max-w-3xl` → `max-w-4xl` for more visual presence
- Add a subtle **border glow ring** around the image:
  ```tsx
  className="w-full h-auto rounded-2xl ring-1 ring-white/10"
  ```

---

## 8. Overall Section Spacing & Animation Orchestration

- Wrap the entire `<main>` hero content `<div>` with a `motion.div` using `variants` for staggered children:
  ```tsx
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
  }
  ```
- Reduce `pt-12 sm:pt-20 lg:pt-24` to `pt-8 sm:pt-14 lg:pt-20` — the sticky nav already provides breathing room
- Increase bottom padding: `pb-0` (let the image bleed into the next section instead of cutting off with padding)

---

## Files to Edit

| File | What changes |
|---|---|
| `app/page.tsx` | All hero + nav changes described above |
| No new files needed | All changes are inline JSX + Tailwind |

---

## Do NOT Change

- The `NumberTicker` component
- The Lenis scroll setup
- The `loadingLink` overlay logic
- The `ConnectModal` / `UserProfile` auth logic
- Any section below the hero (`#features`, How It Works, Footer)
- Existing route links (`/my-agents`, `/agent-builder`, etc.)

## Hard Constraints — Never Do These

- **No drop shadows of any kind** — no `shadow-*`, no `box-shadow`, no `drop-shadow`, no `filter: drop-shadow(...)` anywhere in the hero or nav
- **No orbs, blobs, or radial glow effects** — no rounded `div`s with `blur-3xl` or `blur-2xl` used purely for ambient glow, no `radial-gradient` backgrounds intended as a light source