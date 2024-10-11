import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test, vi } from 'vitest';
import Account from './account.astro';

vi.mock('../util/db');

test('Account page', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(Account, {
        locals: {
            user: {
                firstname: 'John',
                lastname: 'Doe',
                detection_radius: 199,
            },
            session: {},
        },
    });

    expect(result).toContain('Auto-detect');
    expect(result).toContain('199');
});

test('Account page with PB', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(Account, {
        locals: {
            user: {
                firstname: 'John',
                lastname: 'Doe',
                detection_radius: 199,
                strava_approved_scope: 0x3f,
                peakbagger_id: 122,
            },
            session: {},
        },
    });

    expect(result).toContain('Auto-detect');
    expect(result).toContain('199');
});
