# 0007. Съёмки: создание, видимость, статус

Статус: принято, 2026-10-08

## Контекст

Арт-директор на странице Create new shoot собирает съёмку: детали, команду из своих креаторов (креаторы и мобилограф), продукты, референсы и deliverables. По Create shoot съёмка сохраняется и появляется на странице Shoots у арт-директора и у всех из её команды. Позже исполнители deliverables увидят их на странице My tasks.

## Решения

### Модель

```
shoots                         id, art_director_id, name, date, start_time, duration_minutes, location?
shoot_members                  shoot_id, user_id, role (creator|mobilographer), position
shoot_products                 shoot_id, product_id, position
shoot_references               shoot_id, reference_id, position
shoot_deliverables             id, shoot_id, position, product_id, name, status, due_date?
shoot_deliverable_assignees    deliverable_id, user_id, position
shoot_deliverable_references   deliverable_id, reference_id, position
```

- Deliverables съёмки — отдельная таблица, не `deliverables` продукта: у тех исполнитель — арт-директор (ADR 0004), здесь — несколько людей из команды съёмки. Статусы те же (`to_shoot … approved`).
- **Задачи.** Страница My tasks будет строиться из `shoot_deliverable_assignees`: задача пользователя — deliverable съёмки, где он исполнитель, вместе с продуктом, референсами и датой. Отдельной таблицы задач нет.

### Создание: `POST /api/shoots`

Только арт-директор (остальным `403`), одной транзакцией. После создания фронт открывает страницу съёмки (ADR 0008). Проверки (`422`):

- хотя бы один продукт и **хотя бы один deliverable**; фронт не даёт нажать Create shoot без deliverable;
- креаторы и мобилограф — одобренные креаторы арт-директора (`art_director_creators`), у человека одна роль на съёмке;
- продукты — те, где на арт-директора назначен deliverable продукта (ADR 0004); референсы — видимые ему в пуле;
- продукт deliverable — из продуктов съёмки, исполнители — из команды, референсы — из референсов съёмки.

Новые референсы со страницы съёмки фронт сохраняет в пул до `POST /api/shoots` (ADR 0006) и передаёт их id. Сохранённый черновик сразу становится референсом пула, поэтому повтор после ошибки не создаёт дублей; deliverables ссылаются на него по новому id. Неатомарность осознанная: иначе deliverables пришлось бы связывать с черновиками по индексам.

### Видимость

Арт-директор видит свои съёмки, креатор — те, где он в команде (`shoot_members`). Бренд съёмок не видит. Членство явное: снятие креатора из команды арт-директора в админке его из уже созданных съёмок не убирает.

### Статус выводится, а не хранится

- `completed` — все deliverables approved;
- `in_progress` — хотя бы один не в `to_shoot`;
- `upcoming` — ничего не начато и съёмка ещё не началась (дата + время начала по Ташкенту);
- `to_shoot` — ничего не начато, а время съёмки прошло.

Прогресс на карточке — approved из всех deliverables. Статус Needs review из Figma появится, когда у deliverables будет ожидание проверки.

### Список: `GET /api/shoots`

`search` (название, адрес, названия продуктов), `status`, `period` (`this_week`, `this_month`, `last_3_months`, `last_6_months` — по дате съёмки, «последние N месяцев» включают будущие), `sort` (`newest`/`oldest` по дате съёмки, `name_asc`/`name_desc`), страницы. `counts` — число съёмок каждого статуса под поиском и фильтрами: из них вкладки и Shoot overview. Next shoot — первая из `status=upcoming&sort=oldest`.

На фронте вкладки и фильтр Status — один параметр `status` в URL: вкладка All — без статуса, To shoot есть только в фильтре.

## Не входит в эту итерацию

Страница съёмки и редактирование (сделаны в ADR 0008), черновик съёмки (Save draft), редактирование и удаление, Recent activity, фильтр Location из Figma (убран), фильтры на мобильном, страница My tasks, продукты креатора через съёмки (ADR 0004).
