import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import ActivityCard from './ActivityCard.astro';
import type { PeakEntry } from '@util/db';

test('ActivityCard', async () => {
    const container = await AstroContainer.create();
    const activity = {
        id: 188181,
        name: 'Morning Hike',
        sport_type: 'Hike',
        start_date: new Date(),
        summary_polyline:
            'yrkmH`ueoVzBpGvB~Cu@_E~@Da@wFrAj@t@xDn@XQ]j@gAWsAl@UA{@bBl@jBgEpCHtCvCdB?cAkBiAcPlEfBKeBsAsCOwDmAaDa@mGFaAj@AhBfBa@_IwBeGwB}@WgCkCiBuC{JRaBZw@p@YSoCp@Y^{CU_Lb@mAj@LM_@z@_@aAgF{AmME_Fu@wDHoFu@o@e@{Gs@u@k@{CX}@vA]QaDz@Fi@g@dAf@nBcA\e@?wEfCb@rA_CMv@Tm@jEGtHvBXc@Pn@hD]vA`A_@KJf@dAr@{@Hd@Qk@BEv@hH~Gp@lDlBjDpBpC_@BpATpA~An@zAzBXTlB`JdCXi@a@g@Pu@IiBk@yDp@iA[cAh@_Ac@y@pAiAbAPEw@jASr@gB|BKa@qDh@U]WDuBvAgBi@kDDgA_CeB[qBdCkBt@{EbAcBGqBiAmF_AKf@GWk@Zs@MkBhABg@yCu@q@z@oAE_Bp@_AoBsG_BkC[aDyAw@cDsHcGuAsCyGeIZuC|AyCgAeFDw@aA@dCgClDEvCwA?eApA]]]bAuAFY|Bs@DLrAgAlAw@Sv@Hz@aAPo@[k@v@Ol@aChC_@P{@nAu@p@Vt@uEzAa@DiEbAlAfDVf@q@zAjAfNwBnBxA`@vBx@fA~HxC`BhFZK`AjBf@iAfABHkBdFvBb@c@S}D_@COqBxBc@JmC`Bu@xDuEfFaCb@aCj@YZsB_B{AHsCEvCl@xBb@r@_B~DeA|AY_@{CjAkEjFsATJjAeBlBG|Al@jAZpDbAj@El@bC~AbAGrAzAjCbEVxCpA`@lAeALx@j@BhAfBfAdEEv@|@TlAzCr@bHfChFx@xAlAHpAzBk@hD@Vt@jAYv@hErC`Cm@pDhDOfA_Ax@EnA]JPTmEzA_@z@jAvA{@t@uBk@_CbCMhBL~@\d@c@vC~@dHkBpBYvBm@Xk@z@|@jB?bDv@tDkAvDDxD~@rGe@\?dAqAvCMbCyBjAE~Fm@n@FnFSdAaBNMnDTHc@xBk@Pa@hEfBrLS~CfA~E[`Cr@r@b@hDF`BeA~C^bE}AxAqE~BqCPwDvBuBkC_CtAiETeGw@qC|BsG}AgBnGoAsAw@{EwAaA|@vBq@bD?hCaCPkB|AgAcF_FGsFkBoC}BgCm@gDgDmDc@G|@aBFgEgD{AAcCvEsA{@BfAi@AZtAa@zBuBwDaA}@h@zCGfAq@O\rEqEyJ',
    };
    const summitedPeaks: PeakEntry[] = [
        {
            name: 'Some Peak',
            id: 298,
            elevation_feet: 292,
            lat: 112.12,
            lon: 49.2,
        },
    ];

    const result = await container.renderToString(ActivityCard, {
        props: { activity, summitedPeaks },
    });

    //console.log(result);

    expect(result).toContain('Morning Hike');
    expect(result).toContain('Some Peak');
    expect(result).toContain('api.mapbox.com');
    expect(result).toContain('(49.2,112.12)');
});

test('ActivityCard no peaks', async () => {
    const container = await AstroContainer.create();
    const activity = {
        id: 188181,
        name: 'Morning Hike',
        sport_type: 'Hike',
        start_date: new Date(),
        summary_polyline:
            'yrkmH`ueoVzBpGvB~Cu@_E~@Da@wFrAj@t@xDn@XQ]j@gAWsAl@UA{@bBl@jBgEpCHtCvCdB?cAkBiAcPlEfBKeBsAsCOwDmAaDa@mGFaAj@AhBfBa@_IwBeGwB}@WgCkCiBuC{JRaBZw@p@YSoCp@Y^{CU_Lb@mAj@LM_@z@_@aAgF{AmME_Fu@wDHoFu@o@e@{Gs@u@k@{CX}@vA]QaDz@Fi@g@dAf@nBcA\e@?wEfCb@rA_CMv@Tm@jEGtHvBXc@Pn@hD]vA`A_@KJf@dAr@{@Hd@Qk@BEv@hH~Gp@lDlBjDpBpC_@BpATpA~An@zAzBXTlB`JdCXi@a@g@Pu@IiBk@yDp@iA[cAh@_Ac@y@pAiAbAPEw@jASr@gB|BKa@qDh@U]WDuBvAgBi@kDDgA_CeB[qBdCkBt@{EbAcBGqBiAmF_AKf@GWk@Zs@MkBhABg@yCu@q@z@oAE_Bp@_AoBsG_BkC[aDyAw@cDsHcGuAsCyGeIZuC|AyCgAeFDw@aA@dCgClDEvCwA?eApA]]]bAuAFY|Bs@DLrAgAlAw@Sv@Hz@aAPo@[k@v@Ol@aChC_@P{@nAu@p@Vt@uEzAa@DiEbAlAfDVf@q@zAjAfNwBnBxA`@vBx@fA~HxC`BhFZK`AjBf@iAfABHkBdFvBb@c@S}D_@COqBxBc@JmC`Bu@xDuEfFaCb@aCj@YZsB_B{AHsCEvCl@xBb@r@_B~DeA|AY_@{CjAkEjFsATJjAeBlBG|Al@jAZpDbAj@El@bC~AbAGrAzAjCbEVxCpA`@lAeALx@j@BhAfBfAdEEv@|@TlAzCr@bHfChFx@xAlAHpAzBk@hD@Vt@jAYv@hErC`Cm@pDhDOfA_Ax@EnA]JPTmEzA_@z@jAvA{@t@uBk@_CbCMhBL~@\d@c@vC~@dHkBpBYvBm@Xk@z@|@jB?bDv@tDkAvDDxD~@rGe@\?dAqAvCMbCyBjAE~Fm@n@FnFSdAaBNMnDTHc@xBk@Pa@hEfBrLS~CfA~E[`Cr@r@b@hDF`BeA~C^bE}AxAqE~BqCPwDvBuBkC_CtAiETeGw@qC|BsG}AgBnGoAsAw@{EwAaA|@vBq@bD?hCaCPkB|AgAcF_FGsFkBoC}BgCm@gDgDmDc@G|@aBFgEgD{AAcCvEsA{@BfAi@AZtAa@zBuBwDaA}@h@zCGfAq@O\rEqEyJ',
    };
    const summitedPeaks: PeakEntry[] = [];

    const result = await container.renderToString(ActivityCard, {
        props: { activity, summitedPeaks },
    });

    //console.log(result);

    expect(result).toContain('Morning Hike');
    expect(result).toContain('api.mapbox.com');
    expect(result).not.toContain('Some Peak');
    expect(result).not.toContain('(49.2,112.12)');
    expect(result).not.toContain('pin-s-mountain');
});

test('ActivityCard no map', async () => {
    const container = await AstroContainer.create();
    const activity = {
        id: 188181,
        name: 'Morning Hike',
        sport_type: 'Hike',
        start_date: new Date(),
        summary_polyline: '',
    };
    const summitedPeaks: PeakEntry[] = [
        {
            name: 'Some Peak',
            id: 298,
            elevation_feet: 292,
            lat: 112.12,
            lon: 49.2,
        },
    ];

    const result = await container.renderToString(ActivityCard, {
        props: { activity, summitedPeaks },
    });

    //console.log(result);

    expect(result).toContain('Morning Hike');
    expect(result).toContain('Some Peak');
    expect(result).not.toContain('api.mapbox.com');
    expect(result).not.toContain('(49.2,112.12)');
});
