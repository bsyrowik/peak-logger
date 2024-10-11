import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test, vi } from 'vitest';
import Index from './index.astro';

vi.mock('../util/db');

test('Index page not logged in', async () => {
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(Index, {});

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/about');
});

test('Index page logged in', async () => {
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(Index, {
        locals: {
            user: {
                firstname: 'John',
                lastname: 'Doe',
            },
            session: {},
        },
    });

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/recent');
});
