import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test, vi } from 'vitest';
import ActivityId from './[activityId].astro';
import type { ActivityEntry, PeakEntry } from '@util/db';
import { updateStravaActivity } from '@util/__mocks__/db';

//vi.mock('../../util/db');

const activity: ActivityEntry = {
    id: 7,
    user_id: 12,
    sport_type: 'Hike',
    summited_peaks: [{ pid: 19, dist: 1.4 }],
    nearby_peaks: [{ pid: 20, dist: 18.2 }],
    name: 'Morning Hike',
    start_date: new Date(),
};

const p1: PeakEntry = {
    id: 19,
    name: 'Peak 1',
    lat: 133.2,
    lon: 42.1,
    elevation_feet: 1999,
};

const p2: PeakEntry = {
    id: 20,
    name: 'Peak 2',
    lat: 103.2,
    lon: 32.1,
    elevation_feet: 2999,
};

const p3: PeakEntry = {
    id: 21,
    name: 'Peak 3',
    lat: 103.2,
    lon: 32.1,
    elevation_feet: 999,
    prominence: 144,
};

const p4: PeakEntry = {
    id: 23,
    name: 'Peak 4',
    lat: 103.1,
    lon: 32.3,
    elevation_feet: 299,
    prominence: 244,
};

vi.mock(import('../../util/db'), async (importOriginal) => {
    const mod = await importOriginal(); // type is inferred
    return {
        ...mod,
        getSummitedPeaksForActivities: async () => {
            return { 7: [p1, p3] };
        },
        getNearbyPeaksForActivity: async () => {
            return [p2, p4];
        },
        getStravaActivity: async () => {
            return activity;
        },
    };
});

test('ActivityId page', async () => {
    await updateStravaActivity(activity);

    const container = await AstroContainer.create();
    const result = await container.renderToString(ActivityId, {
        locals: {
            user: {
                firstname: 'John',
                lastname: 'Doe',
                detection_radius: 19,
                strava_id: 12,
                strava_refresh_token: 'refreshToken',
            },
            session: {},
        },
        params: {
            activityId: '7',
        },
    });

    expect(result).toContain('Auto-detect');
    expect(result).toContain('199');
});

test('ActivityId page no strava', async () => {
    const activity: ActivityEntry = {
        id: 7,
        user_id: 12,
        sport_type: 'Hike',
        summited_peaks: [],
        nearby_peaks: [],
        name: 'Morning Hike',
        start_date: new Date(),
    };
    await updateStravaActivity(activity);

    const container = await AstroContainer.create();
    const result = await container.renderToString(ActivityId, {
        locals: {
            user: {
                firstname: 'John',
                lastname: 'Doe',
                detection_radius: 19,
                strava_id: 12,
                strava_refresh_token: null,
            },
            session: {},
        },
        params: {
            activityId: '7',
        },
    });

    expect(result).toContain('Auto-detect');
    expect(result).toContain('199');
});
