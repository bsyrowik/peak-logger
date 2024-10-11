// pages/login/strava/callback.ts
import { strava } from '@lib/server/oauth';
import {
    generateSessionToken,
    createSession,
    setSessionTokenCookie,
} from '@lib/server/session';
import { createUser, updateUser, getUserFromStravaId } from '@lib/server/user';
import { getUser, updateUser as db_updateUser } from '@util/db';
import type { User } from '@util/db';
import type { StravaUser, Tokens } from '@lib/server/user';
import { OAuth2RequestError } from 'arctic';

import { StravaScope, stringToStravaScope } from '@util/strava_scope';
import { Bitfield } from '@util/bitfield';

import type { APIContext } from 'astro';

export async function GET(context: APIContext): Promise<Response> {
    console.log('callback GET');
    const code = context.url.searchParams.get('code');
    const state = context.url.searchParams.get('state');
    const scope = context.url.searchParams.get('scope'); // FIXME: deal with this appropriately
    const error = context.url.searchParams.get('error'); // FIXME: deal with this appropriately
    if (error) {
        console.log('Gott error state in callback response: ', error);
        return context.redirect('/about');
    }
    const storedState =
        context.cookies.get('strava_oauth_state')?.value ?? null;
    console.log('Code: ', code);
    console.log('State: ', state);
    console.log('Approved scope: ', scope);
    console.log('Stored state:', storedState);
    if (!code || !state || !storedState || state !== storedState) {
        console.log(
            "Didn't get code or state or storedState or state!=storedState"
        );
        return new Response(
            'No ' +
                (!code
                    ? 'code'
                    : !state
                      ? 'state'
                      : !storedState
                        ? 'storedState'
                        : 'state matching stored state'),
            {
                status: 400,
            }
        );
    }

    const peakloggerMode =
        context.cookies.get('peaklogger_strava_oauth_mode')?.value ?? null;
    if (peakloggerMode && peakloggerMode == 'login') {
        console.log('Attempting login, not register');
    }

    const existingUserId =
        context.cookies.get('existing_user_id')?.value ?? null;
    if (existingUserId) {
        console.log('Have existing user id', existingUserId);
    }

    const scope_bitfield = new Bitfield();
    if (scope) {
        scope.split(',').forEach((theScope) => {
            console.log('Processing scope: ', theScope);
            const stravaScope = stringToStravaScope[theScope];
            if (typeof stravaScope === 'number') {
                scope_bitfield.set(stravaScope);
            }
        });
    }
    console.log('Strava approved scope: ', scope_bitfield.data);
    if (
        !scope_bitfield.get(StravaScope.activity_write) ||
        !scope_bitfield.get(StravaScope.activity_read)
    ) {
        if (!peakloggerMode || peakloggerMode != 'login') {
            console.log('Did not get approved for required scopes.');
            return context.redirect('/login/strava/scope_explanation');
        }
    }

    try {
        console.log('attempt to validate authorization code', code);
        const tokens: Tokens = await strava.validateAuthorizationCode(code);
        console.log('Tokens: ', tokens);
        const stravaUserResponse = await fetch(
            'https://www.strava.com/api/v3/athlete',
            {
                headers: {
                    Authorization: `Bearer ${tokens.accessToken}`,
                },
            }
        );
        const stravaUser: StravaUser = await stravaUserResponse.json();
        console.log(stravaUser);

        var existingUser: User | null = null;

        if (existingUserId) {
            const userId: number = Number(existingUserId);
            existingUser = await getUser(userId);
            if (existingUser) {
                await db_updateUser(userId, {
                    strava_id: Number(stravaUser.id),
                });
            }
        }

        if (!existingUser) {
            existingUser = await getUserFromStravaId(stravaUser.id);
        }

        if (existingUser && peakloggerMode && peakloggerMode == 'register') {
            return context.redirect('/login/strava/account_exists');
        }

        if (existingUser && peakloggerMode && peakloggerMode == 'login') {
            console.log('try login only...');
            const token = generateSessionToken();
            const session = await createSession(token, existingUser.id);
            setSessionTokenCookie(context, token, session.expiresAt);
            return context.redirect('/recent');
        }

        if (existingUser) {
            console.log('have existing user!');

            await updateUser(existingUser.id, tokens, scope_bitfield);
            const token = generateSessionToken();
            const session = await createSession(token, existingUser.id);
            setSessionTokenCookie(context, token, session.expiresAt);
            return context.redirect('/recent');
        } else {
            console.log('no existing user');
        }

        const newUser = await createUser(stravaUser, tokens);

        const token = generateSessionToken();
        const session = await createSession(token, newUser.id);
        setSessionTokenCookie(context, token, session.expiresAt);
        return context.redirect('/account');
    } catch (e) {
        console.log('Error! ', e);
        // the specific error message depends on the provider
        if (e instanceof OAuth2RequestError) {
            // invalid code
            return new Response(null, {
                status: 400,
            });
        }
        return new Response(null, {
            status: 500,
        });
    }
}
