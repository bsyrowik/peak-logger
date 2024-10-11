// pages/login/strava/index.ts
import { generateState } from 'arctic';
import { strava } from '@lib/server/oauth';

import type { APIContext } from 'astro';

export async function GET(context: APIContext): Promise<Response> {
    const mode = context.url.searchParams.get('mode');
    const allScope = context.url.searchParams.get('all_scope');
    const state = generateState();
    //console.log("state: ", state);
    var scopes = ['activity:read,activity:write'];

    context.cookies.set('strava_oauth_state', state, {
        path: '/',
        secure: import.meta.env.PROD,
        httpOnly: true,
        maxAge: 60 * 10,
        sameSite: 'lax',
    });

    if (mode && mode == 'login') {
        scopes = [];
        //console.log("attempting login!");
        context.cookies.set('peaklogger_strava_oauth_mode', 'login', {
            path: '/',
            secure: import.meta.env.PROD,
            httpOnly: true,
            maxAge: 60 * 10,
            sameSite: 'lax',
        });
    } else if (mode && mode == 'update') {
        if (allScope && allScope == 'add') {
            scopes[0] += ',activity:read_all';
        }
        context.cookies.set('peaklogger_strava_oauth_mode', 'update', {
            path: '/',
            secure: import.meta.env.PROD,
            httpOnly: true,
            maxAge: 60 * 10,
            sameSite: 'lax',
        });
    } else {
        context.cookies.set('peaklogger_strava_oauth_mode', 'register', {
            path: '/',
            secure: import.meta.env.PROD,
            httpOnly: true,
            maxAge: 60 * 10,
            sameSite: 'lax',
        });
    }

    if (context.locals.user) {
        //console.log("have existing user id!");
        context.cookies.set('existing_user_id', context.locals.user.id, {
            path: '/',
            secure: import.meta.env.PROD,
            httpOnly: true,
            maxAge: 60 * 10,
            sameSite: 'lax',
        });
    }

    const url = await strava.createAuthorizationURL(state, {
        scopes: scopes,
    });
    return context.redirect(url.toString());
}
