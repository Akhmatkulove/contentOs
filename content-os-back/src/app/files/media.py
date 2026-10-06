"""Проверка файлов по содержимому и подготовка изображений."""

from dataclasses import dataclass
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

MAX_IMAGE_BYTES = 15 * 1024 * 1024
MAX_VIDEO_BYTES = 100 * 1024 * 1024
# Длинная сторона после перекодирования: хватает для полноэкранного просмотра на ретине.
MAX_IMAGE_SIDE = 2560
IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
# Хорошо сжатый PNG может развернуться в гигабайты пикселей. Проверяем до декодирования.
MAX_PIXELS = 60_000_000


class InvalidFileError(Exception):
    pass


@dataclass(frozen=True)
class VideoType:
    content_type: str
    extension: str


def sniff_video(head: bytes) -> VideoType | None:
    """Тип видео по первым байтам файла: MP4, MOV или WebM."""
    if head[4:8] == b"ftyp":
        # ISO BMFF: бренд "qt  " — QuickTime, остальные (isom, mp42, avc1…) — MP4.
        if head[8:12] == b"qt  ":
            return VideoType("video/quicktime", "mov")
        return VideoType("video/mp4", "mp4")
    # EBML-заголовок общий у WebM и Matroska, их различает DocType.
    if head.startswith(b"\x1a\x45\xdf\xa3") and b"webm" in head[:64]:
        return VideoType("video/webm", "webm")
    return None


def is_image(head: bytes) -> bool:
    return (
        head.startswith(b"\xff\xd8\xff")  # JPEG
        or head.startswith(b"\x89PNG\r\n\x1a\n")
        or (head.startswith(b"RIFF") and head[8:12] == b"WEBP")
    )


def prepare_image(data: bytes) -> bytes:
    """JPEG/PNG/WebP → WebP с длинной стороной до 2560 px, без EXIF (в том числе геолокации)."""
    try:
        with Image.open(BytesIO(data)) as image:
            if image.format not in IMAGE_FORMATS:
                raise InvalidFileError("Only JPEG, PNG and WebP images are allowed")
            if image.width * image.height > MAX_PIXELS:
                raise InvalidFileError("Image resolution is too large")
            image.load()
            # Телефоны пишут поворот в EXIF, применяем его до того, как EXIF выбросим.
            oriented = ImageOps.exif_transpose(image)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise InvalidFileError("File is not a valid image") from exc

    mode = "RGBA" if oriented.mode in ("RGBA", "LA", "P") else "RGB"
    prepared = oriented.convert(mode)
    prepared.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))
    output = BytesIO()
    prepared.save(output, format="WEBP", quality=85)
    return output.getvalue()
