import { expect, expectTypeOf, test, vi } from 'vitest';
import {
    addActivityAndSummits,
    createNewUser,
    deleteAllUserAscents,
    deleteSession,
    deleteUser,
    deleteUserActivity,
    deserializeUser,
    getClimber,
    getNearbyPeaksForActivity,
    getStravaActivitiesForUser,
    getStravaActivity,
    getStravaTokens,
    getSummitedPeaksForActivities,
    getUser,
    getUserFromStravaId,
    serializeUser,
    storeSession,
    updateSession,
    updateStravaActivity,
    updateUser,
    type ActivityEntry,
    type Session,
    type User,
} from './db';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { Feature, Point } from 'geojson';
import type { PeakClosenessProperties } from './peakbagger';
import type { Activity } from './strava';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

vi.mock(import('@aws-sdk/client-dynamodb'), async (importOriginal) => {
    const mod = await importOriginal();
    const DynamoDBDocumentClient = vi.fn();
    DynamoDBDocumentClient.prototype.send = vi.fn();
    const DynamoDBClient = vi.fn();
    DynamoDBClient.prototype.send = vi.fn();
    DynamoDBClient.prototype.config = vi.fn();
    return {
        ...mod,
        DynamoDBDocumentClient,
        DynamoDBClient,
    };
});
function setupReturnValue(obj: any) {
    DynamoDBDocumentClient.prototype.send = vi.fn(async () => {
        return obj;
    });
}
function setupReturnValueItem(obj: any) {
    DynamoDBDocumentClient.prototype.send = vi.fn(async () => {
        return {
            Item: obj,
        };
    });
}
function setupReturnValueItems(obj: any) {
    DynamoDBDocumentClient.prototype.send = vi.fn(async () => {
        return {
            Items: obj,
        };
    });
}
function setupCounterReturnValue(id: number) {
    DynamoDBClient.prototype.send = vi.fn(async () => {
        return {
            Attributes: {
                count: { N: id },
            },
        };
    });
}

const activity = {
    id: 102,
    summited_peaks: [
        {
            pid: 8,
            aid: 9,
        },
    ],
    nearby_peaks: [
        {
            pid: 10,
            aid: 11,
        },
    ],
};

test('getNearbyPeaksForActivity valid', async () => {
    setupReturnValue({ Responses: { pb_peaks: [{ id: 7 }] } });
    const peaks = await getNearbyPeaksForActivity(
        activity as unknown as ActivityEntry
    );
    expect(peaks).toEqual([{ id: 7 }]);
    const mock = vi.mocked(DynamoDBDocumentClient.prototype.send).mock;
    const input: any = mock.lastCall![0].input;
    expect(input.RequestItems.hasOwnProperty('pb_peaks')).toBe(true);
});

test('getNearbyPeaksForActivity invalid', async () => {
    setupReturnValue({});
    const peaks = await getNearbyPeaksForActivity(
        activity as unknown as ActivityEntry
    );
    expect(peaks).toEqual([]);
    const mock = vi.mocked(DynamoDBDocumentClient.prototype.send).mock;
    const input: any = mock.lastCall![0].input;
    expect(input.RequestItems.hasOwnProperty('pb_peaks')).toBe(true);
});

test('getSummitedPeaksForActivities valid', async () => {
    setupReturnValue({ Responses: { pb_peaks: [{ id: 8 }] } });
    const peaks = await getSummitedPeaksForActivities([
        activity as unknown as ActivityEntry,
    ]);
    expect(peaks).toEqual({ 102: [{ id: 8 }] });
    const mock = vi.mocked(DynamoDBDocumentClient.prototype.send).mock;
    const input: any = mock.lastCall![0].input;
    expect(input.RequestItems.hasOwnProperty('pb_peaks')).toBe(true);
});

test('addSummits valid', async () => {
    setupReturnValue({});
    const f: Feature<Point, PeakClosenessProperties> = {
        type: 'Feature',
        properties: {
            name: 'Peak',
            id: 0,
            elevation: 0,
            dist: 0,
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 1],
        },
    };

    const result = await addActivityAndSummits(
        activity as unknown as Activity,
        { summited: [f], close: [f] },
        null
    );
    expect(result).toBe(true);

    const mock = vi.mocked(DynamoDBDocumentClient.prototype.send).mock;
    const input: any = mock.lastCall![0].input;
    expect(input.TableName).toBe('pb_peaks');
});

test('getStravaActivity valid', async () => {
    setupReturnValueItem({ start_date: Date.now() });
    const result = await getStravaActivity(7, 13);

    expect(result).not.toBe(null);
    expectTypeOf(result!.start_date).toMatchTypeOf(new Date());
    const mock = vi.mocked(DynamoDBDocumentClient.prototype.send).mock;
    const input: any = mock.lastCall![0].input;
    expect(input.TableName).toBe('strava_activities');
    expect(input.Key).toEqual({ user_id: 7, id: 13 });
});

test('getStravaActivity invalid', async () => {
    setupReturnValue({});
    const result = await getStravaActivity(7, 13);
    expect(result).toBe(null);
});

test('getStravaActivitiesForUser valid', async () => {
    const obj = [{ id: 13, start_date: Date.now() }];
    setupReturnValueItems(obj);
    const result = await getStravaActivitiesForUser(13);
    expect(result).toEqual(obj);
});

test('getStravaActivitiesForUser invalid', async () => {
    setupReturnValue({});
    const result = await getStravaActivitiesForUser(13);
    expect(result).toEqual([]);
});

test('updateStravaActivity valid', async () => {
    const obj = { id: 13, user_id: 22, start_date: new Date() };
    setupReturnValue({});
    const result = await updateStravaActivity(obj as unknown as ActivityEntry);
    expect(result).toEqual(true);
});

test('updateStravaActivity invalid', async () => {
    setupReturnValue({});
    const result = await updateStravaActivity({
        id: 13,
        user_id: 22,
    } as unknown as ActivityEntry);
    expect(result).toEqual(false);
});

test('deleteUserActivity valid', async () => {
    setupReturnValue({});
    await deleteUserActivity(13, 7);
    const mock = vi.mocked(DynamoDBDocumentClient.prototype.send).mock;
    const input: any = mock.lastCall![0].input;
    expect(input.RequestItems.hasOwnProperty('strava_activities')).toBe(true);
    expect(
        input.RequestItems['strava_activities'][0].DeleteRequest.Key.id
    ).toBe(7);
    expect(
        input.RequestItems['strava_activities'][0].DeleteRequest.Key.user_id
    ).toBe(13);
});

test('deleteAllUserAscents delete nothing', async () => {
    setupReturnValue({});
    await deleteAllUserAscents(13);
    const mock = vi.mocked(DynamoDBDocumentClient.prototype.send).mock;
    const input: any = mock.lastCall![0].input;
    expect(input.TableName).toBe('strava_activities');
});

test('deleteAllUserAscents valid', async () => {
    setupReturnValueItems([{ id: 8, user_id: 13, start_date: new Date() }]);
    await deleteAllUserAscents(13);
    const mock = vi.mocked(DynamoDBDocumentClient.prototype.send).mock;
    const input: any = mock.lastCall![0].input;
    expect(input.RequestItems.hasOwnProperty('strava_activities')).toBe(true);
    expect(
        input.RequestItems['strava_activities'][0].DeleteRequest.Key.id
    ).toBe(8);
    expect(
        input.RequestItems['strava_activities'][0].DeleteRequest.Key.user_id
    ).toBe(13);
});

test('deleteSession valid', async () => {
    setupReturnValue({});
    const sessionString = 'session';
    await deleteSession(sessionString);

    const mock = vi.mocked(DynamoDBDocumentClient.prototype.send).mock;
    const input: any = mock.lastCall![0].input;
    expect(input.TableName).toBe('strava_user_session');
});

test('storeSession valid', async () => {
    setupReturnValue({});
    const session: Session = {
        id: 'sessionId',
        userId: 0,
        expiresAt: new Date(),
    };
    await storeSession(session);

    const mock = vi.mocked(DynamoDBDocumentClient.prototype.send).mock;
    const input: any = mock.lastCall![0].input;
    expect(input.TableName).toBe('strava_user_session');
});

test('updateSession valid', async () => {
    const session: Session = {
        id: 'sessionId',
        userId: 0,
        expiresAt: new Date(),
    };
    setupReturnValue({ Attributes: session });
    const { id: _, ...sessionPartial } = session;
    const result = await updateSession(session.id, sessionPartial);
    expect(result).toEqual(session);

    const mock = vi.mocked(DynamoDBDocumentClient.prototype.send).mock;
    const input: any = mock.lastCall![0].input;
    expect(input.TableName).toBe('strava_user_session');
});

test('deleteUser valid', async () => {
    const userId = 7;
    setupReturnValue({});
    await deleteUser(userId);

    const mock = vi.mocked(DynamoDBDocumentClient.prototype.send).mock;
    const input: any = mock.lastCall![0].input;
    expect(input.TableName).toBe('strava_auth_user');
});

test('getUser valid', async () => {
    const userId = 7;
    const u = {
        id: userId,
        strava_access_token_expiry: new Date(),
    };
    setupReturnValueItems([u]);
    const result = await getUser(userId);
    expect(result).not.toBe(null);
    expect(result!.id).toBe(userId);
    expectTypeOf(result!.strava_access_token_expiry).toMatchTypeOf(new Date());
    expect(result).toEqual(u);
});

test('getUser invalid 1', async () => {
    const userId = 7;
    setupReturnValueItems([]);
    const result = await getUser(userId);
    expect(result).toBe(null);
});

test('getUser invalid 2', async () => {
    const userId = 7;
    setupReturnValue({});
    const result = await getUser(userId);
    expect(result).toBe(null);
});

test('getUserFromStravaId valid', async () => {
    const stravaId = 19;
    const u = {
        id: 7,
        strava_id: stravaId,
        strava_access_token_expiry: Date.now(),
    };
    setupReturnValueItems([u]);
    const result = await getUserFromStravaId(stravaId);
    expect(result).not.toBe(null);
    expect(result!.strava_id).toBe(stravaId);
    expectTypeOf(result!.strava_access_token_expiry).toMatchTypeOf(new Date());
});

test('getUserFromStravaId invalid 1', async () => {
    const stravaId = 19;
    setupReturnValueItems([]);
    const result = await getUserFromStravaId(stravaId);
    expect(result).toBe(null);
});

test('getUserFromStravaId invalid 2', async () => {
    const stravaId = 19;
    setupReturnValue({});
    const result = await getUserFromStravaId(stravaId);
    expect(result).toBe(null);
});

test('createNewUser valid', async () => {
    setupReturnValue({});
    setupCounterReturnValue(91);
    const userPartial = {
        detection_radius: 18,
    };
    const result = await createNewUser(
        userPartial as unknown as Omit<User, 'id'>
    );
    expect(result.detection_radius).toBe(userPartial.detection_radius);
    expectTypeOf(result.id).toMatchTypeOf(0);
    expect(result.id).toBe(91);
});

test('updateUser valid', async () => {
    const now = new Date();
    const u = {
        id: 13,
        detection_radius: 18,
        strava_access_token_expiry: now,
        pb_username: null,
    };
    setupReturnValue({ Attributes: u });
    const user = {
        detection_radius: 18,
        strava_access_token_expiry: now,
        pb_username: undefined,
    };
    const result = await updateUser(13, user);
    expect(result).toEqual(u);
});

test('updateUser invalid 1', async () => {
    setupReturnValue({});
    const user = {
        detection_radius: 18,
    };
    const result = await updateUser(13, user);
    expect(result).toBe(null);
});

test('updateUser invalid 2', async () => {
    setupReturnValue({});
    const user = {};
    const result = await updateUser(13, user);
    expect(result).toBe(null);
});

test('getClimber valid', () => {
    const user = {
        peakbagger_id: 9,
        pb_email: 'a@b.c',
        pb_password: 'encryptedPassword',
    };
    const climber = getClimber(user as unknown as User);
    expect(climber).not.toBe(null);
    expect(climber!.id).toBe(user.peakbagger_id);
    expect(climber!.email).toBe(user.pb_email);
    expect(climber!.password).toBe(user.pb_password);
});

test('getClimber invalid', () => {
    const user = {
        peakbagger_id: null,
        pb_email: 'a@b.c',
        pb_password: 'encryptedPassword',
    };
    const climber = getClimber(user as unknown as User);
    expect(climber).toBe(null);
});

test('getStravaTokens invalid', () => {
    const user = {};
    try {
        getStravaTokens(user as unknown as User);
    } catch (e: any) {
        expect(e.message).toContain('not found');
    }
});

test('serDes user', () => {
    const user = {
        id: 21,
        strava_access_token_expiry: new Date(),
    };
    const test = deserializeUser(serializeUser(user as unknown as User));
    expect(test).toEqual(user);
});
