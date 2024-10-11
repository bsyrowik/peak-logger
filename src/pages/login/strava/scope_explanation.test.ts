import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test, vi } from 'vitest';
import ScopeExplanation from './scope_explanation.astro';

vi.mock('../util/db');

test('ScopeExplanation page not logged in', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(ScopeExplanation, {});

    expect(result).toContain('Auto-detect');
    expect(result).toContain('Sign Up');
    expect(result).toContain('Log In');
    expect(result).not.toContain('Sign Out');
});

test('ScopeExplanation page logged in', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(ScopeExplanation, {
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
