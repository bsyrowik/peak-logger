import type { User, Session } from '@util/db';
import {
    deleteSession,
    storeSession,
    updateSession,
    getSession,
    getUser,
} from '@util/db';
import {
    encodeBase32LowerCaseNoPadding,
    encodeHexLowerCase,
} from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import type { APIContext } from 'astro';
import type { ActionAPIContext } from 'astro:actions';

export function generateSessionToken(): string {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    const token = encodeBase32LowerCaseNoPadding(bytes);
    return token;
}

export async function createSession(
    token: string,
    userId: number
): Promise<Session> {
    const sessionId = encodeHexLowerCase(
        sha256(new TextEncoder().encode(token))
    );
    const session: Session = {
        id: sessionId,
        userId: userId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    };
    await storeSession(session);
    return session;
}

export async function validateSessionToken(
    token: string
): Promise<SessionValidationResult> {
    const sessionId = encodeHexLowerCase(
        sha256(new TextEncoder().encode(token))
    );

    const session = await getSession(sessionId);
    if (!session) {
        return { session: null, user: null };
    }

    const user = await getUser(session.userId);
    if (!user) {
        return { session: null, user: null };
    }

    if (Date.now() >= session.expiresAt.getTime()) {
        await deleteSession(session.id);
        return { session: null, user: null };
    }

    if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
        session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
        await updateSession(session.id, { expiresAt: session.expiresAt });
    }
    return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
    deleteSession(sessionId);
}

export function getSessionCookieName(): string {
    return 'session';
}

export function setSessionTokenCookie(
    context: APIContext,
    token: string,
    expiresAt: Date
): void {
    context.cookies.set(getSessionCookieName(), token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: import.meta.env.PROD,
        expires: expiresAt,
        path: '/',
    });
}

export function deleteSessionTokenCookie(
    context: APIContext | ActionAPIContext
): void {
    context.cookies.set(getSessionCookieName(), '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: import.meta.env.PROD,
        maxAge: 0,
        path: '/',
    });
}

export type SessionValidationResult =
    | { session: Session; user: User }
    | { session: null; user: null };
