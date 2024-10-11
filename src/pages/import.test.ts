import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test, vi } from 'vitest';
import Import from './import.astro';
import { ActivityType } from '@util/activity';

vi.mock('../util/db');

vi.mock(import('../util/strava.ts'), async (importOriginal) => {
    const mod = await importOriginal(); // type is inferred
    return {
        ...mod,
        getLatestActivities: async () => {
            return [];
        },
    };
});

test('Import page', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(Import, {
        locals: {
            user: {
                firstname: 'John',
                lastname: 'Doe',
                enabled_activities:
                    (1 << ActivityType.TrailRun) | (1 << ActivityType.Hike),
                strava_id: 11,
            },
            session: {},
        },
    });

    expect(result).toContain('Auto-detect');
});

test('Import page', async () => {
    const container = await AstroContainer.create();
    const result = await container.renderToString(Import, {
        locals: {
            user: {
                firstname: 'John',
                lastname: 'Doe',
                enabled_activities:
                    (1 << ActivityType.TrailRun) | (1 << ActivityType.Hike),
                strava_id: 11,
                pb_email: 'a@b.c',
                pb_ascents_are_public: true,
                pb_post_summits: true,
            },
            session: {},
        },
    });

    expect(result).toContain('Auto-detect');
});
