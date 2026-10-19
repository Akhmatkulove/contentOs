"""ВРЕМЕННЫЕ ДЕМО-ДАННЫЕ для локальной разработки. Удалить вместе с папкой app/demo.

    uv run python -m app.demo.seed reset   # стереть ВСЕ продукты, референсы, съёмки и файлы
                                           # и создать демо-набор
    uv run python -m app.demo.seed seed    # (пере)создать только демо-набор
    uv run python -m app.demo.seed clear   # удалить только демо-набор

Демо-записи узнаются по id: они выводятся из имени через uuid5(DEMO), так что
`clear` удаляет ровно их и ничего больше. Ещё у продуктов и референсов тег `demo`,
а файлы лежат в хранилище под `files/demo/`.

Набор: 5 продуктов бренда brand1@example.com (deliverables назначены на
ad1@example.com), 5 референсов ad1 и 8 его съёмок (все статусы съёмок) с креаторами creator1–3 —
с разными датами и статусами deliverables. Пользователи и связки должны уже быть.
"""

import asyncio
import io
import sys
import uuid
from datetime import date, time, timedelta

from PIL import Image, ImageDraw
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.config import get_settings
from app.core.db import create_engine, create_sessionmaker
from app.core.storage import Storage, build_storage
from app.deliverables.models import Deliverable, DeliverableStatus, DeliverableType
from app.files.models import FileKind, StoredFile
from app.products.models import Product, ProductPhoto
from app.references.models import Reference, ReferenceFile, ReferenceType
from app.shoots.models import (
    Shoot,
    ShootDeliverable,
    ShootDeliverableAssignee,
    ShootDeliverableReference,
    ShootMember,
    ShootProduct,
    ShootReference,
    ShootRole,
)

DEMO = uuid.UUID("5e1d0000-de30-4000-8000-000000000000")
TAG = "demo"

BRAND = "brand1@example.com"
ART_DIRECTOR = "ad1@example.com"
CREATORS = ("creator1@example.com", "creator2@example.com", "creator3@example.com")

S = DeliverableStatus
# Deliverables whose name says motion are videos, the rest are images.
MOTION = ("reel", "clip", "story", "transition", "movement", "walk", "twirl")

# name, collection, category, colour of the generated photos
PRODUCTS = [
    ("Black Abaya 042", "Autumn Drop", "Abayas", (40, 36, 44)),
    ("Cream Dress 011", "Autumn Drop", "Dresses", (232, 220, 196)),
    ("Olive Set 003", "Everyday", "Co-ords", (104, 112, 64)),
    ("Mocha Coat 021", "Autumn Drop", "Outerwear", (112, 82, 64)),
    ("Sand Set 006", "Summer 26", "Co-ords", (214, 190, 150)),
]

# title, type, product index or None, number of images
REFERENCES = [
    ("Slow walk in the studio", ReferenceType.VIDEO, 0, 1),
    ("Soft window light", ReferenceType.IMAGE, 1, 1),
    ("Autumn moodboard", ReferenceType.MOODBOARD, None, 3),
    ("Fabric close-ups", ReferenceType.IMAGE, 2, 1),
    ("Street look", ReferenceType.MOODBOARD, 3, 2),
]

# name, days from today, start, minutes, location, creators (indexes), mobilographer,
# products, references, deliverables: (name, product, assignees, references, status, due in days)
Task = tuple[str, int, list[int], list[int], DeliverableStatus, int]
ShootSpec = tuple[str, int, time, int, str, list[int], int | None, list[int], list[int], list[Task]]

SHOOTS: list[ShootSpec] = [
    (
        "Shoot 01 — Summer",
        -40,
        time(10),
        240,
        "Tashkent Studio",
        [0, 1],
        2,
        [4, 1],
        [1],
        [
            ("Walking transition", 4, [0], [1], S.APPROVED, -38),
            ("Detail movement", 4, [1], [], S.APPROVED, -38),
            ("Portrait", 1, [0, 2], [1], S.APPROVED, -37),
        ],
    ),
    (
        "Shoot 02 — Fabric Details",
        -3,
        time(9, 30),
        180,
        "White Studio",
        [0],
        1,
        [2, 0],
        [3, 0],
        [
            ("Fabric close-up", 2, [0], [3], S.APPROVED, -2),
            ("Close-up texture", 0, [1], [0], S.NEEDS_CHANGES, -1),
            ("Story clips", 2, [0, 1], [], S.NEEDS_REVIEW, 1),
            ("Lifestyle shot", 2, [1], [3], S.NEEDS_REVIEW, 1),
            ("Sleeve detail", 0, [0], [], S.IN_PROGRESS, 2),
            ("Product detail", 0, [0], [3], S.TO_SHOOT, 2),
        ],
    ),
    (
        "Shoot 03 — Everyday",
        -1,
        time(13),
        120,
        "Chilonzor, Tashkent",
        [2],
        None,
        [2],
        [],
        [
            ("Everyday look", 2, [2], [], S.TO_SHOOT, 3),
            ("Mirror selfie", 2, [2], [], S.TO_SHOOT, 3),
        ],
    ),
    (
        "Shoot 04 — Autumn Drop",
        6,
        time(10),
        360,
        "Tashkent Studio",
        [0, 1],
        2,
        [0, 1, 3],
        [0, 1, 2, 4],
        [
            ("Walking transition", 0, [0], [0], S.TO_SHOOT, 8),
            ("Fabric close-up", 0, [2], [2], S.TO_SHOOT, 8),
            ("Detail movement", 1, [1], [1], S.TO_SHOOT, 9),
            ("Story clips", 1, [1, 2], [], S.TO_SHOOT, 9),
            ("Portrait", 3, [0], [4], S.TO_SHOOT, 10),
            ("Close-up texture", 3, [], [4], S.TO_SHOOT, 10),
        ],
    ),
    (
        "Shoot 05 — Holiday Edit",
        21,
        time(11, 30),
        300,
        "Magic City, Tashkent",
        [1, 2],
        0,
        [3, 4, 1],
        [2],
        [
            ("Lookbook", 3, [1], [2], S.TO_SHOOT, 24),
            ("Reels teaser", 4, [2, 0], [2], S.TO_SHOOT, 25),
            ("Product detail", 1, [], [], S.TO_SHOOT, 25),
        ],
    ),
    (
        "Shoot 06 — Studio Basics",
        -7,
        time(12),
        240,
        "White Studio",
        [1, 2],
        None,
        [1, 3],
        [1, 4],
        [
            ("Lookbook", 1, [1], [1], S.APPROVED, -5),
            ("Coat walk", 3, [2], [4], S.IN_PROGRESS, 2),
            ("Detail movement", 1, [1, 2], [], S.IN_PROGRESS, 3),
            ("Portrait", 3, [2], [], S.TO_SHOOT, 4),
        ],
    ),
    (
        "Shoot 07 — Outerwear",
        -12,
        time(15),
        180,
        "Yunusobod, Tashkent",
        [0],
        2,
        [3],
        [4],
        [
            ("Coat on the street", 3, [0], [4], S.NEEDS_CHANGES, -3),
            ("Belt detail", 3, [2], [], S.NEEDS_CHANGES, -2),
            ("Full outfit", 3, [0, 2], [4], S.APPROVED, -6),
        ],
    ),
    (
        "Shoot 08 — Spring Preview",
        45,
        time(10, 30),
        480,
        "Tashkent Studio",
        [0, 1, 2],
        None,
        [0, 1, 2, 3, 4],
        [0, 1, 2, 3, 4],
        [
            ("Campaign hero", 0, [0], [2], S.TO_SHOOT, 50),
            ("Dress twirl", 1, [1], [1], S.TO_SHOOT, 50),
            ("Co-ord flatlay", 2, [2], [3], S.TO_SHOOT, 51),
            ("Coat close-up", 3, [0], [4], S.TO_SHOOT, 51),
            ("Sand set reel", 4, [1, 2], [0], S.TO_SHOOT, 52),
        ],
    ),
]


def demo_id(name: str) -> uuid.UUID:
    return uuid.uuid5(DEMO, name)


def demo_type(name: str) -> DeliverableType:
    lower = name.lower()
    return DeliverableType.VIDEO if any(word in lower for word in MOTION) else DeliverableType.IMAGE


def photo(colour: tuple[int, int, int], label: str, variant: int) -> bytes:
    """A 4:5 WebP: a vertical gradient of the colour with the label on it."""
    width, height = 640, 800
    image = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(image)
    for y in range(height):
        k = 0.75 + 0.35 * y / height - 0.08 * variant
        draw.line([(0, y), (width, y)], fill=tuple(max(0, min(255, int(c * k))) for c in colour))
    text = "#ffffff" if sum(colour) < 400 else "#2a2030"
    draw.text((40, height - 90), label, fill=text, font_size=36)
    draw.text((40, height - 46), "DEMO", fill=text, font_size=22)
    buffer = io.BytesIO()
    image.save(buffer, "WEBP", quality=80)
    return buffer.getvalue()


async def add_file(
    db: AsyncSession, storage: Storage, owner: User, name: str, data: bytes
) -> StoredFile:
    file_id = demo_id(f"file:{name}")
    file = StoredFile(
        id=file_id,
        owner_id=owner.id,
        key=f"files/demo/{file_id}.webp",
        kind=FileKind.IMAGE,
        content_type="image/webp",
        size=len(data),
    )
    await storage.put(file.key, data, file.content_type)
    db.add(file)
    await db.flush()
    return file


async def user(db: AsyncSession, email: str) -> User:
    found = await db.scalar(select(User).where(User.email == email))
    if found is None:
        sys.exit(f"Нет пользователя {email}: демо-набор строится на тестовых аккаунтах")
    return found


async def delete_files(db: AsyncSession, storage: Storage, *where: object) -> None:
    files = list(await db.scalars(select(StoredFile).where(*where)))  # type: ignore[arg-type]
    for file in files:
        await storage.delete(file.key)
        await db.delete(file)


async def clear(db: AsyncSession, storage: Storage) -> None:
    """Только демо-набор: по его id и файлам под files/demo/."""
    await db.execute(delete(Shoot).where(Shoot.id.in_([demo_id(s[0]) for s in SHOOTS])))
    await db.execute(delete(Reference).where(Reference.id.in_([demo_id(r[0]) for r in REFERENCES])))
    await db.execute(delete(Product).where(Product.id.in_([demo_id(p[0]) for p in PRODUCTS])))
    await delete_files(db, storage, StoredFile.key.like("files/demo/%"))


async def wipe(db: AsyncSession, storage: Storage) -> None:
    """Все продукты, референсы, съёмки и загруженные файлы, не только демо."""
    for model in (Shoot, Reference, Product):
        await db.execute(delete(model))
    await delete_files(db, storage)


async def seed(db: AsyncSession, storage: Storage) -> None:
    brand = await user(db, BRAND)
    art_director = await user(db, ART_DIRECTOR)
    creators = [await user(db, email) for email in CREATORS]
    today = date.today()

    products: list[Product] = []
    for index, (name, collection, category, colour) in enumerate(PRODUCTS):
        product = Product(
            id=demo_id(name),
            brand_id=brand.id,
            name=name,
            about=f"{name}: demo product for the {collection} collection.",
            collection=collection,
            category=category,
            sku=f"DEMO-{index + 1:03}",
            tags=[TAG, category.lower()],
        )
        db.add(product)
        await db.flush()
        for position in range(3):
            file = await add_file(
                db, storage, brand, f"{name}:{position}", photo(colour, name, position)
            )
            db.add(ProductPhoto(product_id=product.id, position=position, file_id=file.id))
        # The art director's deliverables: they let ad1 see the product.
        for position, status in enumerate([S.APPROVED, S.IN_PROGRESS, S.TO_SHOOT][: 2 + index % 2]):
            db.add(
                Deliverable(
                    product_id=product.id,
                    position=position,
                    assignee_id=art_director.id,
                    name=["Lookbook photos", "Reels", "Detail shots"][position],
                    type=DeliverableType.VIDEO if position == 1 else DeliverableType.IMAGE,
                    status=status,
                    due_date=today + timedelta(days=7 * (position + 1)),
                )
            )
        products.append(product)

    references: list[Reference] = []
    for title, kind, product_index, images in REFERENCES:
        reference = Reference(
            id=demo_id(title),
            owner_id=art_director.id,
            product_id=products[product_index].id if product_index is not None else None,
            title=title,
            type=kind,
            collection="Autumn Drop",
            notes="Demo reference.",
            tags=[TAG, kind.value],
        )
        db.add(reference)
        await db.flush()
        colour = PRODUCTS[product_index or 0][3]
        for position in range(images):
            file = await add_file(
                db, storage, art_director, f"{title}:{position}", photo(colour, title, position)
            )
            db.add(ReferenceFile(reference_id=reference.id, position=position, file_id=file.id))
        references.append(reference)

    for (
        name,
        days,
        start,
        minutes,
        location,
        creator_indexes,
        mobilographer,
        product_indexes,
        reference_indexes,
        deliverables,
    ) in SHOOTS:
        shoot = Shoot(
            id=demo_id(name),
            art_director_id=art_director.id,
            name=name,
            date=today + timedelta(days=days),
            start_time=start,
            duration_minutes=minutes,
            location=location,
        )
        db.add(shoot)
        await db.flush()
        team = [(creators[i], ShootRole.CREATOR) for i in creator_indexes]
        if mobilographer is not None:
            team.append((creators[mobilographer], ShootRole.MOBILOGRAPHER))
        db.add_all(
            ShootMember(shoot_id=shoot.id, user_id=member.id, role=role, position=i)
            for i, (member, role) in enumerate(team)
        )
        db.add_all(
            ShootProduct(shoot_id=shoot.id, product_id=products[p].id, position=i)
            for i, p in enumerate(product_indexes)
        )
        db.add_all(
            ShootReference(shoot_id=shoot.id, reference_id=references[r].id, position=i)
            for i, r in enumerate(reference_indexes)
        )
        for position, (task, product_index, assignees, refs, status, due) in enumerate(
            deliverables
        ):
            deliverable = ShootDeliverable(
                shoot_id=shoot.id,
                position=position,
                product_id=products[product_index].id,
                name=task,
                type=demo_type(task),
                status=status,
                due_date=today + timedelta(days=due),
            )
            db.add(deliverable)
            await db.flush()
            db.add_all(
                ShootDeliverableAssignee(
                    deliverable_id=deliverable.id, user_id=creators[a].id, position=i
                )
                for i, a in enumerate(assignees)
            )
            db.add_all(
                ShootDeliverableReference(
                    deliverable_id=deliverable.id, reference_id=references[r].id, position=i
                )
                for i, r in enumerate(refs)
            )
    await db.flush()


async def main(command: str) -> None:
    settings = get_settings()
    storage = build_storage(settings)
    if storage is None:
        sys.exit("Хранилище не настроено (S3_BUCKET)")
    engine = create_engine(str(settings.database_url))
    try:
        async with create_sessionmaker(engine)() as db:
            if command == "reset":
                await wipe(db, storage)
            else:
                await clear(db, storage)
            if command in ("reset", "seed"):
                await seed(db, storage)
            await db.commit()
    finally:
        await engine.dispose()
    sys.stdout.write(f"demo: {command} — готово\n")


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in ("reset", "seed", "clear"):
        sys.exit("uv run python -m app.demo.seed reset|seed|clear")
    asyncio.run(main(sys.argv[1]))
