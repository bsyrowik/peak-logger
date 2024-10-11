import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import HeaderBasic from './HeaderBasic.astro';

test('HeaderBasic not logged in', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(HeaderBasic, {});

    //console.log(result);

    expect(result).toContain('Peak Logger');
    expect(result).toContain('Log In');
    expect(result).toContain('Sign Up');
});

test('HeaderBasic logged in', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(HeaderBasic, {
        locals: {
            user: {
                firstname: 'John',
                lastname: 'Doe',
            },
            session: {},
        },
    });

    //console.log(result);

    expect(result).toContain('Peak Logger');
    expect(result).toContain('Sign Out');
    expect(result).toContain('/account');
});
