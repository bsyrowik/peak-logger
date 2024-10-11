import { vi, expect, test } from 'vitest';
import * as Endpoint from './strava_webhook.ts';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

vi.mock('../../util/db');

const token = Endpoint.VERIFY_TOKEN;
const challengeString = 'myChallengeString';

test('strava_webhook GET success', async () => {
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/api/strava_webhook?hub.mode=subscribe&hub.verify_token=' +
                    token +
                    '&hub.challenge=' +
                    challengeString,
                {
                    method: 'GET',
                }
            ),
        }
    );

    expect(response.status).toBe(200);
    expect(response.statusText).toBe('');
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const json = await response.json();
    expect(json['hub.challenge']).toBe(challengeString);
});

test('strava_webhook GET mode missing', async () => {
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/api/strava_webhook?hub.mode=&hub.verify_token=' +
                    token +
                    '&hub.challenge=' +
                    challengeString,
                {
                    method: 'GET',
                }
            ),
        }
    );

    expect(response.status).toBe(404);
    expect(response.statusText).toBe('Not Found');
});

test('strava_webhook GET mode wrong', async () => {
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/api/strava_webhook?hub.mode=invalid&hub.verify_token=' +
                    token +
                    '&hub.challenge=' +
                    challengeString,
                {
                    method: 'GET',
                }
            ),
        }
    );

    expect(response.status).toBe(403);
    expect(response.statusText).toBe('Forbidden');
});

test('strava_webhook GET token missing', async () => {
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/api/strava_webhook?hub.mode=subscribe&hub.verify_token=' +
                    '&hub.challenge=' +
                    challengeString,
                {
                    method: 'GET',
                }
            ),
        }
    );

    expect(response.status).toBe(404);
    expect(response.statusText).toBe('Not Found');
});

test('strava_webhook GET token wrong', async () => {
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/api/strava_webhook?hub.mode=subscribe&hub.verify_token=' +
                    token.substring(5) +
                    'hub.challenge=' +
                    challengeString,
                {
                    method: 'GET',
                }
            ),
        }
    );

    expect(response.status).toBe(403);
    expect(response.statusText).toBe('Forbidden');
});

import * as DB from '@util/db.ts';
import { createUser, type StravaUser, type Tokens } from '@lib/server/user.ts';
import * as Core from '@util/core';

test('strava_webhook POST not an activity', async () => {
    const spy = vi.spyOn(DB, 'getUserFromStravaId');
    const data = {
        aspect_type: 'update',
        event_time: 1729060046,
        object_id: 10103382,
        object_type: 'profile',
        owner_id: 2219191,
        subscription_id: 7,
        updates: { title: 'Morning Hike' },
    };
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request('http://localhost:4321/api/strava_webhook', {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        }
    );

    expect(response.status).toBe(200);

    const text = await response.text();
    expect(text).toBe('EVENT_RECEIVED');

    expect(spy).not.toHaveBeenCalled();
});

test('strava_webhook POST bad user', async () => {
    const spy = vi.spyOn(DB, 'getUserFromStravaId');
    const data = {
        aspect_type: 'update',
        event_time: 1729060046,
        object_id: 10103382,
        object_type: 'activity',
        owner_id: 0,
        subscription_id: 7,
        updates: { title: 'Morning Hike' },
    };
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request('http://localhost:4321/api/strava_webhook', {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        }
    );

    expect(response.status).toBe(200);

    const text = await response.text();
    expect(text).toBe('EVENT_RECEIVED');

    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(0);
    expect(spy).toHaveResolvedWith(null);
});

test('strava_webhook POST good user', async () => {
    // Create a user
    const su: StravaUser = {
        id: '17',
        firstname: 'Jane',
        lastname: 'Smith',
    };
    const tokens: Tokens = {
        refreshToken: 'refreshToken',
        accessToken: 'accessToken',
        accessTokenExpiresAt: new Date(),
    };
    const user = await createUser(su, tokens);

    // Spy on called functions
    const getUserSpy = vi.spyOn(DB, 'getUserFromStravaId');
    const coreSpy = vi.spyOn(Core, 'getPeaksBaggedForStravaActivity');

    // Set up mocks
    vi.mock(import('../../util/core.ts'), async (importOriginal) => {
        const mod = await importOriginal();
        return {
            ...mod,
            getPeaksBaggedForStravaActivity: async () => {
                return 'blah';
            },
        };
    });

    // Run
    const data = {
        aspect_type: 'update',
        event_time: 1729060046,
        object_id: 101,
        object_type: 'activity',
        owner_id: 17,
        subscription_id: 7,
        updates: { title: 'Morning Hike' },
    };
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request('http://localhost:4321/api/strava_webhook', {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        }
    );
    const responseText = await response.text();

    // Check
    expect(response.status).toBe(200);
    expect(responseText).toBe('EVENT_RECEIVED');

    expect(getUserSpy).toHaveBeenCalled();
    expect(getUserSpy).toHaveBeenCalledWith(17);
    expect(getUserSpy).toHaveResolvedWith(user);

    expect(coreSpy).toHaveBeenCalled();
    expect(coreSpy).toHaveBeenCalledWith(user, 101);
    expect(coreSpy).toHaveResolvedWith('blah');
});
