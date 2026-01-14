## Purpose

Concise, actionable guidance for AI coding agents to be productive in this repo.

**Repo at-a-glance**
- `training-1/`, `training-2/`: example apps that run with Vite and consume the local SDK.
- `external/immersive-web-sdk/`: SDK source tree (packages under `packages/`) — treat as upstream unless explicitly modifying SDK code.

**Quick workflows**
- App dev (example):

```
cd training-1
npm install
npm run dev
```

- If you want the alternate example:

```
cd training-2
npm install
npm run dev
```

Note: `training-2`'s dev server uses `vite` with `mkcert()` enabled and default server port `8081` in `training-2/vite.config.ts` (use `server.port` to change).

**Where to look (high value files)**n+- `training-1/vite.config.ts`, `training-2/vite.config.ts`: plugin pipeline (emulator injection via `injectIWER`, metaspatial discovery where present, UIKitML compilation, GLTF optimizer). `training-2` enables `mkcert()`.
- `training-1/src/index.ts`, `training-2/src/index.ts`: app bootstrap and `world.registerSystem(...)` usage — follow this pattern to add runtime systems.
- `training-1/metaspatial/`: scene/component sources and `components/` — edit these sources, not generated GLXF.
- `training-1/ui/*.uikitml` and `training-2/ui/*.uikitml`: UI sources compiled to `public/ui/*.json` by the `vite-plugin-uikitml`.

**Project conventions (practical rules for edits)**
- Runtime uses an Entity Component System from `@iwsdk/core`. Add systems in `training-*/src/` and register them via `world.registerSystem(YourSystem)` in the example's `src/index.ts`.
- Asset manifests follow the typed shape (`url`, `type`, `priority`) — see `training-2/src/index.ts` for a direct example of `AssetManifest` entries.
- Metaspatial sources are the source-of-truth — do not hand-edit `public/glxf` or other generated outputs.
- UIKitML is authored under `ui/*.uikitml`; the plugin compiles to `public/ui/*.json`.

**Training-2 specific notes**
- Port & TLS: `training-2/vite.config.ts` sets `server.port` to `8081` and uses `vite-plugin-mkcert` to generate a local TLS cert for secure contexts — required for some XR features and the emulator.
- `injectIWER` options in `vite.config.ts` (e.g., `device: "metaQuest3"`, `activation: "localhost"`) are example emulator settings the agent can mirror when injecting runtime emulation.
- `training-2/package.json` pins `@iwsdk/*` plugin versions and uses `three` via the `super-three` alias — be consistent with those versions when editing example code or updating deps.

**Integration notes**
- Examples import `@iwsdk/*` from `external/immersive-web-sdk` when using local packages. To test SDK changes, build `.tgz` artifacts in `external/immersive-web-sdk` and consume them in `training-*` examples.

**Examples & copyable commands**
- Dev server (training-2):

```
cd training-2
npm install
npm run dev
```

- Build SDK (when needed):

```
cd external/immersive-web-sdk
pnpm install
npm run build:tgz
```

**Do not edit generated artifacts**
- `public/glxf`, `public/ui/*.json`, and optimized `public/gltf` are build outputs. Edit sources under `metaspatial/`, `ui/`, or `src/` instead.

If you'd like, I can also add a short checklist for running `training-2` with `mkcert` on Windows, or expand CI/test instructions. Which would help most?
## Purpose

This file gives concise, actionable guidance to AI coding agents working in this repository so they can be immediately productive.

**Repo structure (high level):**
- `training-1/`: Starter app template that the generator uses; contains the runnable example and Vite-based dev flow.
- `external/immersive-web-sdk/`: Submodule SDK used by `training-1` (`@iwsdk/*` packages). Treat this as an upstream dependency unless explicitly modifying SDK code.

**Primary developer workflows**
- Local dev (app):
  - `cd training-1` then `npm install` (uses Node >= 20.19.0) and `npm run dev` to start Vite dev server.
  - Build for production: `npm run build` and preview with `npm run preview`.
- SDK local-development (only if working on SDK):
  - From `external/immersive-web-sdk`: use `pnpm install` then `npm run build:tgz` to produce local `.tgz` packages; examples consume `.tgz` when running `fresh:dev`.

**Key files and patterns to reference**
- `training-1/package.json` — main scripts (`dev`, `build`, `preview`) and dependencies (`@iwsdk/core`, `three`).
- `training-1/vite.config.ts` — central plugin configuration: `@iwsdk/vite-plugin-iwer` (emulator injection), `vite-plugin-metaspatial` (component discovery + GLXF generation), `vite-plugin-uikitml` (compiles `ui/*.uikitml` → `public/ui/*.json`), and `optimizeGLTF`.
- `training-1/src/index.ts` — app bootstrap pattern: `World.create(..., { assets, xr, features, level })` and `world.registerSystem(...)`. Look here for runtime conventions (asset manifest, systems, camera setup).
- `training-1/ui/welcome.uikitml` — authored UI compiled by plugin to `public/ui/welcome.json` on build.
- `training-1/metaspatial/` — scene and component sources; `vite` plugins auto-discover and generate GLXF into `public/glxf`.
- `external/immersive-web-sdk/README.md` — documents SDK development workflow and explains `.tgz`-based example consumption.

**Project-specific conventions and patterns**
- Uses an Entity Component System provided by `@iwsdk/core`. New runtime logic should register systems via `world.registerSystem(YourSystem)`.
- Asset manifests use a small typed shape (see `src/index.ts`): `AssetManifest` entries specify `url`, `type` (e.g., `AssetType.Audio`), and `priority`.
- Metaspatial workflow: source components live under `metaspatial/components`; `discoverComponents` plugin reads `.ts`/`.js` and `generateGLXF` emits scenes into `public/glxf`. When changing scene content, update metaspatial sources, not just `public/` artifacts.
- UIKitML: UI authored in `ui/*.uikitml` and compiled to JSON by `compileUIKit`—edit source `.uikitml` files, not the generated `public/ui/*.json`.

**Integration points & external dependencies**
- `@iwsdk/*` packages (local SDK under `external/immersive-web-sdk`) provide runtime primitives. Most development happens in `training-1` and consumes the SDK as a package.
- Vite dev server with special plugins performs heavy lifting (emulator injection, metaspatial compilation, GLTF optimization). Changes to build behavior mostly happen in `training-1/vite.config.ts`.

**Typical change guidance for an AI agent**
- To add a runtime feature, modify or add a system under `training-1/src/` and register it via `world.registerSystem(...)` in `src/index.ts` or the appropriate bootstrap.
- To change scene content, update `training-1/metaspatial` sources and let `vite`/plugins regenerate `public/glxf` (do not hand-edit generated GLXF where possible).
- To change UI, edit `training-1/ui/*.uikitml`. The plugin compiles it during dev/build.
- If you need to run the example against the latest SDK code, build SDK `.tgz` files (`external/immersive-web-sdk` → `npm run build:tgz`) and then use example `fresh:dev` workflows described in the SDK README.

**Environment and runtime notes**
- Node engine required: `>=20.19.0` (see `training-1/package.json` `engines`).
- TypeScript settings live in `training-1/tsconfig.json` (includes `src/**/*.ts`). Keep edits consistent with `module: ESNext` and `isolatedModules: true`.

**Examples (copyable)**
- Start app dev server:

```
cd training-1
npm install
npm run dev
## Purpose

Concise, actionable guidance for AI coding agents to be immediately productive in this repository.

**Repo at-a-glance**
- `training-1/`, `training-2/`: example apps that run with Vite and consume the local SDK.
- `external/immersive-web-sdk/`: SDK source tree (packages under `packages/`) — treat as upstream unless explicitly modifying SDK code.

**Quick workflows**
- App dev (example):

```
cd training-1
npm install
npm run dev
```

- Build & preview:

```
npm run build
npm run preview
```

- SDK local development (only when changing SDK):

```
cd external/immersive-web-sdk
pnpm install
npm run build:tgz
```

**Where to look (high value files)**n+
- `training-1/vite.config.ts`: plugin pipeline (emulator injection, metaspatial discovery, UIKitML compilation, GLTF optimization).
- `training-1/src/index.ts`: app bootstrap, `World.create(...)`, and `world.registerSystem(...)` usage — mirror this pattern for new systems.
- `training-1/metaspatial/` and `metaspatial/components`: scene/component sources (source-of-truth for GLXF generation).
- `training-1/ui/*.uikitml`: UI sources compiled to `public/ui/*.json` by the build plugin.
- `training-1/package.json`: scripts and Node engine (Node >= 20.19.0).

**Project conventions (practical rules for edits)**
- Runtime is an Entity Component System from `@iwsdk/core`. Add systems in `training-1/src/` and register in `src/index.ts`.
- Asset manifest entries follow a typed shape (`url`, `type`, `priority`) — see `training-1/src/index.ts` for examples.
- Edit metaspatial sources under `training-1/metaspatial/`; plugins regenerate `public/glxf` — do not hand-edit generated `public/*` outputs.
- Edit `ui/*.uikitml` files; compiled UI appears in `public/ui/`.

**Integration notes**
- Examples import `@iwsdk/*` packages from `external/immersive-web-sdk`. To test SDK changes, create local `.tgz` packages via `npm run build:tgz` and consume them in the example.
- Modify build/plugin behavior in `training-1/vite.config.ts` (the Vite plugin chain is authoritative).

**Examples & copyable commands**
- Dev server (example):

```
cd training-1
npm run dev
```

- Build SDK (when needed):

```
cd external/immersive-web-sdk
pnpm install
npm run build:tgz
```

**Do not edit generated artifacts**
- `public/glxf`, `public/ui/*.json`, and optimized `public/gltf` are build outputs. Edit sources under `metaspatial/`, `ui/`, or `src/` instead.

If you want more detail (CI, tests, or a contributor checklist), tell me which area to expand.
