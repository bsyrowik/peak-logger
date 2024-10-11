import type { Activity } from '@util/strava';
import type {
    MinAscentInfo,
    PeakAnalysis,
    PeakClosenessProperties,
    PeakProperties,
    Climber,
} from '@util/peakbagger';
import type { Feature, Point } from 'geojson';

import type { Tokens } from '@lib/server/user';

import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    PutCommand,
    QueryCommand,
    DeleteCommand,
    UpdateCommand,
    GetCommand,
    BatchGetCommand,
    BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';

import { AWS_REGION, AWS_IDENTITY_POOL_ID } from '../consts';

const REGION = AWS_REGION;
const IDENTITY_POOL_ID = AWS_IDENTITY_POOL_ID; // An Amazon Cognito Identity Pool ID.

// Create an Amazon DynamoDB service client object.
const dynamoClient = new DynamoDBClient({
    region: REGION,
    credentials: fromCognitoIdentityPool({
        client: new CognitoIdentityClient({ region: REGION }),
        identityPoolId: IDENTITY_POOL_ID,
    }),
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export type User = {
    id: number;
    strava_id: number;
    firstname: string;
    lastname: string;
    pb_username?: string | null;
    pb_password?: string | null;
    detection_radius: number;
    peakbagger_id?: number | null;
    peakbagger_units?: string | null;
    pb_email?: string | null;
    enabled_activities: number;
    strava_refresh_token: string;
    strava_approved_scope: number;
    strava_access_token: string;
    strava_access_token_expiry: Date;
    pb_post_summits: boolean;
    pb_ascents_are_public: boolean;
    strava_update_description: boolean;
};

export type PeakClosenessInfo = {
    pid: number;
    dist: number;
};

export type Session = {
    id: string;
    userId: number;
    expiresAt: Date;
};
export type ActivityEntry = {
    id: number;
    user_id: number;
    name: string;
    sport_type: string;
    summited_peaks: PeakClosenessInfo[];
    nearby_peaks: PeakClosenessInfo[];
    start_date: Date;
    summary_polyline?: string;
    logged_ascents?: MinAscentInfo[];
};
export type PeakEntry = {
    id: number;
    name: string;
    elevation_feet: number;
    lat: number;
    lon: number;
    prominence?: number;
};

////////////////////////////////////////////////////////////////////////////////
////  Utility functions
////////////////////////////////////////////////////////////////////////////////

export function deserializeUser(userString: string): User {
    const u = JSON.parse(userString);
    return {
        ...u,
        strava_access_token_expiry: new Date(u.strava_access_token_expiry),
    };
}

export function serializeUser(user: User): string {
    return JSON.stringify(user);
}

export async function addActivityAndSummits(
    activity: Activity,
    summits: PeakAnalysis,
    loggedAscents: MinAscentInfo[] | null
): Promise<boolean> {
    await addSummits(summits.summited);
    await addSummits(summits.close);
    await addActivity(activity, summits, loggedAscents);
    return true;
}

export async function updateEnabledActivities(
    userId: number,
    enabledActivities: number
) {
    await updateUser(userId, { enabled_activities: enabledActivities });
}

export async function setPBData(
    userId: number,
    username: string | null,
    email: string | null,
    password: string | null,
    cid: number | null,
    unit: string | null
) {
    await updateUser(userId, {
        pb_username: username,
        pb_password: password,
        pb_email: email,
        peakbagger_id: cid,
        peakbagger_units: unit,
    });
}

export async function clearPBData(userId: number) {
    await setPBData(userId, null, null, null, null, null);
}

export async function updateStravaTokens(userId: number, tokens: Tokens) {
    await updateUser(userId, {
        strava_access_token: tokens.accessToken,
        strava_access_token_expiry: tokens.accessTokenExpiresAt,
        strava_refresh_token: tokens.refreshToken,
    });
}

////////////////////////////////////////////////////////////////////////////////
////  pb_peaks
////////////////////////////////////////////////////////////////////////////////

export async function getPeaks(peakList: number[]): Promise<PeakEntry[]> {
    if (peakList.length < 1) return [];
    const keys: { [id: string]: number }[] = peakList.map((pid) => {
        return { id: pid };
    });
    const command = new BatchGetCommand({
        RequestItems: {
            pb_peaks: {
                Keys: keys,
            },
        },
    });
    const response = await docClient.send(command);
    if (
        response.Responses == null ||
        response.Responses.pb_peaks == null ||
        response.Responses.pb_peaks.length < 1
    ) {
        return [];
    }
    const result: PeakEntry[] = response.Responses.pb_peaks.map(
        (r) => r as unknown as PeakEntry
    );
    return result;
}

export async function getNearbyPeaksForActivity(
    activity: ActivityEntry
): Promise<PeakEntry[]> {
    const list = activity.nearby_peaks.map((p) => p.pid);
    return getPeaks(list);
}

export async function getSummitedPeaksForActivities(
    activities: ActivityEntry[]
): Promise<{ [activityId: number]: PeakEntry[] }> {
    var activityToPeaks: { [activityId: number]: PeakEntry[] } = {};
    for (var i = 0; i < activities.length; i++) {
        const peakList = activities[i].summited_peaks.map((p) => p.pid);
        const peaks = await getPeaks(peakList);
        if (peaks.length > 0) {
            activityToPeaks[activities[i].id] = peaks;
        }
    }
    return activityToPeaks;
}

async function addSummits(summits: Feature<Point, PeakProperties>[]) {
    // Insert peaks if they don't exist
    for (var i = 0; i < summits.length; i++) {
        const f = summits[i];
        const command = new PutCommand({
            TableName: 'pb_peaks',
            Item: {
                id: f.properties.id,
                name: f.properties.name,
                elevation_feet: f.properties.elevation,
                prominence: f.properties.prominence,
                lat: f.geometry.coordinates[1],
                lon: f.geometry.coordinates[0],
            },
        });
        await docClient.send(command);
    }
}

////////////////////////////////////////////////////////////////////////////////
////  strava_activities
////////////////////////////////////////////////////////////////////////////////

export async function deleteUserActivity(
    stravaUserId: number,
    stravaActivityId: number
) {
    console.log(
        'deleting activity',
        stravaActivityId,
        'for user',
        stravaUserId
    );
    const command = new BatchWriteCommand({
        RequestItems: {
            strava_activities: [
                {
                    DeleteRequest: {
                        Key: {
                            user_id: stravaUserId,
                            id: stravaActivityId,
                        },
                    },
                },
            ],
        },
    });

    await docClient.send(command);
}

export async function deleteAllUserAscents(stravaUserId: number) {
    const allAscents = await getStravaActivitiesForUser(stravaUserId);
    if (allAscents.length < 1) {
        return;
    }

    const deleteRequests = allAscents.map((activity: ActivityEntry) => {
        return {
            DeleteRequest: {
                Key: {
                    user_id: activity.user_id,
                    id: activity.id,
                },
            },
        };
    });
    //console.log('request:', deleteRequests);
    const command = new BatchWriteCommand({
        RequestItems: {
            strava_activities: deleteRequests,
        },
    });

    await docClient.send(command);
}

export async function getStravaActivity(
    stravaUserId: number,
    activityId: number
): Promise<ActivityEntry | null> {
    //console.log('getting activity', stravaUserId, activityId);
    const command = new GetCommand({
        TableName: 'strava_activities',
        Key: {
            user_id: stravaUserId,
            id: activityId,
        },
    });

    const response = await docClient.send(command);
    //console.log(response);

    if (!response.Item) {
        return null;
    }
    const a = {
        ...response.Item,
        start_date: new Date(response.Item.start_date),
    };
    return a as unknown as ActivityEntry;
}

export async function getStravaActivitiesForUser(
    stravaUserId: number
): Promise<ActivityEntry[]> {
    const command = new QueryCommand({
        TableName: 'strava_activities',
        KeyConditionExpression: 'user_id = :userid',
        ExpressionAttributeValues: {
            ':userid': stravaUserId,
        },
    });

    const response = await docClient.send(command);
    response.Items?.map((i) => (i.start_date = new Date(i.start_date)));
    if (response.Items == null || response.Items.length < 1) {
        return [];
    }
    const result: ActivityEntry[] = response.Items.map((r) => {
        const a = { ...r, start_date: new Date(r.start_date) };
        return a as unknown as ActivityEntry;
    });

    return result;
}

export async function updateStravaActivity(
    activity: ActivityEntry
): Promise<boolean> {
    try {
        const command = new PutCommand({
            TableName: 'strava_activities',
            Item: {
                ...activity,
                start_date: activity.start_date.valueOf(),
            },
        });

        await docClient.send(command);
    } catch (err) {
        console.error(err);
        return false;
    }
    return true;
}

async function addActivity(
    activity: Activity,
    summits: PeakAnalysis,
    loggedAscents: MinAscentInfo[] | null
) {
    // Add activity if it doesn't exist
    const summitedPeakList: PeakClosenessInfo[] = summits.summited.map(
        (f: Feature<Point, PeakClosenessProperties>) => {
            return { pid: f.properties.id, dist: f.properties.dist };
        }
    );
    const nearbyPeakList: PeakClosenessInfo[] = summits.close.map(
        (f: Feature<Point, PeakClosenessProperties>) => {
            return { pid: f.properties.id, dist: f.properties.dist };
        }
    );
    const start = new Date(activity.start_date);
    try {
        const command = new PutCommand({
            TableName: 'strava_activities',
            Item: {
                id: activity.id,
                user_id: activity.athlete.id,
                name: activity.name,
                sport_type: activity.sport_type,
                start_date: start.valueOf(),
                summited_peaks: summitedPeakList,
                nearby_peaks: nearbyPeakList,
                summary_polyline: activity.map.summary_polyline,
                logged_ascents: loggedAscents,
            },
        });

        await docClient.send(command);
    } catch (err) {
        console.error(err);
    }
}

////////////////////////////////////////////////////////////////////////////////
////  counters
////////////////////////////////////////////////////////////////////////////////

async function getNextUserId(): Promise<number> {
    const command = new UpdateItemCommand({
        TableName: 'counters',
        Key: {
            counterName: { S: 'user_id_counter' },
        },
        UpdateExpression: 'ADD #cnt :val',
        ExpressionAttributeNames: { '#cnt': 'count' },
        ExpressionAttributeValues: { ':val': { N: '1' } },
        ReturnValues: 'UPDATED_NEW',
    });

    const response = await dynamoClient.send(command);
    //console.log(response.Attributes);
    return Number(response.Attributes?.count.N ?? 0);
}

////////////////////////////////////////////////////////////////////////////////
////  strava_user_session
////////////////////////////////////////////////////////////////////////////////

export async function deleteSession(sessionId: string) {
    const command = new DeleteCommand({
        TableName: 'strava_user_session',
        Key: { id: sessionId },
    });
    await docClient.send(command);
}

export async function getSession(sessionId: string): Promise<Session | null> {
    const command = new QueryCommand({
        TableName: 'strava_user_session',
        KeyConditionExpression: 'id = :sessionId',
        ExpressionAttributeValues: { ':sessionId': sessionId },
    });
    const response = await docClient.send(command);
    //console.log(response);

    if (
        response.Items === null ||
        response.Items === undefined ||
        response.Items.length < 1
    ) {
        return null;
    }

    const s = {
        ...response.Items[0],
        expiresAt: new Date(response.Items[0].expiresAt),
    };
    return s as unknown as Session;
}

export async function storeSession(session: Session) {
    const command = new PutCommand({
        TableName: 'strava_user_session',
        Item: { ...session, expiresAt: session.expiresAt.valueOf() },
    });

    await docClient.send(command);
}

export async function updateSession(
    sessionId: string,
    session: Partial<Session>
): Promise<Session | null> {
    const updateList: string[] = [];
    const updateProps: { [key: string]: any } = {};
    for (const [k, v] of Object.entries(session)) {
        updateList.push(k + ' = :' + k);
        if (v instanceof Date) {
            updateProps[':' + k] = v.valueOf();
        } else {
            updateProps[':' + k] = v;
        }
    }
    const updateCmd = 'set ' + updateList.join(', ');

    const command = new UpdateCommand({
        TableName: 'strava_user_session',
        Key: { id: sessionId },
        UpdateExpression: updateCmd,
        ExpressionAttributeValues: updateProps,
        ReturnValues: 'ALL_NEW',
    });

    const response = await docClient.send(command);

    const a = response.Attributes;
    if (a === null || a === undefined) {
        return null;
    }
    const s = { ...a, expiresAt: new Date(a.expiresAt) };
    return s as unknown as Session;
}

////////////////////////////////////////////////////////////////////////////////
////  strava_auth_user
////////////////////////////////////////////////////////////////////////////////

export async function deleteUser(userId: number) {
    const command = new DeleteCommand({
        TableName: 'strava_auth_user',
        Key: { id: userId },
    });
    await docClient.send(command);
}

export async function getUser(userId: number): Promise<User | null> {
    const command = new QueryCommand({
        TableName: 'strava_auth_user',
        KeyConditionExpression: 'id = :userId',
        ExpressionAttributeValues: { ':userId': userId },
    });
    const response = await docClient.send(command);
    //console.log(response);

    if (
        response.Items === null ||
        response.Items === undefined ||
        response.Items.length < 1
    ) {
        return null;
    }

    const u = {
        ...response.Items[0],
        strava_access_token_expiry: new Date(
            response.Items[0].strava_access_token_expiry
        ),
    };
    return u as unknown as User;
}

export async function getUserFromStravaId(
    stravaId: number
): Promise<User | null> {
    const command = new QueryCommand({
        TableName: 'strava_auth_user',
        IndexName: 'stravaId',
        KeyConditionExpression: 'strava_id = :stravaId',
        ExpressionAttributeValues: {
            ':stravaId': Number(stravaId),
        },
    });
    const response = await docClient.send(command);
    console.log(response);

    if (
        response.Items === null ||
        response.Items === undefined ||
        response.Items.length < 1
    ) {
        return null;
    }

    const u = {
        ...response.Items[0],
        strava_access_token_expiry: new Date(
            response.Items[0].strava_access_token_expiry
        ),
    };
    return u as unknown as User;
}

export async function createNewUser(user: Omit<User, 'id'>): Promise<User> {
    const id = await getNextUserId();
    const newUser: User = { ...user, id };
    console.log(newUser);

    const command = new PutCommand({
        TableName: 'strava_auth_user',
        Item: {
            ...newUser,
            strava_access_token_expiry:
                newUser.strava_access_token_expiry?.valueOf(),
        },
    });
    const response = await docClient.send(command);
    console.log(response);

    return newUser;
}

export async function updateUser(
    userId: number,
    userProps: Partial<User>
): Promise<User | null> {
    const updateList: string[] = [];
    const updateProps: { [key: string]: any } = {};
    for (const [k, v] of Object.entries(userProps)) {
        if (v instanceof Date) {
            updateProps[':' + k] = v.valueOf();
        } else if (v === undefined) {
            updateProps[':' + k] = null;
        } else {
            updateProps[':' + k] = v;
        }
        updateList.push(k + ' = :' + k);
    }
    if (updateList.length < 1) {
        return null;
    }
    const updateCmd = 'set ' + updateList.join(', ');
    console.log(updateCmd);
    console.log(updateProps);

    const command = new UpdateCommand({
        TableName: 'strava_auth_user',
        Key: {
            id: userId,
        },
        UpdateExpression: updateCmd,
        ExpressionAttributeValues: updateProps,
        ReturnValues: 'ALL_NEW',
    });

    const response = await docClient.send(command);
    console.log(response);

    const a = response.Attributes;
    if (a === null || a === undefined) {
        return null;
    }

    const u = {
        ...a,
        strava_access_token_expiry: new Date(a.strava_access_token_expiry),
    };
    return u as unknown as User;
}

////////////////////////////////////////////////////////////////////////////////
////  Helper functions
////////////////////////////////////////////////////////////////////////////////

export function getStravaTokens(user: User): Tokens {
    if (
        !user.strava_refresh_token ||
        !user.strava_access_token ||
        !user.strava_access_token_expiry
    ) {
        throw new Error('Strava tokens not found!');
    }
    return {
        refreshToken: user.strava_refresh_token,
        accessToken: user.strava_access_token,
        accessTokenExpiresAt: user.strava_access_token_expiry,
    };
}

export function getClimber(user: User): Climber | null {
    if (!user.pb_email || !user.pb_password || !user.peakbagger_id) {
        return null;
    }
    return {
        id: user.peakbagger_id,
        email: user.pb_email,
        password: user.pb_password,
    };
}
