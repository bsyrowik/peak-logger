import { expect, test, vi } from 'vitest';
import type { User } from './db';
import {
    getDetailedActivity,
    getLatestActivities,
    getValidAccessToken,
    unlinkStravaAccount,
    type Activity,
} from './strava';
import type { Tokens } from 'arctic';
import { ActivityType } from './activity';

vi.mock('./db');

vi.mock(import('arctic'), async (importOriginal) => {
    const Strava = vi.fn();
    Strava.prototype.refreshAccessToken = async (): Promise<Tokens | null> => {
        return {
            refreshToken: 'newRefreshToken',
            accessToken: 'newAccessToken',
            accessTokenExpiresAt: new Date(Date.now() + 10000),
        };
    };
    const mod = await importOriginal();
    return {
        ...mod,
        Strava,
    };
});

global.fetch = vi.fn();
function createFetchResponse200(data: any) {
    return { status: 200, json: () => new Promise((resolve) => resolve(data)) };
}
function createFetchResponse401(data: any) {
    return { status: 401, json: () => new Promise((resolve) => resolve(data)) };
}
function createFetchResponse402(data: any) {
    return { status: 402, json: () => new Promise((resolve) => resolve(data)) };
}

test('getValidAccessToken still valid', async () => {
    const user = {
        strava_access_token: 'accessToken',
        strava_access_token_expiry: new Date(Date.now() + 10000),
        strava_refresh_token: 'refreshToken',
    };

    const token = await getValidAccessToken(user as unknown as User);
    expect(token).toBe('accessToken');
});

test('getValidAccessToken expired', async () => {
    const user = {
        strava_access_token: 'accessToken',
        strava_access_token_expiry: new Date(Date.now() + 100),
        strava_refresh_token: 'refreshToken',
    };

    const token = await getValidAccessToken(user as unknown as User);
    expect(token).not.toBe('accessToken');
    expect(token).toBe('newAccessToken');
});

test('unlinkAccount', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(createFetchResponse200('OK'));
    const user = {
        strava_access_token: 'accessToken',
        strava_access_token_expiry: new Date(Date.now() + 10000),
        strava_refresh_token: 'refreshToken',
    };

    await unlinkStravaAccount(user as unknown as User);

    expect(myFetch.mock.lastCall[0]).toContain('strava.com/oauth/deauthorize');
    expect(myFetch.mock.lastCall[0]).toContain('access_token=accessToken');
});

test('getDetailedActivity', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse200({ id: 7, name: 'Morning Hike' })
    );
    const user = {
        strava_access_token: 'accessToken',
        strava_access_token_expiry: new Date(Date.now() + 10000),
        strava_refresh_token: 'refreshToken',
    };

    const activityId = 1007;

    const result: Activity | null = await getDetailedActivity(
        activityId,
        user as unknown as User
    );

    expect(myFetch.mock.lastCall[0]).toContain(
        'strava.com/api/v3/activities/' + activityId
    );
    expect(result).not.toBe(null);
    expect(result!.id).toBe(7);
    expect(result!.name).toBe('Morning Hike');
});

test('getDetailedActivity 402', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse402({ id: 7, name: 'Morning Hike' })
    );
    const user = {
        strava_access_token: 'accessToken',
        strava_access_token_expiry: new Date(Date.now() + 10000),
        strava_refresh_token: 'refreshToken',
    };

    const activityId = 1007;

    const result: Activity | null = await getDetailedActivity(
        activityId,
        user as unknown as User
    );
    console.log(result);
    console.log(typeof result);

    expect(myFetch.mock.lastCall[0]).toContain(
        'strava.com/api/v3/activities/' + activityId
    );
    expect(result).toBe(null);
});

test('getLatestActivities', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse200([
            { id: 8, name: 'Morning Run' },
            { id: 7, name: 'Morning Hike' },
        ])
    );
    const user = {
        strava_access_token: 'accessToken',
        strava_access_token_expiry: new Date(Date.now() + 10000),
        strava_refresh_token: 'refreshToken',
    };

    const perPage = 2;
    const page = 1;

    const result: Activity[] | null = await getLatestActivities(
        user as unknown as User,
        perPage,
        page
    );

    expect(myFetch.mock.lastCall[0]).toContain(
        'strava.com/api/v3/athlete/activities?per_page=' +
            perPage +
            '&page=' +
            page
    );
    expect(result).not.toBe(null);
    expect(result!.length).toBe(2);
    expect(result![0].id).toBe(8);
    expect(result![0].name).toBe('Morning Run');
    expect(result![1].id).toBe(7);
    expect(result![1].name).toBe('Morning Hike');
});

test('getLatestActivities 401', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse401([
            { id: 8, name: 'Morning Run' },
            { id: 7, name: 'Morning Hike' },
        ])
    );
    const user = {
        strava_access_token: 'accessToken',
        strava_access_token_expiry: new Date(Date.now() + 10000),
        strava_refresh_token: 'refreshToken',
    };

    const perPage = 2;
    const page = 1;

    try {
        await getLatestActivities(user as unknown as User, perPage, page);
    } catch (e: any) {
        expect(e.message).toContain('not authorized');
    }

    expect(myFetch.mock.lastCall[0]).toContain(
        'strava.com/api/v3/athlete/activities?per_page=' +
            perPage +
            '&page=' +
            page
    );
});

test('getLatestActivities 402', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse402([
            { id: 8, name: 'Morning Run' },
            { id: 7, name: 'Morning Hike' },
        ])
    );
    const user = {
        strava_access_token: 'accessToken',
        strava_access_token_expiry: new Date(Date.now() + 10000),
        strava_refresh_token: 'refreshToken',
    };

    const perPage = 2;
    const page = 1;

    try {
        await getLatestActivities(user as unknown as User, perPage, page);
    } catch (e: any) {
        expect(e.message).toContain('bad response');
    }

    expect(myFetch.mock.lastCall[0]).toContain(
        'strava.com/api/v3/athlete/activities?per_page=' +
            perPage +
            '&page=' +
            page
    );
});

test('getLatestActivities enabledActivities', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse200([
            { id: 8, name: 'Morning Run', sport_type: 'Run' },
            { id: 7, name: 'Morning Hike', sport_type: 'Hike' },
        ])
    );
    const user = {
        strava_access_token: 'accessToken',
        strava_access_token_expiry: new Date(Date.now() + 10000),
        strava_refresh_token: 'refreshToken',
    };

    const perPage = 2;
    const page = 1;

    const result: Activity[] | null = await getLatestActivities(
        user as unknown as User,
        perPage,
        page,
        1 << ActivityType.Hike
    );

    expect(myFetch.mock.lastCall[0]).toContain(
        'strava.com/api/v3/athlete/activities?per_page=' +
            perPage +
            '&page=' +
            page
    );
    expect(result).not.toBe(null);
    expect(result!.length).toBe(1);
    expect(result![0].id).toBe(7);
    expect(result![0].name).toBe('Morning Hike');
});
