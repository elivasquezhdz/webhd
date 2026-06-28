# Super Earth Vanguard — 2.5D

A Helldivers 2-inspired browser game built with React, TypeScript, and HTML5 Canvas. Fight off Terminid swarms on a 2.5D battlefield using rifles, grenades, and orbital stratagems.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Controls

| Input | Action |
|---|---|
| `W / S` | Move forward / backward (depth) |
| `A / D` | Move left / right |
| `Space` | Jump |
| `Left Click` | Fire rifle |
| `Right Click` | Throw grenade |
| `Hold Ctrl` | Open stratagem menu |
| `Arrow Keys` (while Ctrl held) | Enter stratagem code |

## Stratagems

Activate by holding `Ctrl` and entering the arrow key sequence shown in the HUD. Each stratagem has a cooldown before it can be used again.

| Stratagem | Code | Effect |
|---|---|---|
| Eagle Strafing Run | ↑ ← ← | Strafing pass across the target area |
| Orbital Precision Strike | → → ↑ | High-damage orbital strike at beacon |
| Reinforce | ↑ ↓ → ← ↑ | Calls in reinforcements |
| Supply Pack | ↓ ← ↓ ↑ ↑ → | Resupply drop |

## HUD

- **Top left** — current mission name
- **Bottom left** — health bar (cyan → orange → red)
- **Bottom center** — stratagem cards with cooldown timers
- **Bottom right** — rifle ammo and grenade count

## Tech Stack

- **React 19** + **TypeScript**
- **HTML5 Canvas** for the game engine
- **Tailwind CSS** (CDN) for UI
- **Vite** for development and bundling

## Scripts

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run preview  # Preview production build
```
