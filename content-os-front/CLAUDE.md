# content-os-front

Vue 3 (`<script setup>`) + TypeScript, Vite, Pinia, Vue Router, Tailwind v4, Reka UI / shadcn-vue, axios.

## Команды

- `npm run dev`: dev-сервер, `/api` проксируется на `localhost:8000`
- `npm run type-check` · `npm run test:run` · `npm run lint` · `npm run lint:fsd`
- После изменений прогоняй `type-check`, `test:run` и `lint:fsd`. Pre-push hook запускает то же самое.

## Архитектура: Feature-Sliced Design v2.1

```
src/app       точка входа, App.vue, router, глобальные стили
src/pages     экраны роутов: pages/<slice>/{ui,model,api,lib}/ + index.ts
src/widgets   крупные UI-блоки, используемые несколькими страницами
src/features  переиспользуемые действия пользователя
src/entities  бизнес-сущности
src/shared    без бизнес-логики: ui, api, lib, config
```

Правила (их проверяет `npm run lint:fsd`):

1. Слой импортирует только слои **ниже** себя: `app → pages → widgets → features → entities → shared`.
2. Слайсы одного слоя друг друга не импортируют.
3. Снаружи слайс импортируется только через его `index.ts`: `@/pages/home`, а не `@/pages/home/ui/HomePage.vue`. Внутри слайса используй относительные импорты.
4. **Сначала pages.** Новый код клади в страницу, которая его использует. В `widgets`/`features`/`entities` выноси только когда появится второй потребитель. Пустые слои и слайсы заранее не создавай.
5. Сегменты называй по назначению (`ui`, `model`, `api`, `lib`, `config`), а не по типу файла (`components`, `hooks`, `types`).
6. `import.meta.env` читается только в `shared/config`.
7. Тесты кладутся рядом с кодом: `*.spec.ts`.

## UI и стили

- shadcn-компоненты добавляются через `npx shadcn-vue@latest add <name>` и попадают в `src/shared/ui`. После добавления проверь `src/app/styles/tailwind.css`: CLI может дописать туда CSS-переменные (`--primary` и т. п.), их нужно удалить.
- Цвета берутся только из примитивов Figma (`@theme static` в `tailwind.css`, стандартная палитра Tailwind сброшена): `bg-violet-400`, `text-neutral-700`. Семантические токены не вводи без запроса.
- UI-kit делается по одному компоненту в порядке, который задаёт пользователь. Ничего не добавляй «на будущее».
- Классы объединяй через `cn()` из `@/shared/lib`.
