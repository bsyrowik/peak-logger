import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import ActivitySelect from './ActivitySelect.astro';
import { ActivityType } from '@util/activity';

test('ActivitySelect un-checked', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(ActivitySelect, {
        props: {
            type: ActivityType.TrailRun,
            activities: 0,
        },
    });

    //console.log(result);

    expect(result).toContain('Trail Run');
    expect(result).toContain('id="at_TrailRun"');
    expect(result).toContain('class="checkbox-style"');
    expect(result).not.toContain('checked');
});

test('ActivitySelect checked', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(ActivitySelect, {
        props: {
            type: ActivityType.TrailRun,
            activities: 0xfffff,
        },
    });

    //console.log(result);

    expect(result).toContain('Trail Run');
    expect(result).toContain('id="at_TrailRun"');
    expect(result).toContain('class="checkbox-style"');
    expect(result).toContain('checked');
});
