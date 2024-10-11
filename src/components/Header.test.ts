import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Header from './Header.astro';

test('Header', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(Header, {
        props: { name: 'User Name Here' },
    });

    //console.log(result);

    expect(result).toContain('User Name Here');
    expect(result).toContain('Peak Logger');
    expect(result).toContain('Sign Out');
    expect(result).toContain('/recent');
    expect(result).toContain('/import');
    expect(result).toContain('/account');
});
