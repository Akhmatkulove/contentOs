"""Подготовка аватара: проверка, кадрирование, перекодирование без метаданных."""

from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
AVATAR_SIZE = 512
ALLOWED_FORMATS = {"JPEG", "PNG"}
# 5 МБ хорошо сжатого PNG могут развернуться в гигабайты пикселей. Проверяем до декодирования.
MAX_PIXELS = 40_000_000


class InvalidImageError(Exception):
    pass


def make_avatar(data: bytes) -> bytes:
    """JPEG/PNG → квадратный WebP 512×512. EXIF (в том числе геолокация) не сохраняется."""
    try:
        with Image.open(BytesIO(data)) as image:
            # Формат по содержимому файла, а не по расширению или Content-Type.
            if image.format not in ALLOWED_FORMATS:
                raise InvalidImageError("Only JPEG and PNG are allowed")
            if image.width * image.height > MAX_PIXELS:
                raise InvalidImageError("Image resolution is too large")
            image.load()
            # Телефоны пишут поворот в EXIF, применяем его до того, как EXIF выбросим.
            oriented = ImageOps.exif_transpose(image)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise InvalidImageError("File is not a valid image") from exc

    mode = "RGBA" if oriented.mode in ("RGBA", "LA", "P") else "RGB"
    avatar = ImageOps.fit(oriented.convert(mode), (AVATAR_SIZE, AVATAR_SIZE))
    output = BytesIO()
    avatar.save(output, format="WEBP", quality=85)
    return output.getvalue()
