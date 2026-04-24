const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00] as const;
const TIFF_LITTLE_ENDIAN = 0x4949;
const TIFF_BIG_ENDIAN = 0x4d4d;
const TIFF_MAGIC = 42;
const ASCII_TYPE = 2;
const SHORT_TYPE = 3;
const LONG_TYPE = 4;
const ENTRY_SIZE = 12;
const IFD0_DATE_TIME_TAG = 0x0132;
const EXIF_POINTER_TAG = 0x8769;
const EXIF_DATE_TIME_ORIGINAL_TAG = 0x9003;
const EXIF_DATE_TIME_DIGITIZED_TAG = 0x9004;

function matchesHeader(
  bytes: Uint8Array,
  offset: number,
  header: readonly number[],
): boolean {
  if (offset < 0 || offset + header.length > bytes.byteLength) {
    return false;
  }

  return header.every((value, index) => bytes[offset + index] === value);
}

function readUint16(
  view: DataView,
  offset: number,
  littleEndian: boolean,
): number | undefined {
  if (offset < 0 || offset + 2 > view.byteLength) {
    return undefined;
  }

  return view.getUint16(offset, littleEndian);
}

function readUint32(
  view: DataView,
  offset: number,
  littleEndian: boolean,
): number | undefined {
  if (offset < 0 || offset + 4 > view.byteLength) {
    return undefined;
  }

  return view.getUint32(offset, littleEndian);
}

function readAscii(
  bytes: Uint8Array,
  offset: number,
  count: number,
): string | undefined {
  if (offset < 0 || count <= 0 || offset + count > bytes.byteLength) {
    return undefined;
  }

  let value = '';

  for (let index = 0; index < count; index += 1) {
    const code = bytes[offset + index];
    if (code === 0) {
      break;
    }

    value += String.fromCharCode(code);
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function readAsciiTagFromIfd(
  bytes: Uint8Array,
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean,
  targetTags: number[],
): string | undefined {
  const directoryOffset = tiffStart + ifdOffset;
  const entryCount = readUint16(view, directoryOffset, littleEndian);

  if (entryCount === undefined) {
    return undefined;
  }

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = directoryOffset + 2 + index * ENTRY_SIZE;
    if (entryOffset + ENTRY_SIZE > view.byteLength) {
      return undefined;
    }

    const tag = readUint16(view, entryOffset, littleEndian);
    if (tag === undefined || !targetTags.includes(tag)) {
      continue;
    }

    const type = readUint16(view, entryOffset + 2, littleEndian);
    const count = readUint32(view, entryOffset + 4, littleEndian);

    if (type !== ASCII_TYPE || count === undefined || count < 1) {
      continue;
    }

    const valueOffset =
      count <= 4
        ? entryOffset + 8
        : tiffStart + (readUint32(view, entryOffset + 8, littleEndian) ?? -1);

    const value = readAscii(bytes, valueOffset, count);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function readUintTagFromIfd(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean,
  targetTag: number,
): number | undefined {
  const directoryOffset = tiffStart + ifdOffset;
  const entryCount = readUint16(view, directoryOffset, littleEndian);

  if (entryCount === undefined) {
    return undefined;
  }

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = directoryOffset + 2 + index * ENTRY_SIZE;
    if (entryOffset + ENTRY_SIZE > view.byteLength) {
      return undefined;
    }

    const tag = readUint16(view, entryOffset, littleEndian);
    if (tag !== targetTag) {
      continue;
    }

    const type = readUint16(view, entryOffset + 2, littleEndian);
    const count = readUint32(view, entryOffset + 4, littleEndian);

    if (count !== 1) {
      return undefined;
    }

    if (type === LONG_TYPE) {
      return readUint32(view, entryOffset + 8, littleEndian);
    }

    if (type === SHORT_TYPE) {
      return readUint16(view, entryOffset + 8, littleEndian);
    }

    return undefined;
  }

  return undefined;
}

export function parseExifDateString(value?: string | null): Date | undefined {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }

  const match = normalized.match(
    /^(\d{4})[:-](\d{2})[:-](\d{2})(?:\s+\d{2}:\d{2}:\d{2})?$/,
  );
  if (!match) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return undefined;
  }

  // EXIF timestamps are often timezone-less, so we keep the calendar date stable.
  const takenAt = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(takenAt.getTime()) ||
    takenAt.getUTCFullYear() !== year ||
    takenAt.getUTCMonth() !== month - 1 ||
    takenAt.getUTCDate() !== day
  ) {
    return undefined;
  }

  return takenAt;
}

export function extractTakenAtFromExif(
  exif?: Buffer | Uint8Array | null,
): Date | undefined {
  if (!exif || exif.byteLength === 0) {
    return undefined;
  }

  const bytes = exif instanceof Uint8Array ? exif : new Uint8Array(exif);
  const tiffStart = matchesHeader(bytes, 0, EXIF_HEADER) ? 6 : 0;

  if (bytes.byteLength < tiffStart + 8) {
    return undefined;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const byteOrderMarker = readUint16(view, tiffStart, false);

  if (byteOrderMarker === undefined) {
    return undefined;
  }

  const littleEndian =
    byteOrderMarker === TIFF_LITTLE_ENDIAN
      ? true
      : byteOrderMarker === TIFF_BIG_ENDIAN
        ? false
        : undefined;

  if (littleEndian === undefined) {
    return undefined;
  }

  const magic = readUint16(view, tiffStart + 2, littleEndian);

  if (magic !== TIFF_MAGIC) {
    return undefined;
  }

  const ifd0Offset = readUint32(view, tiffStart + 4, littleEndian);

  if (ifd0Offset === undefined) {
    return undefined;
  }

  const exifIfdOffset = readUintTagFromIfd(
    view,
    tiffStart,
    ifd0Offset,
    littleEndian,
    EXIF_POINTER_TAG,
  );

  const rawTakenAt =
    (exifIfdOffset !== undefined
      ? readAsciiTagFromIfd(
          bytes,
          view,
          tiffStart,
          exifIfdOffset,
          littleEndian,
          [EXIF_DATE_TIME_ORIGINAL_TAG, EXIF_DATE_TIME_DIGITIZED_TAG],
        )
      : undefined) ??
    readAsciiTagFromIfd(bytes, view, tiffStart, ifd0Offset, littleEndian, [
      IFD0_DATE_TIME_TAG,
    ]);

  return parseExifDateString(rawTakenAt);
}
