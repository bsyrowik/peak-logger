import { expect, test } from 'vitest';
import { Bitfield } from './bitfield';

test('bitfield set true', () => {
    const b = new Bitfield();
    b.set(0, true);
    expect(b.data).toBe(0x01);
});

test('bitfield set false', () => {
    const b = new Bitfield();
    b.set(0, true);
    b.set(1, true);
    b.set(0, false);
    expect(b.data).toBe(0x02);
});
