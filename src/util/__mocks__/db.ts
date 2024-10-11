import type { Tokens } from '@lib/server/user';
import type { ActivityEntry, PeakEntry, Session, User } from '@util/db';

export { serializeUser, getClimber, getStravaTokens } from '@util/db';

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

var pb_peaks: { [id: number]: PeakEntry } = {};

export async function getPeaks(peakList: number[]): Promise<PeakEntry[]> {
    if (peakList.length < 1) return [];
    var result: PeakEntry[] = [];
    for (var id in pb_peaks) {
        if (peakList.includes(Number(id))) {
            result.push(pb_peaks[id]);
        }
    }
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

////////////////////////////////////////////////////////////////////////////////
////  strava_activities
////////////////////////////////////////////////////////////////////////////////

var strava_activities: { [stravaActivityId: number]: ActivityEntry } = {};

export async function deleteUserActivity(_: number, stravaActivityId: number) {
    delete strava_activities[stravaActivityId];
}

export async function deleteAllUserAscents(stravaUserId: number) {
    const toDelete: number[] = [];
    Object.entries(strava_activities).forEach(([_, value]) => {
        if (value.user_id == stravaUserId) toDelete.push(value.id);
    });
    toDelete.forEach(
        (activityId: number) => delete strava_activities[activityId]
    );
}

export async function getStravaActivity(
    _: number,
    activityId: number
): Promise<ActivityEntry | null> {
    return strava_activities[activityId];
}

export async function getStravaActivitiesForUser(
    stravaUserId: number
): Promise<ActivityEntry[]> {
    const a: ActivityEntry[] = [];
    Object.entries(strava_activities).forEach(([_, value]) => {
        if (value.user_id == stravaUserId) a.push(value);
    });
    return a;
}

export async function updateStravaActivity(
    activity: ActivityEntry
): Promise<boolean> {
    try {
        strava_activities[activity.id] = activity;
    } catch (err) {
        console.error(err);
        return false;
    }
    return true;
}

////////////////////////////////////////////////////////////////////////////////
////  counters
////////////////////////////////////////////////////////////////////////////////

class Counter {
    static count = -2; // FIXME: find a better way to deal with this; value tied
    // to the validateSession test in session.test.ts
    static get() {
        return ++Counter.count;
    }
}

async function getNextUserId(): Promise<number> {
    return Counter.get();
}

////////////////////////////////////////////////////////////////////////////////
////  strava_user_session
////////////////////////////////////////////////////////////////////////////////

var strava_user_session: { [id: string]: Session } = {};

export async function deleteSession(sessionId: string) {
    delete strava_user_session[sessionId];
}

export async function getSession(sessionId: string): Promise<Session | null> {
    const response = { Items: [strava_user_session[sessionId]] };
    //console.log(response);

    if (
        response.Items === null ||
        response.Items === undefined ||
        response.Items.length < 1
    ) {
        return null;
    }

    return response.Items[0] || null;
}

export async function storeSession(session: Session) {
    strava_user_session[session.id] = session;
}

export async function updateSession(
    sessionId: string,
    session: Partial<Session>
): Promise<Session | null> {
    const orig = strava_user_session[sessionId];
    if (!orig) return null;
    const newSession = {
        ...orig,
        ...session,
    };
    strava_user_session[sessionId] = newSession;
    return newSession;
}

////////////////////////////////////////////////////////////////////////////////
////  strava_auth_user
////////////////////////////////////////////////////////////////////////////////

var strava_auth_user: { [id: number]: User } = {};

export async function deleteUser(userId: number) {
    delete strava_auth_user[userId];
}

export async function getUser(userId: number): Promise<User | null> {
    return strava_auth_user[userId] || null;
}

export async function getUserFromStravaId(
    stravaId: number
): Promise<User | null> {
    for (const k in strava_auth_user) {
        if (strava_auth_user[k].strava_id === stravaId) {
            return strava_auth_user[k];
        }
    }
    return null;
}

export async function createNewUser(user: Omit<User, 'id'>): Promise<User> {
    const id = await getNextUserId();
    const newUser: User = { ...user, id };
    //console.log(newUser);

    strava_auth_user[id] = newUser;

    return newUser;
}

export async function updateUser(
    userId: number,
    userProps: Partial<User>
): Promise<User | null> {
    const orig = strava_auth_user[userId];
    if (!orig) return null;
    const newUser = {
        ...orig,
        ...userProps,
    };
    strava_auth_user[userId] = newUser;
    return newUser;
}
