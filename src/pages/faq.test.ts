import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test, vi } from 'vitest';
import FAQ from './faq.astro';

vi.mock('../util/db');

test('FAQ page not logged in', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(FAQ, {});

    expect(result).toContain('Auto-detect');
    expect(result).toContain('Sign Up');
    expect(result).toContain('Log In');
    expect(result).not.toContain('Sign Out');
});

test('FAQ page logged in', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(FAQ, {
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
