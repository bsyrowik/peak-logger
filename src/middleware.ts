import {
    getSessionCookieName,
    validateSessionToken,
    deleteSessionTokenCookie,
    setSessionTokenCookie,
} from '@lib/server/session';
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
    const token = context.cookies.get(getSessionCookieName())?.value ?? null;
    if (token === null) {
        context.locals.user = null;
        context.locals.session = null;
        return next();
    }

    const { session, user } = await validateSessionToken(token);
    if (session === null) {
        deleteSessionTokenCookie(context);
    } else {
        setSessionTokenCookie(context, token, session.expiresAt);
    }
    context.locals.session = session;
    context.locals.user = user;
    return next();
});
