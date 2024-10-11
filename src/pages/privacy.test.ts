import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test, vi } from 'vitest';
import Privacy from './privacy.astro';

vi.mock('../util/db');

test('Privacy page not logged in', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(Privacy, {});

    expect(result).toContain('Auto-detect');
    expect(result).toContain('Sign Up');
    expect(result).toContain('Log In');
    expect(result).not.toContain('Sign Out');
});

test('Privacy page logged in', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(Privacy, {
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
    expect(result).not.toContain('Sign Up');
    expect(result).not.toContain('Log In');
    expect(result).toContain('Sign Out');
});
