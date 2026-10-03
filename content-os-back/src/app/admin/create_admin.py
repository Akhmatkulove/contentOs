"""Создаёт админа или меняет ему пароль: `uv run python -m app.admin.create_admin <email>`.

Через регистрацию админа не создать (docs/adr/0002). Пароль спрашивается в терминале
и в историю shell не попадает. Обычного пользователя админом команда не делает.
"""

import asyncio
import sys
from getpass import getpass

from pydantic import TypeAdapter, ValidationError

from app.admin.service import NotAnAdminError, create_or_reset_admin
from app.auth.schemas import Email
from app.core.config import get_settings
from app.core.db import create_engine, create_sessionmaker

MIN_PASSWORD_LENGTH = 12


def ask_password() -> str:
    password = getpass("Пароль: ")
    if len(password) < MIN_PASSWORD_LENGTH:
        sys.exit(f"Пароль короче {MIN_PASSWORD_LENGTH} символов")
    if len(password) > 128:
        sys.exit("Пароль длиннее 128 символов")
    if getpass("Ещё раз: ") != password:
        sys.exit("Пароли не совпадают")
    return password


async def main(email: str, password: str) -> None:
    engine = create_engine(str(get_settings().database_url))
    try:
        async with create_sessionmaker(engine)() as db:
            created = await create_or_reset_admin(db, email, password)
            await db.commit()
    except NotAnAdminError:
        sys.exit(f"{email} — обычный пользователь, админом его не сделать")
    finally:
        await engine.dispose()
    sys.stdout.write(f"Админ {email} {'создан' if created else 'получил новый пароль'}\n")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    try:
        email = TypeAdapter(Email).validate_python(sys.argv[1])
    except ValidationError:
        sys.exit(f"Некорректный email: {sys.argv[1]}")
    asyncio.run(main(email, ask_password()))
