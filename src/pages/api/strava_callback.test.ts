import { vi, expect, test } from 'vitest';
import * as Endpoint from './strava_callback.ts';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

vi.mock('../../util/db');

test('strava_callback GET error', async () => {
    const params = new URLSearchParams({
        code: '7',
        state: 'blah',
        scope: 'read',
        error: 'error',
    });
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/api/strava_callback?' +
                    params.toString(),
                {
                    method: 'GET',
                    headers: {
                        Cookie: 'strava_oauth_state=login',
                    },
                }
            ),
        }
    );
    //console.log(response);

    expect(response.status).toBe(302);
    expect(response.statusText).toBe('');
    expect(response.headers.get('Location')).toBe('/about');
});

test('strava_callback GET state mismatch', async () => {
    const params = new URLSearchParams({
        code: '7',
        state: 'theState',
        scope: 'read',
        error: '',
    });
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/api/strava_callback?' +
                    params.toString(),
                {
                    method: 'GET',
                    headers: {
                        Cookie: 'strava_oauth_state=blah',
                    },
                }
            ),
        }
    );
    //console.log(response);

    expect(response.status).toBe(400);
    expect(response.statusText).toBe('');
    const text = await response.text();
    expect(text).toBe('No state matching stored state');
});

test('strava_callback GET no code', async () => {
    const params = new URLSearchParams({
        code: '',
        state: 'theState',
        scope: 'read',
        error: '',
    });
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/api/strava_callback?' +
                    params.toString(),
                {
                    method: 'GET',
                    headers: {
                        Cookie: 'strava_oauth_state=theState',
                    },
                }
            ),
        }
    );
    //console.log(response);

    expect(response.status).toBe(400);
    expect(response.statusText).toBe('');
    const text = await response.text();
    expect(text).toBe('No code');
});

test('strava_callback GET no stored state', async () => {
    const params = new URLSearchParams({
        code: '7',
        state: 'theState',
        scope: 'read',
        error: '',
    });
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/api/strava_callback?' +
                    params.toString(),
                {
                    method: 'GET',
                    headers: {},
                }
            ),
        }
    );
    //console.log(response);

    expect(response.status).toBe(400);
    expect(response.statusText).toBe('');
    const text = await response.text();
    expect(text).toBe('No storedState');
});

test('strava_callback GET no state', async () => {
    const params = new URLSearchParams({
        code: '7',
        state: '',
        scope: 'read',
        error: '',
    });
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/api/strava_callback?' +
                    params.toString(),
                {
                    method: 'GET',
                    headers: {
                        Cookie: 'strava_oauth_state=theState',
                    },
                }
            ),
        }
    );
    //console.log(response);

    expect(response.status).toBe(400);
    expect(response.statusText).toBe('');
    const text = await response.text();
    expect(text).toBe('No state');
});

test('strava_callback GET bad scope', async () => {
    const params = new URLSearchParams({
        code: '7',
        state: 'theState',
        scope: 'read',
        error: '',
    });
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/api/strava_callback?' +
                    params.toString(),
                {
                    method: 'GET',
                    headers: {
                        Cookie: 'strava_oauth_state=theState',
                    },
                }
            ),
        }
    );
    //console.log(response);

    expect(response.status).toBe(302);
    expect(response.statusText).toBe('');
    expect(response.headers.get('Location')).toBe(
        '/login/strava/scope_explanation'
    );
});

import { type Tokens } from 'arctic';
import {
    createUser,
    type StravaUser,
    type Tokens as UserTokens,
} from '@lib/server/user';
import { getUser, getUserFromStravaId } from '@util/db.ts';

vi.mock(import('arctic'), async () => {
    const Strava = vi.fn();
    Strava.prototype.validateAuthorizationCode = async (
        code: string
    ): Promise<Tokens | null> => {
        if (!code) return null;
        return {
            refreshToken: 'refreshToken',
            accessToken: 'accessToken',
            accessTokenExpiresAt: new Date(),
        };
    };
    return { Strava };
});

global.fetch = vi.fn();
function createFetchResponse(data: any) {
    return { json: () => new Promise((resolve) => resolve(data)) };
}

test('strava_callback GET link strava account', async () => {
    // Create a user
    const su: StravaUser = {
        id: '17',
        firstname: 'Jane',
        lastname: 'Smith',
    };
    const tokens: UserTokens = {
        refreshToken: 'refreshToken',
        accessToken: 'accessToken',
        accessTokenExpiresAt: new Date(),
    };
    const user = await createUser(su, tokens);

    const params = new URLSearchParams({
        code: 'someCode',
        state: 'theState',
        scope: 'activity:read,activity:write',
        error: '',
    });

    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse({
            id: 18,
        })
    );

    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/api/strava_callback?' +
                    params.toString(),
                {
                    method: 'GET',
                    headers: {
                        Cookie: 'strava_oauth_state=theState; existing_user_id=-1;',
                    },
                }
            ),
        }
    );
    //console.log(response);

    expect(response.status).toBe(302);
    expect(response.statusText).toBe('');
    expect(response.headers.get('Location')).toBe('/recent');

    // Make sure the strava ID got updated
    const updatedUser = await getUser(user.id);
    expect(updatedUser?.strava_id).toBe(18);
});

test('strava_callback GET login', async () => {
    // Create a user
    const su: StravaUser = {
        id: '17',
        firstname: 'Jane',
        lastname: 'Smith',
    };
    const tokens: UserTokens = {
        refreshToken: 'refreshToken',
        accessToken: 'accessToken',
        accessTokenExpiresAt: new Date(),
    };
    const user = await createUser(su, tokens);

    const params = new URLSearchParams({
        code: 'someCode',
        state: 'theState',
        scope: '',
        error: '',
    });

    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse({
            id: 17,
        })
    );

    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/api/strava_callback?' +
                    params.toString(),
                {
                    method: 'GET',
                    headers: {
                        Cookie: 'strava_oauth_state=theState; peaklogger_strava_oauth_mode=login;',
                    },
                }
            ),
        }
    );
    //console.log(response);

    expect(response.status).toBe(302);
    expect(response.statusText).toBe('');
    expect(response.headers.get('Location')).toBe('/recent');

    // Make sure the strava ID got updated
    const updatedUser = await getUser(user.id);
    expect(updatedUser?.strava_id).toBe(17);
});

test('strava_callback GET user exists', async () => {
    // Create a user
    const su: StravaUser = {
        id: '17',
        firstname: 'Jane',
        lastname: 'Smith',
    };
    const tokens: UserTokens = {
        refreshToken: 'refreshToken',
        accessToken: 'accessToken',
        accessTokenExpiresAt: new Date(),
    };
    const user = await createUser(su, tokens);

    const params = new URLSearchParams({
        code: 'someCode',
        state: 'theState',
        scope: 'activity:read,activity:write',
        error: '',
    });

    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse({
            id: 17,
        })
    );

    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/api/strava_callback?' +
                    params.toString(),
                {
                    method: 'GET',
                    headers: {
                        Cookie: 'strava_oauth_state=theState; peaklogger_strava_oauth_mode=register;',
                    },
                }
            ),
        }
    );
    //console.log(response);

    expect(response.status).toBe(302);
    expect(response.statusText).toBe('');
    expect(response.headers.get('Location')).toBe(
        '/login/strava/account_exists'
    );

    // Make sure the strava ID did not get updated
    const updatedUser = await getUser(user.id);
    expect(updatedUser?.strava_id).toBe(17);
});

test('strava_callback GET register', async () => {
    const params = new URLSearchParams({
        code: 'someCode',
        state: 'theState',
        scope: 'activity:read,activity:write',
        error: '',
    });

    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse({
            id: 19,
            firstname: 'John',
            lastname: 'Doe',
        })
    );

    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/api/strava_callback?' +
                    params.toString(),
                {
                    method: 'GET',
                    headers: {
                        Cookie: 'strava_oauth_state=theState; peaklogger_strava_oauth_mode=register;',
                    },
                }
            ),
        }
    );
    //console.log(response);

    expect(response.status).toBe(302);
    expect(response.statusText).toBe('');
    expect(response.headers.get('Location')).toBe('/account');

    const updatedUser = await getUserFromStravaId(19);
    expect(updatedUser?.firstname).toBe('John');
    expect(updatedUser?.lastname).toBe('Doe');
});

test('strava_callback GET no mode and existing user', async () => {
    // Create a user
    const su: StravaUser = {
        id: '30',
        firstname: 'Annabelle',
        lastname: 'Johnson',
    };
    const tokens: UserTokens = {
        refreshToken: 'refreshToken',
        accessToken: 'accessToken',
        accessTokenExpiresAt: new Date(),
    };
    const user = await createUser(su, tokens);

    const params = new URLSearchParams({
        code: 'someCode',
        state: 'theState',
        scope: 'activity:read,activity:write',
        error: '',
    });

    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse({
            id: 30,
        })
    );

    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/api/strava_callback?' +
                    params.toString(),
                {
                    method: 'GET',
                    headers: {
                        Cookie: 'strava_oauth_state=theState;',
                    },
                }
            ),
        }
    );
    //console.log(response);

    expect(response.status).toBe(302);
    expect(response.statusText).toBe('');
    expect(response.headers.get('Location')).toBe('/recent');

    const updatedUser = await getUser(user.id);
    expect(updatedUser?.firstname).toBe('Annabelle');
    expect(updatedUser?.lastname).toBe('Johnson');
});

test('strava_callback GET no mode and new user', async () => {
    const params = new URLSearchParams({
        code: 'someCode',
        state: 'theState',
        scope: 'activity:read,activity:write',
        error: '',
    });

    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse({
            id: 20,
            firstname: 'Johnny',
            lastname: 'Dep',
        })
    );

    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/api/strava_callback?' +
                    params.toString(),
                {
                    method: 'GET',
                    headers: {
                        Cookie: 'strava_oauth_state=theState;',
                    },
                }
            ),
        }
    );
    //console.log(response);

    expect(response.status).toBe(302);
    expect(response.statusText).toBe('');
    expect(response.headers.get('Location')).toBe('/account');

    const updatedUser = await getUserFromStravaId(20);
    expect(updatedUser?.firstname).toBe('Johnny');
    expect(updatedUser?.lastname).toBe('Dep');
});
