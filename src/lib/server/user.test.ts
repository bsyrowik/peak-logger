import { vi, expect, test } from 'vitest';
import { createUser, type StravaUser, type Tokens } from '@lib/server/user';
import { getUserFromStravaId, updateUser } from '@util/db';

vi.mock('../../util/db');

test('createUser', async () => {
    const su: StravaUser = {
        id: '17',
        firstname: 'Jane',
        lastname: 'Smith',
    };
    const tokens: Tokens = {
        refreshToken: 'refreshToken',
        accessToken: 'accessToken',
        accessTokenExpiresAt: new Date(),
    };
    const user = await createUser(su, tokens);

    expect(user.firstname).toBe('Jane');
    expect(user.strava_id).toBe(17);
    expect(user.detection_radius).toBe(10);
    expect(user.enabled_activities).toBe(65600);
    expect(user.strava_update_description).toBe(true);
});

test('updateUser', async () => {
    const su: StravaUser = {
        id: '18',
        firstname: 'Jane',
        lastname: 'Smith',
    };
    const tokens: Tokens = {
        refreshToken: 'refreshToken',
        accessToken: 'accessToken',
        accessTokenExpiresAt: new Date(),
    };
    const user = await createUser(su, tokens);
    const updatedUser = await updateUser(user.id, {
        firstname: 'John',
        detection_radius: 17,
        pb_ascents_are_public: false,
    });

    expect(updatedUser?.firstname).toBe('John');
    expect(updatedUser?.detection_radius).toBe(17);
    expect(updatedUser?.pb_ascents_are_public).toBe(false);
});

test('getUserFromStravaId', async () => {
    const su: StravaUser = {
        id: '19',
        firstname: 'Jane',
        lastname: 'Smith',
    };
    const tokens: Tokens = {
        refreshToken: 'refreshToken',
        accessToken: 'accessToken',
        accessTokenExpiresAt: new Date(),
    };
    const user = await createUser(su, tokens);
    const getUser = await getUserFromStravaId(19);

    expect(getUser).toBe(user);
});
