import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import PBLink from './PBLink.astro';

test('PBLink with href and text', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(PBLink, {
        props: {
            href: 'peaks?id=7',
            text: 'some text',
        },
    });

    expect(result).toContain('some text');
    expect(result).not.toContain('Peakbagger.com');
    expect(result).toContain('peakbagger.com/peaks?id=7');
});

test('PBLink with href and no text', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(PBLink, {
        props: {
            href: 'peaks?id=7',
            text: '',
        },
    });

    expect(result).toContain('Peakbagger.com');
    expect(result).toContain('peakbagger.com/peaks?id=7');
});

test('PBLink with no href and no text', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(PBLink, {
        props: {
            href: '',
            text: '',
        },
    });

    expect(result).toContain('Peakbagger.com');
    expect(result).toContain('peakbagger.com/"');
});

test('PBLink with href and no text', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(PBLink, {
        props: {
            href: '',
            text: 'some text',
        },
    });

    expect(result).not.toContain('Peakbagger.com');
    expect(result).toContain('some text');
    expect(result).toContain('peakbagger.com/"');
});
