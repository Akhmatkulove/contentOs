import itertools
from dataclasses import dataclass, field
from urllib.parse import urlsplit

# Хранилища по номеру: тест кладёт файл по presigned URL, как браузер (put_presigned).
_storages: dict[int, "FakeStorage"] = {}
_numbers = itertools.count()


@dataclass
class FakeStorage:
    """Хранилище в памяти: что положили, с каким Content-Type и публичное ли."""

    files: dict[str, tuple[bytes, str]] = field(default_factory=dict)
    public: set[str] = field(default_factory=set)
    number: int = field(default_factory=lambda: next(_numbers))

    def __post_init__(self) -> None:
        _storages[self.number] = self

    async def put(self, key: str, data: bytes, content_type: str, *, public: bool = False) -> None:
        self.files[key] = (data, content_type)
        if public:
            self.public.add(key)

    async def delete(self, key: str) -> None:
        self.files.pop(key, None)

    def presigned_url(self, key: str) -> str:
        return f"http://signed.test/{key}?signature=fake"

    def presigned_put_url(self, key: str, content_type: str) -> str:
        return f"http://storage.test/{self.number}/{key}?content-type={content_type}"

    async def size(self, key: str) -> int | None:
        stored = self.files.get(key)
        return None if stored is None else len(stored[0])

    async def read(self, key: str, length: int | None = None) -> bytes:
        data = self.files[key][0]
        return data if length is None else data[:length]

    async def copy(self, source: str, target: str, content_type: str) -> None:
        self.files[target] = (self.files[source][0], content_type)


def put_presigned(url: str, data: bytes, content_type: str = "application/octet-stream") -> None:
    """Что делает браузер с presigned PUT URL: кладёт файл прямо в хранилище."""
    number, key = urlsplit(url).path.lstrip("/").split("/", 1)
    _storages[int(number)].files[key] = (data, content_type)
