import {
    createNewUser,
    updateUser as dbUpdateUser,
    getUserFromStravaId as dbGetUserFromStravaId,
} from '@util/db';
import type { User } from '@util/db';
import { ActivityType } from '@util/activity';
import { Bitfield } from '@util/bitfield';

export interface Tokens {
    refreshToken: string;
    accessToken: string;
    accessTokenExpiresAt: Date;
}

export interface StravaUser {
    id: string;
    firstname: string;
    lastname: string;
}

export async function createUser(
    stravaUser: StravaUser,
    tokens: Tokens
): Promise<User> {
    // Defaults:
    const defaultActivities = new Bitfield();
    defaultActivities.set(ActivityType.Hike);
    defaultActivities.set(ActivityType.TrailRun);
    const detectionRadius = 10; // meters
    const strava_update_description = true;
    const pb_post_summits = true;
    const pb_ascents_are_public = true;

    const newUser = await createNewUser({
        strava_id: Number(stravaUser.id),
        firstname: stravaUser.firstname,
        lastname: stravaUser.lastname,
        enabled_activities: defaultActivities.data,
        detection_radius: detectionRadius,
        strava_refresh_token: tokens.refreshToken,
        strava_approved_scope: defaultActivities.data,
        strava_access_token: tokens.accessToken,
        strava_access_token_expiry: tokens.accessTokenExpiresAt,
        strava_update_description,
        pb_post_summits,
        pb_ascents_are_public,
    });

    return newUser;
}

export async function updateUser(
    id: number,
    tokens: Tokens,
    scope: Bitfield
): Promise<User | null> {
    const existingUser = await dbUpdateUser(id, {
        strava_access_token: tokens.accessToken,
        strava_access_token_expiry: tokens.accessTokenExpiresAt,
        strava_refresh_token: tokens.refreshToken,
        strava_approved_scope: scope.data,
    });
    return existingUser;
}

export async function getUserFromStravaId(
    stravaId: string
): Promise<User | null> {
    return dbGetUserFromStravaId(Number(stravaId));
}
