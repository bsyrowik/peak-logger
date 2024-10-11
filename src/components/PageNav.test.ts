import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import PageNav from './PageNav.astro';

test('PageNav page 1 and may be another', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(PageNav, {
        props: {
            href: 'pageNavHref?',
            page: 1,
            mayBeAnotherPage: true,
        },
    });

    //console.log(result);

    expect(result).toContain('pageNavHref?page=0" class="disabled-link"');
    expect(result).toContain('pageNavHref?page=2');
});

test('PageNav page 1 and no more', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(PageNav, {
        props: {
            href: 'pageNavHref?',
            page: 1,
            mayBeAnotherPage: false,
        },
    });

    //console.log(result);

    expect(result).toContain('pageNavHref?page=0" class="disabled-link"');
    expect(result).toContain('pageNavHref?page=2" class="disabled-link"');
});

test('PageNav page 2 and may be another', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(PageNav, {
        props: {
            href: 'pageNavHref?',
            page: 2,
            mayBeAnotherPage: true,
        },
    });

    //console.log(result);

    expect(result).toContain('pageNavHref?page=1');
    expect(result).toContain('pageNavHref?page=3');
});

test('PageNav page 2 and may no more', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(PageNav, {
        props: {
            href: 'pageNavHref?',
            page: 2,
            mayBeAnotherPage: false,
        },
    });

    //console.log(result);

    expect(result).toContain('pageNavHref?page=1');
    expect(result).toContain('pageNavHref?page=3" class="disabled-link"');
});
