import { vi, expect, test } from 'vitest';
import * as Endpoint from './index.ts';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

vi.mock('../../util/db');

test('strava login', async () => {
    const params = new URLSearchParams({
        mode: 'login',
        all_scope: 'add',
    });
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/pages/login/strava?' + params.toString(),
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
    expect(response.headers.get('Location')).toContain(
        'strava.com/oauth/authorize'
    );
    expect(response.headers.get('Location')).not.toContain('scope');
});

test('strava register', async () => {
    const params = new URLSearchParams({
        mode: 'register',
        all_scope: 'add',
    });
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/pages/login/strava?' + params.toString(),
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
    expect(response.headers.get('Location')).toContain(
        'strava.com/oauth/authorize'
    );
    expect(response.headers.get('Location')).toContain('scope=');
    expect(response.headers.get('Location')).toContain('activity%3Aread');
    expect(response.headers.get('Location')).toContain('activity%3Awrite');
    expect(response.headers.get('Location')).not.toContain(
        'activity%3Aread_all'
    );
});

test('strava update no read_all', async () => {
    const params = new URLSearchParams({
        mode: 'update',
        all_scope: '',
    });
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/pages/login/strava?' + params.toString(),
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
    expect(response.headers.get('Location')).toContain(
        'strava.com/oauth/authorize'
    );
    expect(response.headers.get('Location')).toContain('scope');
    expect(response.headers.get('Location')).toContain('scope=');
    expect(response.headers.get('Location')).toContain('activity%3Aread');
    expect(response.headers.get('Location')).toContain('activity%3Awrite');
    expect(response.headers.get('Location')).not.toContain(
        'activity%3Aread_all'
    );
});

test('strava update with read_all', async () => {
    const params = new URLSearchParams({
        mode: 'update',
        all_scope: 'add',
    });
    const container = await AstroContainer.create();
    const response = await container.renderToResponse(
        Endpoint as unknown as AstroComponentFactory,
        {
            routeType: 'endpoint',
            request: new Request(
                'http://localhost:4321/pages/login/strava?' + params.toString(),
                {
                    method: 'GET',
                    headers: {
                        Cookie: 'strava_oauth_state=login',
                    },
                }
            ),
            locals: {
                user: {
                    firstname: 'John',
                    lastname: 'Doe',
                    id: 199,
                },
                session: {},
            },
        }
    );
    //console.log(response);

    expect(response.status).toBe(302);
    expect(response.statusText).toBe('');
    expect(response.headers.get('Location')).toContain(
        'strava.com/oauth/authorize'
    );
    expect(response.headers.get('Location')).toContain('scope');
    expect(response.headers.get('Location')).toContain('scope=');
    expect(response.headers.get('Location')).toContain('activity%3Aread');
    expect(response.headers.get('Location')).toContain('activity%3Awrite');
    expect(response.headers.get('Location')).toContain('activity%3Aread_all');
});
