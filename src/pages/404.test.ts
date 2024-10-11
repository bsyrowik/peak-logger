import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test, vi } from 'vitest';
import Four04 from './404.astro';

vi.mock('../util/db');

test('Four04 page not logged in', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(Four04, {});

    expect(result).toContain('Auto-detect');
    expect(result).toContain('Sign Up');
    expect(result).toContain('Log In');
    expect(result).not.toContain('Sign Out');
});

test('Four04 page logged in', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(Four04, {
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
