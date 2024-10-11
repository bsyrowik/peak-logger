import { strava } from '@lib/server/oauth';
import { getStravaTokens, updateStravaTokens } from '@util/db';
import { OAuth2RequestError } from 'arctic';
import { activityEnabled } from '@util/activity';
import type { User } from '@util/db';
import { actions } from 'astro:actions';

export interface Map {
    polyline: string;
    summary_polyline: string;
}

export interface ActivityAthlete {
    id: number;
}

export interface Activity {
    id: number;
    athlete: ActivityAthlete;
    name: string;
    distance: number;
    description: string;
    type: string;
    sport_type: string;
    map: Map;
    start_date: string;
    start_latlng: [number, number];
    start_date_local: string;
    timezone: string;
    utc_offset: number;
    location_city: string;
    location_state: string;
    location_country: string;
    average_speed: number;
    total_elevation_gain: number;
    moving_time: number;
    elapsed_time: number;
    device_name: string;
    calories: number;
}

export async function getDetailedActivity(
    stravaActivityId: number,
    user: User
): Promise<Activity | null> {
    console.log('getDetailedActivity', stravaActivityId, user.id);
    const accessToken = await getValidAccessToken(user);
    const activityResponse = await fetch(
        'https://www.strava.com/api/v3/activities/' + stravaActivityId,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );
    if (activityResponse.status == 200) {
        return await activityResponse.json();
    }
    console.log(activityResponse);
    return null;
}

export async function getLatestActivities(
    user: User,
    count: number,
    page: number,
    enabledActivities?: number
): Promise<Activity[]> {
    /*
        if (page > 2) return [];
        const a = [
            {
                id: 12625464124,
                athlete: 10101,
                name: 'run around seawall',
                distance: 1234,
                description: 'this one is a run',
                type: 'Run',
                sport_type: 'Run',
                map: {
                    polyline: 'blah',
                    summary_polyline:
                        'w~hlHfllmVqBzAsGDqCcAmF{EqAsF_AQ_Av@aCyAo@mDo@{@gAvAs@@cEhEkEo@aFqDiBiCBi@{AuAc@iA}@uIaAiBwAp@qA~BaALqBa@oBcCuGVu@qAm@y@k@g@Lc@q@uDwA}@[iC}Ad@gC_CmAeCBa@kBgDCi@y@g@a@kBPyBx@cBiAC_@aAs@Ei@~@s@H}EUm@t@B\Dk@_@XE}@YNCq@U@\oA[MDcAqBKqA~BGw@Sh@?a@KTa@aCFoBc@g@VoA]_ABoAw@wBn@kBe@gAXy@O_CuAyAiAfAe@_BJkBm@cBcA_@KeBw@yAPgAEiBv@c@JWNjAMeA_Ab@C`C[\GfAt@d@b@r@Ah@b@LdAfBZbFf@?`@y@bBlABnBW`Ad@v@?|@a@jAv@pBMhATnBQt@\JTfCIjAVjAkBxIk@rEkCr@{FyA}@Rs@]wCcEyDyDyBaE{BuFWiBi@eADc@e@{@gEaC[k@Du@mAi@mAxCBdBc@~AFt@oBxGg@Rt@fBgAnEc@@OzAa@t@_@CEjBq@|@i@hCuCzFAz@o@Xo@nDi@Re@jCuAFiBlCy@Og@nBN`@KXVg@v@`Bv@DLr@x@|@H|@ROj@t@tAFf@{@v@G\n@lAe@`@f@~AXvAo@fBAv@|AxApAHx@XZItAjAt@rBQN|@~@\Zp@zCVU_@\cBr@cA@k@fAkA|@Cg@wAp@uD]s@v@yCRAa@gALa@YLFOSILCmA[Bg@a@[wBl@pAq@Ln@Od@TgAPG@h@Va@`@xA`A^j@~Ai@d@DvCgAnEkAvBJLcA~B_@f@LNS^OnD~@ZHzBf@h@bCrG`@@DkAbBzAm@JPqA[q@~AoBZ@h@`ANzA|AP\aA|@mApAq@Gy@r@Y`@_@j@oFZY`@uBP}CVsCbALxB|Bn@y@lCeAzEkFBq@nBoB^qG\q@Kq@RyDXyAIyEbAoAMk@Ju@V{@|@m@bCv@dAfDzDbHz@r@pB]T~BzAtA\|COf@V~@vAt@`@|@nDC|A[tCnCrCZl@[v@yBbAe@d@r@vAjK`@|@dB~AvAvCtFnE~Eb@lD}Dz@ErAmAv@rBVnBhC`Bz@s@v@FZb@r@rEfCdB`BrBzFdAtDMtB_B',
                },
                start_date: 'Start Time',
                start_date_local: 1728579434000,
                timezone: 'America/Vancouver',
                utc_offset: 7,
                location_city: 'Vancouver',
                location_state: 'BC',
                location_country: 'Canada',
                average_speed: 3.2,
                total_elevation_gain: 134,
                moving_time: 12222,
                elapsed_time: 10212,
            },
            {
                id: 12625464124,
                athlete: 10101,
                name: 'activity',
                distance: 1234,
                description: 'fun hike',
                type: 'Hike',
                sport_type: 'Hike',
                map: {
                    polyline: 'blah',
                    summary_polyline:
                        'w~hlHfllmVqBzAsGDqCcAmF{EqAsF_AQ_Av@aCyAo@mDo@{@gAvAs@@cEhEkEo@aFqDiBiCBi@{AuAc@iA}@uIaAiBwAp@qA~BaALqBa@oBcCuGVu@qAm@y@k@g@Lc@q@uDwA}@[iC}Ad@gC_CmAeCBa@kBgDCi@y@g@a@kBPyBx@cBiAC_@aAs@Ei@~@s@H}EUm@t@B\Dk@_@XE}@YNCq@U@\oA[MDcAqBKqA~BGw@Sh@?a@KTa@aCFoBc@g@VoA]_ABoAw@wBn@kBe@gAXy@O_CuAyAiAfAe@_BJkBm@cBcA_@KeBw@yAPgAEiBv@c@JWNjAMeA_Ab@C`C[\GfAt@d@b@r@Ah@b@LdAfBZbFf@?`@y@bBlABnBW`Ad@v@?|@a@jAv@pBMhATnBQt@\JTfCIjAVjAkBxIk@rEkCr@{FyA}@Rs@]wCcEyDyDyBaE{BuFWiBi@eADc@e@{@gEaC[k@Du@mAi@mAxCBdBc@~AFt@oBxGg@Rt@fBgAnEc@@OzAa@t@_@CEjBq@|@i@hCuCzFAz@o@Xo@nDi@Re@jCuAFiBlCy@Og@nBN`@KXVg@v@`Bv@DLr@x@|@H|@ROj@t@tAFf@{@v@G\n@lAe@`@f@~AXvAo@fBAv@|AxApAHx@XZItAjAt@rBQN|@~@\Zp@zCVU_@\cBr@cA@k@fAkA|@Cg@wAp@uD]s@v@yCRAa@gALa@YLFOSILCmA[Bg@a@[wBl@pAq@Ln@Od@TgAPG@h@Va@`@xA`A^j@~Ai@d@DvCgAnEkAvBJLcA~B_@f@LNS^OnD~@ZHzBf@h@bCrG`@@DkAbBzAm@JPqA[q@~AoBZ@h@`ANzA|AP\aA|@mApAq@Gy@r@Y`@_@j@oFZY`@uBP}CVsCbALxB|Bn@y@lCeAzEkFBq@nBoB^qG\q@Kq@RyDXyAIyEbAoAMk@Ju@V{@|@m@bCv@dAfDzDbHz@r@pB]T~BzAtA\|COf@V~@vAt@`@|@nDC|A[tCnCrCZl@[v@yBbAe@d@r@vAjK`@|@dB~AvAvCtFnE~Eb@lD}Dz@ErAmAv@rBVnBhC`Bz@s@v@FZb@r@rEfCdB`BrBzFdAtDMtB_B',
                },
                start_date: 'Start Time',
                start_date_local: 1728579434000,
                timezone: 'America/Vancouver',
                utc_offset: 7,
                location_city: 'Vancouver',
                location_state: 'BC',
                location_country: 'Canada',
                average_speed: 3.2,
                total_elevation_gain: 134,
                moving_time: 12222,
                elapsed_time: 10212,
            },
            {
                id: 12625464124,
                athlete: 10101,
                name: 'some new activity',
                distance: 1234,
                description: 'blobble',
                type: 'Ride',
                sport_type: 'Ride',
                map: {
                    polyline: 'blah',
                    summary_polyline:
                        'w~hlHfllmVqBzAsGDqCcAmF{EqAsF_AQ_Av@aCyAo@mDo@{@gAvAs@@cEhEkEo@aFqDiBiCBi@{AuAc@iA}@uIaAiBwAp@qA~BaALqBa@oBcCuGVu@qAm@y@k@g@Lc@q@uDwA}@[iC}Ad@gC_CmAeCBa@kBgDCi@y@g@a@kBPyBx@cBiAC_@aAs@Ei@~@s@H}EUm@t@B\Dk@_@XE}@YNCq@U@\oA[MDcAqBKqA~BGw@Sh@?a@KTa@aCFoBc@g@VoA]_ABoAw@wBn@kBe@gAXy@O_CuAyAiAfAe@_BJkBm@cBcA_@KeBw@yAPgAEiBv@c@JWNjAMeA_Ab@C`C[\GfAt@d@b@r@Ah@b@LdAfBZbFf@?`@y@bBlABnBW`Ad@v@?|@a@jAv@pBMhATnBQt@\JTfCIjAVjAkBxIk@rEkCr@{FyA}@Rs@]wCcEyDyDyBaE{BuFWiBi@eADc@e@{@gEaC[k@Du@mAi@mAxCBdBc@~AFt@oBxGg@Rt@fBgAnEc@@OzAa@t@_@CEjBq@|@i@hCuCzFAz@o@Xo@nDi@Re@jCuAFiBlCy@Og@nBN`@KXVg@v@`Bv@DLr@x@|@H|@ROj@t@tAFf@{@v@G\n@lAe@`@f@~AXvAo@fBAv@|AxApAHx@XZItAjAt@rBQN|@~@\Zp@zCVU_@\cBr@cA@k@fAkA|@Cg@wAp@uD]s@v@yCRAa@gALa@YLFOSILCmA[Bg@a@[wBl@pAq@Ln@Od@TgAPG@h@Va@`@xA`A^j@~Ai@d@DvCgAnEkAvBJLcA~B_@f@LNS^OnD~@ZHzBf@h@bCrG`@@DkAbBzAm@JPqA[q@~AoBZ@h@`ANzA|AP\aA|@mApAq@Gy@r@Y`@_@j@oFZY`@uBP}CVsCbALxB|Bn@y@lCeAzEkFBq@nBoB^qG\q@Kq@RyDXyAIyEbAoAMk@Ju@V{@|@m@bCv@dAfDzDbHz@r@pB]T~BzAtA\|COf@V~@vAt@`@|@nDC|A[tCnCrCZl@[v@yBbAe@d@r@vAjK`@|@dB~AvAvCtFnE~Eb@lD}Dz@ErAmAv@rBVnBhC`Bz@s@v@FZb@r@rEfCdB`BrBzFdAtDMtB_B',
                },
                start_date: 'Start Time',
                start_date_local: 1728579434000,
                timezone: 'America/Vancouver',
                utc_offset: 7,
                location_city: 'Vancouver',
                location_state: 'BC',
                location_country: 'Canada',
                average_speed: 3.2,
                total_elevation_gain: 134,
                moving_time: 12222,
                elapsed_time: 10212,
            },
            {
                id: 12625464124,
                athlete: 10101,
                name: 'Big Mountain',
                distance: 1234,
                description: 'another fun hike',
                type: 'Hike',
                sport_type: 'Hike',
                map: {
                    polyline: 'blah',
                    summary_polyline:
                        'w~hlHfllmVqBzAsGDqCcAmF{EqAsF_AQ_Av@aCyAo@mDo@{@gAvAs@@cEhEkEo@aFqDiBiCBi@{AuAc@iA}@uIaAiBwAp@qA~BaALqBa@oBcCuGVu@qAm@y@k@g@Lc@q@uDwA}@[iC}Ad@gC_CmAeCBa@kBgDCi@y@g@a@kBPyBx@cBiAC_@aAs@Ei@~@s@H}EUm@t@B\Dk@_@XE}@YNCq@U@\oA[MDcAqBKqA~BGw@Sh@?a@KTa@aCFoBc@g@VoA]_ABoAw@wBn@kBe@gAXy@O_CuAyAiAfAe@_BJkBm@cBcA_@KeBw@yAPgAEiBv@c@JWNjAMeA_Ab@C`C[\GfAt@d@b@r@Ah@b@LdAfBZbFf@?`@y@bBlABnBW`Ad@v@?|@a@jAv@pBMhATnBQt@\JTfCIjAVjAkBxIk@rEkCr@{FyA}@Rs@]wCcEyDyDyBaE{BuFWiBi@eADc@e@{@gEaC[k@Du@mAi@mAxCBdBc@~AFt@oBxGg@Rt@fBgAnEc@@OzAa@t@_@CEjBq@|@i@hCuCzFAz@o@Xo@nDi@Re@jCuAFiBlCy@Og@nBN`@KXVg@v@`Bv@DLr@x@|@H|@ROj@t@tAFf@{@v@G\n@lAe@`@f@~AXvAo@fBAv@|AxApAHx@XZItAjAt@rBQN|@~@\Zp@zCVU_@\cBr@cA@k@fAkA|@Cg@wAp@uD]s@v@yCRAa@gALa@YLFOSILCmA[Bg@a@[wBl@pAq@Ln@Od@TgAPG@h@Va@`@xA`A^j@~Ai@d@DvCgAnEkAvBJLcA~B_@f@LNS^OnD~@ZHzBf@h@bCrG`@@DkAbBzAm@JPqA[q@~AoBZ@h@`ANzA|AP\aA|@mApAq@Gy@r@Y`@_@j@oFZY`@uBP}CVsCbALxB|Bn@y@lCeAzEkFBq@nBoB^qG\q@Kq@RyDXyAIyEbAoAMk@Ju@V{@|@m@bCv@dAfDzDbHz@r@pB]T~BzAtA\|COf@V~@vAt@`@|@nDC|A[tCnCrCZl@[v@yBbAe@d@r@vAjK`@|@dB~AvAvCtFnE~Eb@lD}Dz@ErAmAv@rBVnBhC`Bz@s@v@FZb@r@rEfCdB`BrBzFdAtDMtB_B',
                },
                start_date: 'Start Time',
                start_date_local: 1728579434000,
                timezone: 'America/Vancouver',
                utc_offset: 7,
                location_city: 'Vancouver',
                location_state: 'BC',
                location_country: 'Canada',
                average_speed: 3.2,
                total_elevation_gain: 134,
                moving_time: 12222,
                elapsed_time: 10212,
            },
        ];
        if (page == 2) {
            return a.slice(0, 3) as unknown as Activity[];
        }
        return a as unknown as Activity[];
    */

    const accessToken = await getValidAccessToken(user);
    const stravaResponse = await fetch(
        'https://www.strava.com/api/v3/athlete/activities?per_page=' +
            count +
            '&page=' +
            page,
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

    if (enabledActivities) {
        return activities.filter((activity) =>
            activityEnabled(enabledActivities, activity.sport_type)
        );
    }
    return activities;
}

export async function unlinkStravaAccount(user: User) {
    const accessToken = await getValidAccessToken(user);
    await fetch(
        'https://www.strava.com/oauth/deauthorize?access_token=' + accessToken,
        {
            method: 'POST',
        }
    );
}

export async function getValidAccessToken(user: User): Promise<string> {
    var { accessToken, accessTokenExpiresAt, refreshToken } =
        getStravaTokens(user);
    if (
        refreshToken &&
        accessTokenExpiresAt &&
        accessTokenExpiresAt.getTime() <= Date.now() + 5000
    ) {
        // will token be valid for 5+ seconds?
        console.log(
            'access token is expired!!',
            accessTokenExpiresAt,
            ' <= ',
            Date.now() + 5000
        );
        try {
            var tokens;
            if (typeof window === 'undefined') {
                tokens = await strava.refreshAccessToken(refreshToken);
            } else {
                const { data, error } = await actions.strava.refreshTokens();
                if (!error && data) {
                    tokens = {
                        ...data,
                        accessTokenExpiresAt: new Date(
                            data.accessTokenExpiresAt
                        ),
                    };
                } else {
                    throw new Error('Could not acquire new access token!');
                }
            }
            accessToken = tokens.accessToken;
            console.log(
                'New access token expiry:',
                tokens.accessTokenExpiresAt
            );
            await updateStravaTokens(user.id, tokens);
        } catch (e) {
            if (e instanceof OAuth2RequestError) {
                console.log('Problem getting refresh token!', e);
            } else {
                console.log(e);
            }
        }
    } else {
        console.log('Current access token still valid!');
    }

    return accessToken ?? '';
}
