# content-os-front

Vue 3 + Vite + TypeScript, Pinia, Vue Router, Tailwind v4, Reka UI / shadcn-vue.

## Architecture: Feature-Sliced Design

The code follows [Feature-Sliced Design](https://feature-sliced.design) (v2.1).

```
src/
  app/        entry point, App.vue, router, global styles
  pages/      route screens: pages/<page>/{ui,model,api}/ + index.ts
  widgets/    large self-contained UI blocks reused across pages
  features/   reusable user interactions (e.g. auth/login, post/publish)
  entities/   business entities (user, post, …)
  shared/     business-agnostic code: ui (shadcn components), api, lib, config
```

Rules:

- A layer may import only from layers **below** it: `app → pages → widgets → features → entities → shared`.
- Slices on the same layer don't import each other.
- Import a slice only through its public API (`@/pages/home`, not `@/pages/home/ui/...`). Inside a slice use relative imports.
- **Pages first:** keep code in the page that uses it. Move it down to `widgets`/`features`/`entities` only once a second consumer appears. Empty layers are not created ahead of time.
- Tests live next to the code they cover (`*.spec.ts`).
- shadcn-vue components are added into `src/shared/ui` (see `components.json` aliases).

`npm run lint:fsd` checks the architecture with [Steiger](https://github.com/feature-sliced/steiger); it also runs on pre-push.

## Scripts

| Script               | Purpose                       |
| -------------------- | ----------------------------- |
| `npm run dev`        | dev server                    |
| `npm run build`      | type-check + production build |
| `npm run test:run`   | unit tests                    |
| `npm run lint`       | ESLint                        |
| `npm run lint:fsd`   | FSD architecture check        |
| `npm run type-check` | vue-tsc                       |
