import { defineAction } from 'astro:actions';
import type { ActionAPIContext } from 'astro:actions';
import { strava as strava_oauth } from '@lib/server/oauth';
import type { StravaTokens } from 'arctic';
import { updateUser } from '@util/db';
import { unlinkStravaAccount } from '@util/strava';

export const strava = {
    refreshTokens: defineAction({
        handler: async (
            _,
            context: ActionAPIContext
        ): Promise<StravaTokens> => {
            const user = context.locals.user;
            const tokens = await strava_oauth.refreshAccessToken(
                user.strava_refresh_token
            );
            return tokens;
        },
    }),

    unlinkStravaAccount: defineAction({
        accept: 'form',
        handler: async (_, context: ActionAPIContext) => {
            const user = context.locals.user;
            if (user === null || user.id === null || user.strava_id === null) {
                throw new Error('Not logged in!');
            }
            const userId = user.id;
            //const stravaId = user.strava_id;
            //console.log('attempting to unlink strava account for user', userId, 'strava id', stravaId);
            await updateUser(userId, {
                // can't nullify strava_id since it is used as a global secondary index
                // Also don't want to get rid of the strava_id entirely since we use this for the key to store activities.
                //strava_id: 0,
                strava_refresh_token: undefined,
                strava_approved_scope: undefined,
                strava_access_token: undefined,
                strava_access_token_expiry: undefined,
            });
            await unlinkStravaAccount(userId);
            return true;
        },
    }),
};
