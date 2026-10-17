# Graph Report - olympus  (2026-10-17)

## Corpus Check
- 189 files · ~72,346 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1413 file(s) not represented in the graph (top: .fbx 442, .mtl 263, .obj 263)

## Summary
- 281 nodes · 553 edges · 14 communities (13 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- API & GameBoard
- 3D & External Libs
- ESLint Config
- Gameplay Pages
- Next.js Config
- UI Components
- Supabase & Testing
- TypeScript Config
- Game Types & Models
- Dependencies
- Dev Dependencies
- Map & Fief Engine
- Layout & Styling
- PostCSS Config

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `OlympusGamePlayPage()` - 15 edges
3. `react` - 14 edges
4. `resolveSimultaneousTurn()` - 14 edges
5. `CardDefinition` - 13 edges
6. `HexTile` - 13 edges
7. `GamePublicState` - 12 edges
8. `next` - 11 edges
9. `generateProceduralIsland()` - 11 edges
10. `OlympusGamePage()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `DraftHandProps` --references--> `CardDefinition`  [EXTRACTED]
  src/components/DraftHand.tsx → src/core/types/game.types.ts
- `GameHudProps` --references--> `GamePublicState`  [EXTRACTED]
  src/components/GameHud.tsx → src/core/types/game.types.ts
- `ReservePanelProps` --references--> `CardDefinition`  [EXTRACTED]
  src/components/ReservePanel.tsx → src/core/types/game.types.ts
- `POST()` --calls--> `resolveSimultaneousTurn()`  [EXTRACTED]
  src/app/api/game/afk/route.ts → src/core/engine/TurnResolver.ts
- `POST()` --calls--> `createAdminSupabaseClient()`  [EXTRACTED]
  src/app/api/game/create/route.ts → src/lib/supabase/admin.ts

## Import Cycles
- None detected.

## Communities (14 total, 1 thin omitted)

### Community 0 - "API & GameBoard"
Cohesion: 0.13
Nodes (29): GameBoardProps, PLAYER_COLORS, TERRAIN_STYLES, MajorGodsPanelProps, ACTION_CARDS_TEMPLATES, SECONDARY_GODS_TEMPLATES, TERRAIN_NAMES, calculateNetDrachmaCost() (+21 more)

### Community 1 - "3D & External Libs"
Cohesion: 0.09
Nodes (22): clsx, @react-three/drei, @react-three/fiber, tailwind-merge, CARD_THEMES, OlympusGamePage(), axialToWorld3D(), HexTile3D() (+14 more)

### Community 2 - "ESLint Config"
Cohesion: 0.07
Nodes (27): eslintConfig, allowScripts, unrs-resolver@1.12.2, name, private, scripts, build, dev (+19 more)

### Community 3 - "Gameplay Pages"
Cohesion: 0.13
Nodes (15): react, OlympusGamePlayPage(), CATEGORY_STYLES, DraftHand(), DraftHandProps, EventLog(), EventLogProps, GameHud() (+7 more)

### Community 4 - "Next.js Config"
Cohesion: 0.18
Nodes (12): nextConfig, next, @supabase/ssr, POST(), POST(), POST(), computeBotTurnSubmission(), PrivatePlayerHandRecord (+4 more)

### Community 5 - "UI Components"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 6 - "Supabase & Testing"
Cohesion: 0.13
Nodes (12): @supabase/supabase-js, vitest, POST(), initGameSession(), OlympusLobbyPage(), fetchLobby(), handleStartGame(), buildScaledDeck() (+4 more)

### Community 7 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 8 - "Game Types & Models"
Cohesion: 0.12
Nodes (16): ActiveBrownBuff, CapriceDefinition, CardCategory, CardDefinition, EndOfRoundReserveDecision, GamePublicState, HexTile, MajorGodDefinition (+8 more)

### Community 9 - "Dependencies"
Cohesion: 0.14
Nodes (14): dependencies, clsx, framer-motion, lucide-react, next, react, react-dom, @react-three/drei (+6 more)

### Community 10 - "Dev Dependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @tailwindcss/turbopack, @types/node, @types/react (+4 more)

### Community 11 - "Map & Fief Engine"
Cohesion: 0.27
Nodes (10): GameBoard(), axialToPixel(), computeFiefSvgBoundaries(), DIRECTION_TO_CORNERS, FiefSvgBoundary, getHexCorners(), HexEdge, Point2D (+2 more)

### Community 12 - "Layout & Styling"
Cohesion: 0.33
Nodes (3): geistMono, geistSans, metadata

## Knowledge Gaps
- **13 isolated node(s):** `@types/three`, `framer-motion`, `lucide-react`, `react-dom`, `three` (+8 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 147 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Gameplay Pages` to `API & GameBoard`, `3D & External Libs`, `ESLint Config`, `Next.js Config`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **What connects `@types/three`, `framer-motion`, `lucide-react` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API & GameBoard` be split into smaller, more focused modules?**
  _Cohesion score 0.13124274099883856 - nodes in this community are weakly interconnected._
- **Why does `next` connect `Next.js Config` to `API & GameBoard`, `ESLint Config`, `Gameplay Pages`, `Layout & Styling`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Should `3D & External Libs` be split into smaller, more focused modules?**
  _Cohesion score 0.09269162210338681 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Dependencies` to `ESLint Config`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `ESLint Config` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._