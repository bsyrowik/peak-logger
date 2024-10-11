import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import type { ActionAPIContext } from 'astro:actions';

import { ActivityType } from '@util/activity';
import { Bitfield } from '@util/bitfield';

import { updateUser, updateEnabledActivities } from '@util/db';
import type { User } from '@util/db';
import { sendEmail } from '@util/mail';
import { DetectionRadiusName } from 'src/consts.ts';
import { PBAscentsArePublicName, PBPostAscentsName } from 'src/consts.ts';
import { StravaUpdateDescriptionName } from 'src/consts.ts';

import { strava } from './strava';
import { peakbagger } from './peakbagger';
import { dev } from './dev';
import { account } from './account';

function getUserId(context: ActionAPIContext): number {
    if (context.locals.user === null) {
        throw new Error('Not logged in!');
    }
    return context.locals.user.id;
}

function getUser(context: ActionAPIContext): User {
    if (context.locals.user === null) {
        throw new Error('Not logged in!');
    }
    return context.locals.user;
}

export const server = {
    strava,
    peakbagger,
    dev,
    account,
    contactForm: defineAction({
        accept: 'form',
        input: z.object({
            name: z.string(),
            email: z.string(),
            message: z.string(),
        }),
        handler: async (
            { name, email, message },
            context: ActionAPIContext
        ) => {
            var userId = 0;
            if (context.locals.user !== null) {
                userId = context.locals.user.id;
            }

            function sanitize(s: string): string {
                s = s.replaceAll('&', '&amp;');
                s = s.replaceAll('>', '&gt;');
                s = s.replaceAll('<', '&lt;');
                s = s.replaceAll('"', '&quot;');
                s = s.replaceAll("'", '&apos;');
                const regex = /[^a-z0-9&;\s.?!~_-]/gi;
                s = s.replaceAll(regex, (c) => {
                    return '&#' + c.codePointAt(0) + ';';
                });
                return s;
            }
            name = sanitize(name);
            message = sanitize(message);

            //console.log(name, email, message, userId);
            sendEmail(name, email, message, userId);
            return 'Done';
        },
    }),
    updateSettings: defineAction({
        accept: 'form',
        input: z.object({
            [PBPostAscentsName]: z.boolean(),
            [StravaUpdateDescriptionName]: z.boolean(),
            [PBAscentsArePublicName]: z.boolean(),
            [DetectionRadiusName]: z.number(),
        }),
        handler: async (input, context: ActionAPIContext) => {
            const user = getUser(context);
            //console.log("Post summits", user.id, postSummitsToPB);
            //console.log("Update description", user.id, updateStravaDescription);
            //console.log("Updating threshold to ", threshold);

            const updatedUser = await updateUser(user.id, {
                pb_post_summits: input[PBPostAscentsName],
                strava_update_description: input[StravaUpdateDescriptionName],
                detection_radius: input[DetectionRadiusName],
                pb_ascents_are_public: input[PBAscentsArePublicName],
            });
            return updatedUser ? 'Saved!' : 'Not saved.';
        },
    }),
    updateEnabledActivities: defineAction({
        input: z
            .object({
                Hike: z.boolean().default(false),
            })
            .catchall(z.boolean()),
        handler: async (input, context: ActionAPIContext) => {
            const userId = getUserId(context);
            const activities = new Bitfield();
            for (var key in ActivityType) {
                if (key in input) {
                    activities.set(Number(ActivityType[key]), input[key]);
                }
            }

            await updateEnabledActivities(userId, activities.data);
            return 'Updated!';
        },
    }),
};
