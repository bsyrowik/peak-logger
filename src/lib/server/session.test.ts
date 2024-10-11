import { vi, expect, test } from 'vitest';
import {
    createSession,
    generateSessionToken,
    getSessionCookieName,
    invalidateSession,
    validateSessionToken,
} from '@lib/server/session';
import { createNewUser, getSession } from '@util/db';

vi.mock('../../util/db');

test('sessionCookieName', () => {
    const name = getSessionCookieName();
    expect(name).toBe('session');
});

test('generateSessionToken', () => {
    const token = generateSessionToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBe(32);
});

test('createSession', async () => {
    const session = await createSession('theTokenString', -1);

    expect(session.userId).toBe(-1);

    const now = new Date();
    expect(session.expiresAt.getTime() - now.getTime()).toBeLessThanOrEqual(
        1000 * 60 * 60 * 24 * 30
    );
    expect(session.expiresAt.getTime() - now.getTime()).toBeGreaterThanOrEqual(
        1000 * 59 * 60 * 24 * 30
    );
});

test('validateSession', async () => {
    const user_id = -1; // FIXME: this is tied to the starting value in the db.ts mock.
    const session = await createSession('theTokenString', user_id);
    expect(session.userId).toBe(user_id);

    const user = await createNewUser({
        firstname: 'Alice',
        lastname: 'Smith',
        detection_radius: 10,
        enabled_activities: 0xfff,
        strava_id: 0,
        peakbagger_id: 0,
        pb_ascents_are_public: false,
        strava_access_token: 'accessToken',
        strava_access_token_expiry: new Date(),
        strava_refresh_token: 'refreshToken',
        strava_approved_scope: 0xf,
        strava_update_description: true,
        pb_post_summits: true,
    });

    const findSession = await getSession(session.id);
    expect(findSession?.userId).toBe(user_id);

    const response = await validateSessionToken('theTokenString');
    expect(response.session).toBe(session);
    expect(response.user).toBe(user);
});

test('validateSession refresh', async () => {
    const user = await createNewUser({
        firstname: 'Alice',
        lastname: 'Smith',
        detection_radius: 10,
        enabled_activities: 0xfff,
        strava_id: 0,
        peakbagger_id: 0,
        pb_ascents_are_public: false,
        strava_access_token: 'accessToken',
        strava_access_token_expiry: new Date(),
        strava_refresh_token: 'refreshToken',
        strava_approved_scope: 0xf,
        strava_update_description: true,
        pb_post_summits: true,
    });

    const date = new Date(Date.now() - 1000 * 60 * 60 * 24 * 15 - 1);

    vi.useFakeTimers();
    vi.setSystemTime(date);

    const user_id = user.id;
    const session = await createSession('theTokenString', user_id);
    expect(session.userId).toBe(user_id);

    vi.useRealTimers();

    const findSession = await getSession(session.id);
    expect(findSession?.userId).toBe(user_id);

    const response = await validateSessionToken('theTokenString');
    expect(response.session).not.toBe(null);
    expect(response.user).toBe(user);
});

test('validateSession expired', async () => {
    const user = await createNewUser({
        firstname: 'Alice',
        lastname: 'Smith',
        detection_radius: 10,
        enabled_activities: 0xfff,
        strava_id: 0,
        peakbagger_id: 0,
        pb_ascents_are_public: false,
        strava_access_token: 'accessToken',
        strava_access_token_expiry: new Date(),
        strava_refresh_token: 'refreshToken',
        strava_approved_scope: 0xf,
        strava_update_description: true,
        pb_post_summits: true,
    });

    const date = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 - 1);

    vi.useFakeTimers();
    vi.setSystemTime(date);

    const user_id = user.id;
    const session = await createSession('theTokenString', user_id);
    expect(session.userId).toBe(user_id);

    vi.useRealTimers();

    const findSession = await getSession(session.id);
    expect(findSession?.userId).toBe(user_id);

    const response = await validateSessionToken('theTokenString');
    expect(response.session).toBe(null);
    expect(response.user).toBe(null);
});

test('validateSession no user', async () => {
    const user_id = -10;
    const session = await createSession('newTokenString', user_id);
    expect(session.userId).toBe(user_id);

    const response = await validateSessionToken('newTokenString');
    expect(response.session).toBe(null);
    expect(response.user).toBe(null);
});

test('invalidateSession', async () => {
    const session = await createSession('theTokenString', -1);

    expect(session.userId).toBe(-1);

    await invalidateSession(session.id);

    const findSession = await getSession(session.id);
    expect(findSession).toBe(null);

    const response = await validateSessionToken('theTokenString');
    expect(response.session).toBe(null);
    expect(response.user).toBe(null);
});
