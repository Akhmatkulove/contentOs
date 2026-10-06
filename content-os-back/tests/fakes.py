from dataclasses import dataclass, field
from typing import BinaryIO


@dataclass
class FakeStorage:
    """Хранилище в памяти: что положили, с каким Content-Type и публичное ли."""

    files: dict[str, tuple[bytes, str]] = field(default_factory=dict)
    public: set[str] = field(default_factory=set)

    async def put(self, key: str, data: bytes, content_type: str, *, public: bool = False) -> None:
        self.files[key] = (data, content_type)
        if public:
            self.public.add(key)

    async def put_stream(self, key: str, stream: BinaryIO, content_type: str) -> None:
        self.files[key] = (stream.read(), content_type)

    async def delete(self, key: str) -> None:
        self.files.pop(key, None)

    def presigned_url(self, key: str) -> str:
        return f"http://signed.test/{key}?signature=fake"
