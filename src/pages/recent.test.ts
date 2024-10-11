import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test, vi } from 'vitest';
import Recent from './recent.astro';

vi.mock('../util/db');

test('Recent page', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(Recent, {
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
});
