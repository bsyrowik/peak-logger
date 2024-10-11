import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import type { ActionAPIContext } from 'astro:actions';

import { getClimber } from '@util/db';
import { addAscent } from '@util/peakbagger';
import { getLatestPeaksBaggedForUser } from '@util/dev';

/*
interface Stream {
    original_size: number;
    resolution: string;
    series_type: string;
    data: number[];
};

interface StreamSet {
    [key: string]: Stream,
};

async function getLatLongStream(stravaActivityId : number, user: User) : Promise<StreamSet | null> {
    console.log("getLatLongStream", stravaActivityId, user.id);

    const accessToken = await getValidAccessToken(user);

    var query = new URLSearchParams({
        keys: 'latlng', // also valid: distance, time, altitude
        key_by_type: 'true',
    }).toString();

    console.log(query);

    const streamResponse = await fetch("https://www.strava.com/api/v3/activities/" + stravaActivityId + '/streams?' + query, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    //console.log(streamResponse);
    if (streamResponse.status == 200) {
        return await streamResponse.json();
    }
    return null;
}
*/

export const dev = {
    getStravaActivity: defineAction({
        accept: 'form',
        input: z.object({
            index: z.number(),
        }),
        handler: async (
            { index },
            context: ActionAPIContext
        ): Promise<string> => {
            const user = context.locals.user;
            if (!user) {
                throw new Error('Not logged in!');
            }
            //console.log("Get Strava Activity for ", user.id, index);
            return await getLatestPeaksBaggedForUser(user, index);
        },
    }),

    postSummitToPB: defineAction({
        accept: 'form',
        input: z.object({
            peakId: z.number(),
        }),
        handler: async (
            { peakId },
            context: ActionAPIContext
        ): Promise<string> => {
            const user = context.locals.user;
            if (
                user === null ||
                user.id === null ||
                user.peakbagger_id === null ||
                user.pb_email === null ||
                user.pb_password === null
            ) {
                throw new Error('Not logged in!');
            }
            const userId = user.id;
            //console.log("Trying to add summit for ", userId);

            const climber = getClimber(user);
            if (!climber) return 'Climber not valid';

            const pid: number = peakId;
            const date: Date = new Date();
            const dateString: string =
                date.getFullYear() +
                '-' +
                (date.getMonth() + 1) +
                '-' +
                date.getDate();
            const tripReport: string = '';

            const ascentId: number = await addAscent(
                userId,
                climber,
                dateString,
                pid,
                tripReport,
                user.pb_ascents_are_public
            );
            return ascentId > 0
                ? 'Success: ' + ascentId
                : 'Failed to log ascent of ' + pid;
        },
    }),
};
