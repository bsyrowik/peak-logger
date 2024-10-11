import { defineAction } from 'astro:actions';
import type { ActionAPIContext } from 'astro:actions';
import { unlinkStravaAccount } from '@util/strava';
import { deleteAllUserAscents, deleteUser } from '@util/db';
import {
    deleteSessionTokenCookie,
    invalidateSession,
} from '@lib/server/session';

export const account = {
    logout: defineAction({
        handler: async (_, context: ActionAPIContext): Promise<string> => {
            if (context.locals.session === null) {
                return '/';
            }

            await invalidateSession(context.locals.session.id);
            deleteSessionTokenCookie(context);

            return '/';
        },
    }),

    deleteAccount: defineAction({
        accept: 'form',
        handler: async (_, context: ActionAPIContext) => {
            const user = context.locals.user;
            if (user === null || user.id === null || user.strava_id === null) {
                throw new Error('Not logged in!');
            }
            const userId = user.id;
            const stravaId = user.strava_id;
            //console.log('attempting to delete account for user', userId, 'strava id', stravaId);
            await unlinkStravaAccount(userId);
            await deleteAllUserAscents(stravaId);
            await deleteUser(userId);
            return true;
        },
    }),
};
