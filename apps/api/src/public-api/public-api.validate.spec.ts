import { BadRequestException } from '@nestjs/common';
import {
  cleanDate, cleanDeal, cleanEmail, cleanLimit, cleanMediaUrls, cleanSource, cleanStage, cleanString, cleanTags,
} from './public-api.validate';

describe('public API validation', () => {
  it('cleanString trims, caps and enforces required', () => {
    expect(cleanString('  hi  ', 'f', 10)).toBe('hi');
    expect(cleanString(undefined, 'f', 10)).toBeUndefined();
    expect(() => cleanString('', 'f', 10, true)).toThrow(BadRequestException);
    expect(() => cleanString('x'.repeat(11), 'f', 10)).toThrow(BadRequestException);
    expect(() => cleanString(5, 'f', 10)).toThrow(BadRequestException);
  });

  it('cleanEmail lowercases and validates', () => {
    expect(cleanEmail(' Ada@X.com ')).toBe('ada@x.com');
    expect(cleanEmail(undefined)).toBeUndefined();
    expect(() => cleanEmail('nope')).toThrow(BadRequestException);
  });

  it('stage and source accept only known values, case-insensitively', () => {
    expect(cleanStage('proposal')).toBe('PROPOSAL');
    expect(cleanStage(undefined)).toBeUndefined();
    expect(() => cleanStage('WON')).toThrow(BadRequestException);
    expect(cleanSource('website')).toBe('WEBSITE');
    expect(() => cleanSource('TV')).toThrow(BadRequestException);
  });

  it('tags are deduped, trimmed and bounded', () => {
    expect(cleanTags([' a ', 'a', 'b'])).toEqual(['a', 'b']);
    expect(() => cleanTags('a' as any)).toThrow(BadRequestException);
    expect(() => cleanTags(['x'.repeat(41)])).toThrow(BadRequestException);
    expect(() => cleanTags(Array.from({ length: 21 }, (_, i) => `t${i}`))).toThrow(BadRequestException);
  });

  it('deal value and dates distinguish absent from cleared', () => {
    expect(cleanDeal(undefined)).toBeUndefined();
    expect(cleanDeal(null)).toBeNull();
    expect(cleanDeal(250)).toBe(250);
    expect(() => cleanDeal(-1)).toThrow(BadRequestException);
    expect(() => cleanDeal('5' as any)).toThrow(BadRequestException);
    expect(cleanDate(undefined, 'd')).toBeUndefined();
    expect(cleanDate(null, 'd')).toBeNull();
    expect(cleanDate('2030-01-01T00:00:00Z', 'd')).toBeInstanceOf(Date);
    expect(() => cleanDate('not a date', 'd')).toThrow(BadRequestException);
  });

  it('limit is clamped', () => {
    expect(cleanLimit(undefined)).toBe(50);
    expect(cleanLimit('500')).toBe(100);
    expect(cleanLimit('0')).toBe(1);
    expect(cleanLimit('abc')).toBe(50);
  });

  it('media URLs must be https and few', () => {
    expect(cleanMediaUrls(undefined)).toEqual([]);
    expect(cleanMediaUrls(['https://x.com/a.png'])).toEqual(['https://x.com/a.png']);
    expect(() => cleanMediaUrls(['http://x.com/a.png'])).toThrow(BadRequestException);
    expect(() => cleanMediaUrls(['javascript:alert(1)'])).toThrow(BadRequestException);
    expect(() => cleanMediaUrls(Array.from({ length: 11 }, () => 'https://x.com/a.png'))).toThrow(BadRequestException);
  });
});
