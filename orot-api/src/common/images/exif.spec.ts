import { parseExifDateString } from './exif';

describe('parseExifDateString', () => {
  it('parses the EXIF calendar date without shifting the day', () => {
    const takenAt = parseExifDateString('2024:03:09 14:22:10');

    expect(takenAt?.toISOString()).toBe('2024-03-09T00:00:00.000Z');
  });

  it('accepts dashed dates as a fallback format', () => {
    const takenAt = parseExifDateString('2024-03-09');

    expect(takenAt?.toISOString()).toBe('2024-03-09T00:00:00.000Z');
  });

  it('returns undefined for impossible dates', () => {
    expect(parseExifDateString('2024:02:31 10:20:30')).toBeUndefined();
  });
});
