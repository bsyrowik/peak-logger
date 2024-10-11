import { vi, expect, test } from 'vitest';
import {
    getElevationInUserUnitsFromFeet,
    getSummitedPeaks,
    updateActivityDescriptionAndTitle,
} from './core';
import type { User } from './db';
import type { Activity } from './strava';
import { type PeakProperties } from './peakbagger';
import type { Feature, Point } from 'geojson';

vi.mock('../../util/db');

global.fetch = vi.fn();
function createFetchResponse200(data: any) {
    return { status: 200, text: () => new Promise((resolve) => resolve(data)) };
}

test('units', () => {
    const user = {
        id: 28,
    };

    expect(getElevationInUserUnitsFromFeet(user as unknown as User, 123)).toBe(
        '37 m'
    );
});

test('updateDescription success 1', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(createFetchResponse200('OK'));

    const user = {
        id: 28,
        strava_id: 7,
    };

    const activity = {
        description: 'Some activity',
        id: 182920,
    };

    const summitedPeaks: Feature<Point, PeakProperties>[] = [
        {
            type: 'Feature',
            properties: {
                id: 8,
                name: 'Stunning Peak',
                prominence: 999,
                elevation: 1907,
            },
            geometry: {
                type: 'Point',
                coordinates: [1, 2],
            },
        },
    ];

    const result = await updateActivityDescriptionAndTitle(
        user as unknown as User,
        'accessToken',
        activity as unknown as Activity,
        summitedPeaks,
        true
    );
    expect(result).toBe(true);

    expect(myFetch.mock.lastCall).not.toBe(undefined);
    expect(myFetch.mock.lastCall[0]).toContain('/activities/' + activity.id);
    expect(myFetch.mock.lastCall[1].hasOwnProperty('body')).toBe(true);
    expect(myFetch.mock.lastCall[1].body).toContain('Stunning Peak');
    expect(myFetch.mock.lastCall[1].body).toContain(activity.description);
});

test('updateDescription success 2', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(createFetchResponse200('OK'));

    const user = {
        id: 28,
        strava_id: 7,
    };

    const activity = {
        description: '',
        id: 182920,
    };

    const summitedPeaks: Feature<Point, PeakProperties>[] = [
        {
            type: 'Feature',
            properties: {
                id: 8,
                name: 'Stunning Peak',
                prominence: 999,
                elevation: 1907,
            },
            geometry: {
                type: 'Point',
                coordinates: [1, 2],
            },
        },
    ];

    const result = await updateActivityDescriptionAndTitle(
        user as unknown as User,
        'accessToken',
        activity as unknown as Activity,
        summitedPeaks,
        true
    );
    expect(result).toBe(true);

    expect(myFetch.mock.lastCall).not.toBe(undefined);
    expect(myFetch.mock.lastCall[0]).toContain('/activities/' + activity.id);
    expect(myFetch.mock.lastCall[1].hasOwnProperty('body')).toBe(true);
    expect(myFetch.mock.lastCall[1].body).toContain('Stunning Peak');
    expect(myFetch.mock.lastCall[1].body).toContain(activity.description);
});

test('updateDescription success 3', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(createFetchResponse200('OK'));

    const user = {
        id: 28,
        strava_id: 7,
    };

    const activity = {
        description:
            'Original description\nSummited Peaks:\n⛰️  Some other peak\n🏔  Boring Peak\nmore content below\neven here\n',
        id: 182920,
    };

    const summitedPeaks: Feature<Point, PeakProperties>[] = [
        {
            type: 'Feature',
            properties: {
                id: 8,
                name: 'Stunning Peak',
                prominence: 999,
                elevation: 1907,
            },
            geometry: {
                type: 'Point',
                coordinates: [1, 2],
            },
        },
        {
            type: 'Feature',
            properties: {
                id: 8,
                name: 'Astounding Peak',
                prominence: 999,
                elevation: 7000,
            },
            geometry: {
                type: 'Point',
                coordinates: [1, 2],
            },
        },
    ];

    const result = await updateActivityDescriptionAndTitle(
        user as unknown as User,
        'accessToken',
        activity as unknown as Activity,
        summitedPeaks,
        true
    );
    expect(result).toBe(true);

    expect(myFetch.mock.lastCall).not.toBe(undefined);
    expect(myFetch.mock.lastCall[0]).toContain('/activities/' + activity.id);
    expect(myFetch.mock.lastCall[1].hasOwnProperty('body')).toBe(true);
    expect(myFetch.mock.lastCall[1].body).toContain('Stunning Peak');
    expect(myFetch.mock.lastCall[1].body).toContain('Astounding Peak');
    expect(myFetch.mock.lastCall[1].body).not.toContain('Some other peak');
    expect(myFetch.mock.lastCall[1].body).toContain('Summited Peaks:');
    expect(myFetch.mock.lastCall[1].body).toContain('peaklogger.app');
});

test('updateDescription success 4', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(createFetchResponse200('OK'));

    const user = {
        id: 28,
        strava_id: 7,
    };

    const activity = {
        description: '',
        id: 182920,
    };

    const summitedPeaks: Feature<Point, PeakProperties>[] = [];

    const result = await updateActivityDescriptionAndTitle(
        user as unknown as User,
        'accessToken',
        activity as unknown as Activity,
        summitedPeaks,
        false
    );
    expect(result).toBe(true);
});

var points: Feature<Point, PeakProperties>[] = [];
points.push({
    type: 'Feature',
    properties: {
        name: 'Cathedral Mountain',
        id: 66078,
        elevation: 5699,
    },
    geometry: { type: 'Point', coordinates: [-123.008636, 49.466852] },
});
points.push({
    type: 'Feature',
    properties: {
        name: 'Coliseum Mountain',
        id: 97061,
        elevation: 4728,
    },
    geometry: { type: 'Point', coordinates: [-123.006921, 49.433864] },
});
points.push({
    type: 'Feature',
    properties: {
        name: 'Mount Burwell',
        id: 879,
        elevation: 5056,
    },
    geometry: { type: 'Point', coordinates: [-123.015197, 49.442617] },
});

vi.mock(import('./peakbagger.ts'), async (importOriginal) => {
    const mod = await importOriginal(); // type is inferred
    return {
        ...mod,
        getNearbyPeaks: async () => {
            return points;
        },
    };
});

test('getSummitedPeaks', async () => {
    const activity = {
        map: {
            polyline:
                'oislH`msmVi@rBkFdEqAnF}BzA@r@mAoA{BbBwBaCkANyA]w@yDaCvAiCRmAu@Ms@eAGa@kA}@`BeAaCw@?Uz@aDt@}@`CWhFq@kAo@~@GnBcA[HfAa@bA_AV}@dE{BxDPdFRdAoAtFrA~@~@fCNvEgAfECbEvAHPrBj@?MpC^h@c@lAdDHnArC{Bn@kBjAm@`CXb@aBxAGvAu@e@`Bj@Kn@uAz@MlAgAlAmADuDnDaArEr@`CgDlDUjBqBr@UfAuCnB{DTcBdD_DpBAjCgB`C}IJ}At@WdAoBdAeAbCgBhAQbAsAaBwDoAeAsBqBo@o@ZA`AgDb@If@qC`@jAfA{@p@\No@t@NVgFwCYvAi@D?|@{@f@UEb@oASm@eBtDNaC[FkD`FsBrF_Cl@eAjBm@Z}BR[r@}BkAaDEmDjAsA`A_@lBg@PyDwB_@lCuBf@mGcFiAwD_CuBsC_K_Dp@oBa@wHrEiECWa@f@cAwAyAn@uAQeBeBy@@gAgA}BZkA_@cBc@G]gCKwAXU_@IDuAg@g@dAq@cAi@CkA{@KQyBg@}Ay@}@j@Vy@KzApAv@`EdBnBk@z@`@f@T|AMfB~AzFl@bGpBhAGjBe@t@~ArB]~@jEXhIyE`G?pCrJbA`B`CpC|BzARvAvAzApAT`@u@f@HVcCrEhBn@sBxFiCtEA~AhA`AgApADNs@`@Xp@aBh@t@fDqEdAeDnCeEf@ON~@dAsBPfBl@RGeALk@dDGbDbDrBIrEnDz@yAbIbF`B]dAjDGr@j@]Xj@u@|BDvD\b@Wx@jB~DUtB\zA~@h@aB_CD}CiAsC[eBRcEWaAh@wAgD_HC_Ad@k@lAvCuAkGG{Bt@yAfCoDrEmEvB{@tDnAbAYnCkELgBhBuAfB}CjE_@^eBpAHlAmBtAa@`AgDrBmBE}AhBeFd@I?mAr@{AhAKjAoA`@oB|A{@{@WD_AvAoBp@yDrAw@dCi@{AsBwCg@\y@[aAXaCy@EMqBuA?HwAYq@nA{FD}DeAeDqAkAx@kFSsATeAqA_GGaBk@Sa@iBX_An@w@Et@`Dp@nCaAd@{B`AGI}A^m@~@dAd@}Gj@sAhDaAr@_AlBzBx@qAJbAt@ApBxBp@o@dBPtB}Ab@Rj@~CpDLjBnBxCwAb@vAr@wAd@Xx@oAD{Ah@WEyA~AaC|CwAl@oCTFSG',
        },
    };
    const detectionRadius = 4;

    const result = await getSummitedPeaks(
        activity as unknown as Activity,
        detectionRadius
    );
    expect(result.close[0].properties.name).toBe('Mount Burwell');
    expect(result.summited[0].properties.name).toBe('Coliseum Mountain');
});
