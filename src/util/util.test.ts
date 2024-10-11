import { expect, test } from 'vitest';
import { formatTime, niceDate } from '@util/util';

test('formatTime', () => {
    expect(formatTime(5)).toBe('00:05');
    expect(formatTime(121)).toBe('02:01');
    expect(formatTime(3672)).toBe('1:01:12');
});

test('niceDate', () => {
    expect(niceDate(new Date(10000000000))).toBe('Apr 26, 1970, 10:46 a.m.');
});
