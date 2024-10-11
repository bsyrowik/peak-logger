import { activityEnabledForUser } from './activity';
import { getPeaksBaggedForStravaActivity } from './core';
import type { User } from './db';
import { getValidAccessToken, type Activity } from './strava';

export async function getLatestPeaksBaggedForUser(
    user: User,
    index: number = 0
): Promise<string> {
    console.log('getLatestPeaksBaggedForUser ', user.id);

    const accessToken = await getValidAccessToken(user);
    console.log('using access token:', accessToken);
    const stravaResponse = await fetch(
        'https://www.strava.com/api/v3/athlete/activities?per_page=25',
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );
    console.log(stravaResponse);
    if (stravaResponse.status === 401) {
        throw new Error('Strava not authorized:' + stravaResponse.statusText);
    }
    if (stravaResponse.status !== 200) {
        throw new Error(
            'Strava returned bad response!' + stravaResponse.statusText
        );
    }
    const activities: Activity[] = await stravaResponse.json();

    const validActivities: Activity[] = activities.filter((activity) =>
        activityEnabledForUser(user, activity.sport_type)
    );

    if (validActivities.length < 1) {
        return '';
    }
    const activityId = validActivities[index].id;

    /*
    // stream testing
    const s = await getLatLongStream(activityId, user.id);
    //console.log(s);
    console.log(s?.latlng.data.slice(0, 20));
    return "";
    */

    return await getPeaksBaggedForStravaActivity(user, activityId);
}
