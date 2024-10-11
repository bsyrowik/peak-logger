import { getPeaksBaggedForStravaActivity } from '@util/core';
import { getUserFromStravaId } from '@util/db';

import type { APIContext } from 'astro';

export const VERIFY_TOKEN = import.meta.env.STRAVA_WEBHOOK_VERIFY_TOKEN;

export async function POST(context: APIContext) {
    /* {
        aspect_type: 'update',
        event_time: 176,
        object_id: 12,
        object_type: 'activity',
        owner_id: 11,
        subscription_id: 26,
        updates: { title: 'Hike' }
      } */
    const request = context.request;
    const url = new URL(request.url);
    let query = url.searchParams;
    let body = await request.json();
    console.log('webhook event received!', query, body);

    let stravaId = body.owner_id;

    if (body.object_type != 'activity') {
        console.log('Not an activity... no work to do.');
        return new Response('EVENT_RECEIVED', {
            status: 200,
        });
    }

    let activityId = body.object_id;

    const user = await getUserFromStravaId(Number(stravaId));

    if (user) {
        console.log(
            'Strava webhook for one of our users: ',
            user.id,
            user.firstname,
            user.lastname
        );
        // TODO: move this to a node.js 'worker'?
        await getPeaksBaggedForStravaActivity(user, Number(activityId));
        console.log('Webhook: work finished; returning response 200');
    } else {
        console.log('No user found; no work to do.');
    }

    // We want to return 200 and launch a process/task to deal with this event

    return new Response('EVENT_RECEIVED', {
        status: 200,
    });
}

export async function GET(context: APIContext) {
    const request = context.request;
    // Parses the query params
    const url = new URL(request.url);
    let mode = url.searchParams.get('hub.mode');
    let token = url.searchParams.get('hub.verify_token');
    let challenge = url.searchParams.get('hub.challenge');
    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
        // Verifies that the mode and token sent are valid
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            return new Response(
                JSON.stringify({ 'hub.challenge': challenge }),
                {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            return new Response(null, {
                status: 403,
                statusText: 'Forbidden',
            });
        }
    }
    return new Response(null, {
        status: 404,
        statusText: 'Not Found',
    });
}
