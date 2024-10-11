import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import StravaActivitySummaryCard from './StravaActivitySummaryCard.astro';

test('StravaActivitySummaryCard with polyline and imported', async () => {
    const container = await AstroContainer.create();
    const activity = {
        sport_type: 'Hike',
        id: 192928,
        name: 'Morning Hike',
        start_date_local: new Date(2022, 3, 19),
        map: {
            summary_polyline:
                'w~hlHfllmVqBzAsGDqCcAmF{EqAsF_AQ_Av@aCyAo@mDo@{@gAvAs@@cEhEkEo@aFqDiBiCBi@{AuAc@iA}@uIaAiBwAp@qA~BaALqBa@oBcCuGVu@qAm@y@k@g@Lc@q@uDwA}@[iC}Ad@gC_CmAeCBa@kBgDCi@y@g@a@kBPyBx@cBiAC_@aAs@Ei@~@s@H}EUm@t@B\Dk@_@XE}@YNCq@U@\oA[MDcAqBKqA~BGw@Sh@?a@KTa@aCFoBc@g@VoA]_ABoAw@wBn@kBe@gAXy@O_CuAyAiAfAe@_BJkBm@cBcA_@KeBw@yAPgAEiBv@c@JWNjAMeA_Ab@C`C[\GfAt@d@b@r@Ah@b@LdAfBZbFf@?`@y@bBlABnBW`Ad@v@?|@a@jAv@pBMhATnBQt@\JTfCIjAVjAkBxIk@rEkCr@{FyA}@Rs@]wCcEyDyDyBaE{BuFWiBi@eADc@e@{@gEaC[k@Du@mAi@mAxCBdBc@~AFt@oBxGg@Rt@fBgAnEc@@OzAa@t@_@CEjBq@|@i@hCuCzFAz@o@Xo@nDi@Re@jCuAFiBlCy@Og@nBN`@KXVg@v@`Bv@DLr@x@|@H|@ROj@t@tAFf@{@v@G\n@lAe@`@f@~AXvAo@fBAv@|AxApAHx@XZItAjAt@rBQN|@~@\Zp@zCVU_@\cBr@cA@k@fAkA|@Cg@wAp@uD]s@v@yCRAa@gALa@YLFOSILCmA[Bg@a@[wBl@pAq@Ln@Od@TgAPG@h@Va@`@xA`A^j@~Ai@d@DvCgAnEkAvBJLcA~B_@f@LNS^OnD~@ZHzBf@h@bCrG`@@DkAbBzAm@JPqA[q@~AoBZ@h@`ANzA|AP\aA|@mApAq@Gy@r@Y`@_@j@oFZY`@uBP}CVsCbALxB|Bn@y@lCeAzEkFBq@nBoB^qG\q@Kq@RyDXyAIyEbAoAMk@Ju@V{@|@m@bCv@dAfDzDbHz@r@pB]T~BzAtA\|COf@V~@vAt@`@|@nDC|A[tCnCrCZl@[v@yBbAe@d@r@vAjK`@|@dB~AvAvCtFnE~Eb@lD}Dz@ErAmAv@rBVnBhC`Bz@s@v@FZb@r@rEfCdB`BrBzFdAtDMtB_B',
        },
    };
    const imported = 1;
    const result = await container.renderToString(StravaActivitySummaryCard, {
        props: {
            activity,
            imported,
        },
        locals: {
            user: {
                firstname: 'John',
                lastname: 'Doe',
            },
            session: {},
        },
    });

    //console.log(result);

    expect(result).toContain('sport_type_Hike');
    expect(result).toContain('Morning Hike');
    expect(result).toContain('Apr 19, 2022, 12:00 a.m.');
    expect(result).toContain('strava.com/activities/' + activity.id);
    expect(result).toContain('/activity/' + activity.id);
    expect(result).toContain('>View</button>');
    expect(result).toContain('map-expand-div');
    expect(result).toContain('data-map-polyline');
});

test('StravaActivitySummaryCard with polyline and not imported', async () => {
    const container = await AstroContainer.create();
    const activity = {
        sport_type: 'Hike',
        id: 192928,
        name: 'Morning Hike',
        start_date_local: new Date(2022, 3, 19),
        map: {
            summary_polyline:
                'w~hlHfllmVqBzAsGDqCcAmF{EqAsF_AQ_Av@aCyAo@mDo@{@gAvAs@@cEhEkEo@aFqDiBiCBi@{AuAc@iA}@uIaAiBwAp@qA~BaALqBa@oBcCuGVu@qAm@y@k@g@Lc@q@uDwA}@[iC}Ad@gC_CmAeCBa@kBgDCi@y@g@a@kBPyBx@cBiAC_@aAs@Ei@~@s@H}EUm@t@B\Dk@_@XE}@YNCq@U@\oA[MDcAqBKqA~BGw@Sh@?a@KTa@aCFoBc@g@VoA]_ABoAw@wBn@kBe@gAXy@O_CuAyAiAfAe@_BJkBm@cBcA_@KeBw@yAPgAEiBv@c@JWNjAMeA_Ab@C`C[\GfAt@d@b@r@Ah@b@LdAfBZbFf@?`@y@bBlABnBW`Ad@v@?|@a@jAv@pBMhATnBQt@\JTfCIjAVjAkBxIk@rEkCr@{FyA}@Rs@]wCcEyDyDyBaE{BuFWiBi@eADc@e@{@gEaC[k@Du@mAi@mAxCBdBc@~AFt@oBxGg@Rt@fBgAnEc@@OzAa@t@_@CEjBq@|@i@hCuCzFAz@o@Xo@nDi@Re@jCuAFiBlCy@Og@nBN`@KXVg@v@`Bv@DLr@x@|@H|@ROj@t@tAFf@{@v@G\n@lAe@`@f@~AXvAo@fBAv@|AxApAHx@XZItAjAt@rBQN|@~@\Zp@zCVU_@\cBr@cA@k@fAkA|@Cg@wAp@uD]s@v@yCRAa@gALa@YLFOSILCmA[Bg@a@[wBl@pAq@Ln@Od@TgAPG@h@Va@`@xA`A^j@~Ai@d@DvCgAnEkAvBJLcA~B_@f@LNS^OnD~@ZHzBf@h@bCrG`@@DkAbBzAm@JPqA[q@~AoBZ@h@`ANzA|AP\aA|@mApAq@Gy@r@Y`@_@j@oFZY`@uBP}CVsCbALxB|Bn@y@lCeAzEkFBq@nBoB^qG\q@Kq@RyDXyAIyEbAoAMk@Ju@V{@|@m@bCv@dAfDzDbHz@r@pB]T~BzAtA\|COf@V~@vAt@`@|@nDC|A[tCnCrCZl@[v@yBbAe@d@r@vAjK`@|@dB~AvAvCtFnE~Eb@lD}Dz@ErAmAv@rBVnBhC`Bz@s@v@FZb@r@rEfCdB`BrBzFdAtDMtB_B',
        },
    };
    const imported = undefined;
    const result = await container.renderToString(StravaActivitySummaryCard, {
        props: {
            activity,
            imported,
        },
        locals: {
            user: {
                firstname: 'John',
                lastname: 'Doe',
            },
            session: {},
        },
    });

    //console.log(result);

    expect(result).toContain('sport_type_Hike');
    expect(result).toContain('Morning Hike');
    expect(result).toContain('Apr 19, 2022, 12:00 a.m.');
    expect(result).toContain('strava.com/activities/' + activity.id);
    expect(result).not.toContain('/activity/' + activity.id);
    expect(result).not.toContain('>View</button>');
    expect(result).toContain('>Import</button>');
    expect(result).toContain('map-expand-div');
    expect(result).toContain('data-map-polyline');
});

test('StravaActivitySummaryCard no polyline not imported', async () => {
    const container = await AstroContainer.create();
    const activity = {
        sport_type: 'Hike',
        id: 192928,
        name: 'Morning Hike',
        start_date_local: new Date(2022, 3, 19),
        map: {
            summary_polyline: '',
        },
    };
    const imported = undefined;
    const result = await container.renderToString(StravaActivitySummaryCard, {
        props: {
            activity,
            imported,
        },
        locals: {
            user: {
                firstname: 'John',
                lastname: 'Doe',
            },
            session: {},
        },
    });

    //console.log(result);

    expect(result).toContain('sport_type_Hike');
    expect(result).toContain('Morning Hike');
    expect(result).toContain('Apr 19, 2022, 12:00 a.m.');
    expect(result).toContain('strava.com/activities/' + activity.id);
    expect(result).not.toContain('/activity/' + activity.id);
    expect(result).not.toContain('>View</button>');
    expect(result).not.toContain('>Import</button>');
    expect(result).not.toContain('map-expand-div');
    expect(result).not.toContain('data-map-polyline');
});

test('StravaActivitySummaryCard no polyline and imported', async () => {
    const container = await AstroContainer.create();
    const activity = {
        sport_type: 'Hike',
        id: 192928,
        name: 'Morning Hike',
        start_date_local: new Date(2022, 3, 19),
        map: {
            summary_polyline: '',
        },
    };
    const imported = 1;
    const result = await container.renderToString(StravaActivitySummaryCard, {
        props: {
            activity,
            imported,
        },
        locals: {
            user: {
                firstname: 'John',
                lastname: 'Doe',
            },
            session: {},
        },
    });

    //console.log(result);

    expect(result).toContain('sport_type_Hike');
    expect(result).toContain('Morning Hike');
    expect(result).toContain('Apr 19, 2022, 12:00 a.m.');
    expect(result).toContain('strava.com/activities/' + activity.id);
    expect(result).toContain('/activity/' + activity.id);
    expect(result).toContain('>View</button>');
    expect(result).not.toContain('>Import</button>');
    expect(result).not.toContain('map-expand-div');
    expect(result).not.toContain('data-map-polyline');
});
