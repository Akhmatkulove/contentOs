# content-os-front

Vue 3 (`<script setup>`) + TypeScript, Vite, Pinia, Pinia Colada, Vue Router, Tailwind v4, Reka UI / shadcn-vue, axios.

## Команды

- `npm run dev`: dev-сервер, `/api` проксируется на `localhost:8000`
- `npm run type-check` · `npm run test:run` · `npm run lint` · `npm run lint:fsd`
- `npm run gen:api`: типы API из OpenAPI-схемы бэкенда → `src/shared/api/schema.d.ts` (нужен `uv`). Запускай после изменения схем бэкенда и коммить результат: CI сверяет файл с бэкендом.
- После изменений прогоняй `type-check`, `test:run` и `lint:fsd`. Pre-push hook запускает то же самое.

## Архитектура: Feature-Sliced Design v2.1

```
src/app       точка входа, App.vue, router, query (Pinia Colada), глобальные стили
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

## Логика и данные

- `.vue` = шаблон + вызов composable. Состояние, запросы и навигация страницы живут в `pages/<slice>/model/*.ts` (`useLoginForm()`), правила — в чистых функциях там же (`loginErrorMessage()`), тесты к ним рядом.
- Pinia — только для состояния, общего для нескольких страниц (сейчас один стор `session`). Формы, флаги загрузки и ошибки в сторы не клади. Файл стора называется `<имя>.store.ts` (`entities/session/model/session.store.ts`), функция — `use<Имя>Store`.
- Типы запросов и ответов не пиши руками: бери из `Schemas` (`@/shared/api`), например `Schemas['MeResponse']`. `schema.d.ts` не редактируй.
- Запросы: функции в сегменте `api/` слайса поверх `http` из `@/shared/api`. Состояние запроса — через Pinia Colada: `useQuery` для чтения (кэш по ключу), `useMutation` для изменений. Ручные `ref(false)` + `try/finally` не пиши.
- Любая ошибка запроса приходит как `ApiError` (`status`, 0 — нет ответа; `message`; `fields` — ошибки полей из 422; `canceled`). Код проверяй через `errorStatus(e)`.
- Необработанная ошибка запроса показывается тостом (глобальный обработчик в `app/query`). Если экран показывает ошибку сам, передай `meta: { toast: false }`. 401/403 тост не дают: их обрабатывает `installSessionInterceptor` редиректом.
- Тост из кода: `toast.error('…')` / `toast.success('…')` из `@/shared/ui/toast` (свой, на Reka UI Toast; одинаковые не дублируются, максимум 3).
- Модалки на странице не верстаются. Модалка — отдельный компонент в `ui/` слайса с `<VModal>` в корне; результат она отдаёт через `emit('close', result)`. Открывается из composable в `model/`: `const result = await openModal(AddReferenceModal, props)` из `@/shared/ui/modal`. Компонент подключай через `defineAsyncComponent`, чтобы код модалки грузился при первом открытии. Хост `VModalHost` стоит в `App.vue`, при смене маршрута модалки закрываются.
- После логина/регистрации/любого ответа с новым `/me` вызывай `useEnterSession()` из `@/entities/session`: запомнит пользователя и отправит на его маршрут.
- В тестах компонентов с `useMutation`/`useQuery` подключай плагины: `plugins: [router, getActivePinia()!, PiniaColada]`.

## UI и стили

- Вёрстка mobile-first: базовые классы пишутся под мобильный экран, большие экраны добавляются через брейкпоинты (`md:`, `lg:`). `max-*:` варианты не используй.
- shadcn-компоненты добавляются через `npx shadcn-vue@latest add <name>` и попадают в `src/shared/ui`. После добавления проверь `src/app/styles/tailwind.css` и `package.json`: CLI может дописать CSS-переменные (`--primary` и т. п.), шрифты и зависимости (`@lucide/vue`), их нужно удалить. Если компонент shadcn тянет отдельную библиотеку (например, Sonner для тостов), сначала проверь, нет ли нужного примитива в Reka UI.
- Цвета берутся только из `@theme static` в `tailwind.css` (стандартная палитра Tailwind сброшена). Сначала семантика из переменных Figma: `text-brand`, `text-secondary`, `bg-card`, `bg-canvas`, `border-default`, `bg-action-accent` и т. д. Примитив (`bg-mint-100`, `text-neutral-500`) — только там, где Figma сама берёт примитив. Новые семантические токены добавляй, только когда они появились в Figma.
- Кнопки: `VButton` из `@/shared/ui/button` (`variant`: primary/outline/surface/ghost, `size`: md или `icon-24…icon-44`). Сырой `<button>` с классами не пиши.
- UI-kit делается по одному компоненту в порядке, который задаёт пользователь. Ничего не добавляй «на будущее».
- Если на месте нужен компонент, которого ещё нет, ставь заглушку и метку `TODO(ui): VSelect — …` (в шаблоне `<!-- TODO(ui): … -->`). Данные без эндпоинта помечай `TODO(api): …`. Список: `grep -rn "TODO(ui)\|TODO(api)" src`. Сделал компонент — убери его метки.
- В компонентах `shared/ui` классы объединяй через `cn()` из `@/shared/lib`: он разрешает конфликты Tailwind, когда классы приходят снаружи (`cn('…', props.class)`). На страницах и в остальном коде, где все классы свои, хватает обычного `:class` со взаимоисключающими ветками.
- Новый кастомный токен Tailwind (`--text-*` и т. п.) добавляй и в `extendTailwindMerge` в `shared/lib/utils.ts`, иначе `cn()` может его выкинуть.
- Компоненты UI-kit называются `v-*.vue` (`shared/ui/icon/v-icon.vue`) и экспортируются как `V*` (`VIcon`). shadcn создаёт `Button.vue` и т. п.: сразу переименуй в `v-button.vue`. Правило `vue/multi-word-component-names` не отключай.
- Иконки: только `<VIcon name="…" />` из `@/shared/ui/icon`. Имена — как у главного компонента Hugeicons в Figma (не как у инстанса). Новая иконка добавляется `<symbol>` в `sprite.svg` и именем в `icon-names.ts`. Компоненты shadcn импортируют lucide: заменяй на `VIcon`.
- Типографика: `text-h3`, `text-h4`, `text-h6`, `text-p1`, `text-p2`, `text-p3`, `text-p4` + `font-medium`/`font-semibold` (других весов нет), CAPS = `uppercase`.
