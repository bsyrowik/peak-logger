import { expect, test } from 'vitest';
import { strava } from '@lib/server/oauth';

test('strava', async () => {
    const url = await strava.createAuthorizationURL('state', {});
    expect(url.searchParams.get('redirect_uri')).toBe(
        'http://localhost:4321/api/strava_callback'
    );
});
