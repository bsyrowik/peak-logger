import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import type { ActionAPIContext } from 'astro:actions';

import {
    addAscent,
    deleteAscentServer,
    encryptPassword,
    getClimbedPeaks,
    getNearbyPeaks,
    tryLogin,
    type PeakAscentProperties,
    type PeakProperties,
} from '@util/peakbagger';
import { clearPBData, getClimber, setPBData, type User } from '@util/db';
import type { Feature, Point } from 'geojson';

export const peakbagger = {
    getNearbyPeaks: defineAction({
        input: z.object({
            lat: z.number(),
            lon: z.number(),
            n: z.number(),
        }),
        handler: async ({
            lat,
            lon,
            n,
        }): Promise<Feature<Point, PeakProperties>[]> => {
            const result = await getNearbyPeaks(lat, lon, n);
            return result;
        },
    }),
    getUserAscents: defineAction({
        handler: async (
            _,
            context: ActionAPIContext
        ): Promise<Feature<Point, PeakAscentProperties>[]> => {
            const user: User = context.locals.user;
            if (!user) return [];

            const climber = getClimber(user);
            if (!climber) return [];

            const result = await getClimbedPeaks(climber);
            return result;
        },
    }),
    addUserAscent: defineAction({
        input: z.object({
            peakId: z.number(),
            dateString: z.string(),
            tripReport: z.string(),
            isPublic: z.boolean(),
        }),
        handler: async (
            { peakId, dateString, tripReport, isPublic },
            context: ActionAPIContext
        ): Promise<number> => {
            const user: User = context.locals.user;
            if (!user) return 0;

            const climber = getClimber(user);
            if (!climber) return 0;

            const result = await addAscent(
                user.id,
                climber,
                dateString,
                peakId,
                tripReport,
                isPublic
            );
            return result;
        },
    }),
    deleteUserAscent: defineAction({
        input: z.object({
            ascentId: z.number(),
        }),
        handler: async (
            { ascentId },
            context: ActionAPIContext
        ): Promise<boolean> => {
            const user: User = context.locals.user;
            if (!user) return false;

            const climber = getClimber(user);
            if (!climber) return false;

            const result = await deleteAscentServer(user.id, climber, ascentId);
            return result;
        },
    }),

    clearPBData: defineAction({
        accept: 'form',
        handler: async (_, context: ActionAPIContext): Promise<string> => {
            const user = context.locals.user;
            if (!user) return 'Failed to get user';
            //console.log("Attempting to clear data for User ID: ", user.id);
            await clearPBData(user.id);
            return 'Success!';
        },
    }),

    tryLogin: defineAction({
        accept: 'form',
        input: z.object({
            username: z.string().or(z.null()),
            email: z.string().email(),
            password: z.string(),
        }),
        handler: async (
            { email, password },
            context: ActionAPIContext
        ): Promise<string> => {
            const user = context.locals.user;
            if (!user) return 'Failed to get user';
            //console.log("Trying email/password combo:", email, "/", password, " for ", user.id);
            //console.log("Attempting to add pb email for User ID: ", user.id);

            const encryptedPassword = await encryptPassword(user.id, password);
            const { cid, username, unit } = await tryLogin(
                user.id,
                email,
                encryptedPassword
            );
            await setPBData(
                user.id,
                username,
                email,
                encryptedPassword,
                cid,
                unit
            );

            return 'Success!';
        },
    }),
};
