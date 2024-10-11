import { expect, expectTypeOf, test, vi } from 'vitest';
import {
    addAscent,
    addAscentForPeakId,
    decryptPassword,
    deleteAscent,
    encryptPassword,
    extractParamValue,
    extractSpanValueFromId,
    getClimbedPeaks,
    getClimbsAlreadyLogged,
    getNearbyPeaks,
    tryLogin,
    type Climber,
    type PeakProperties,
} from './peakbagger';
import type { Feature, Point } from 'geojson';
import type { User } from './db';

const climber: Climber = {
    id: 7,
    email: 'a@b.c',
    password: 'encryptedPassword',
};

global.fetch = vi.fn();
function createFetchResponse(data: any) {
    return { text: () => new Promise((resolve) => resolve(data)) };
}
function createFetchResponse200(data: any) {
    return { status: 200, text: () => new Promise((resolve) => resolve(data)) };
}

test('encrypt/decrypt password', async () => {
    const pwd = 'thePassword123';
    const userId = 42;
    const encrypted = await encryptPassword(userId, pwd);
    const decrypted = await decryptPassword(userId, encrypted);

    expect(encrypted).not.toBe(pwd);
    expect(decrypted).toBe(pwd);
});

test('extractSpanValue success', () => {
    const regex = /username/;
    expect(
        extractSpanValueFromId(['<span id="username">Amy Lo</span>'], regex)
    ).toEqual('Amy Lo');
    expect(extractSpanValueFromId(['<span id="username"></span>'], regex)).toBe(
        ''
    );
});

test('extractSpanValue failure', () => {
    const regex = /username/;
    expect(extractSpanValueFromId(['<span id="">Amy Lo</span>'], regex)).toBe(
        undefined
    );
    expect(extractSpanValueFromId(['username invalid'], regex)).toBe(undefined);
    expect(
        extractSpanValueFromId(['<span id="username"Amy Lo</span'], regex)
    ).toBe(undefined);
    expect(
        extractSpanValueFromId(['<span id="username"Amy Lo</span>'], regex)
    ).toBe(undefined);
});

test('extractParamValue success', () => {
    const lines = ['<input name="__VIEWSTATE" value="someString"></input>'];
    const regex = /__VIEWSTATE/;
    expect(extractParamValue(lines, regex)).toBe('someString');
});

test('extractParamValue failures', () => {
    const regex = /__VIEWSTATE/;
    expect(extractParamValue([], regex)).toBe(undefined);
    expect(extractParamValue(['someString'], regex)).toBe(undefined);
    expect(extractParamValue(['value=someString'], regex)).toBe(undefined);
    expect(extractParamValue(['value="someString"'], regex)).toBe(undefined);
    expect(extractParamValue(['__VIEWSTATE value=someString'], regex)).toBe(
        undefined
    );
    expect(extractParamValue(['__VIEWSTATE someString'], regex)).toBe(
        undefined
    );
});

test('login bad response', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(createFetchResponse('something'));

    const password = await encryptPassword(28, 'password');

    try {
        await tryLogin(28, 'a@b.c', password);
    } catch (e: any) {
        console.log(e);
        expect(e.message).toContain('may be down');
    }
});

test('login bad credentials', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(createFetchResponse200('something'));

    const password = await encryptPassword(28, 'password');

    try {
        await tryLogin(28, 'a@b.c', password);
    } catch (e: any) {
        console.log(e);
        expect(e.message).toContain('Not able to login');
    }
});

test('login good', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValueOnce(
        createFetchResponse200(
            '<input name="__VIEWSTATE" value="viewState"/>\n<input name="__EVENTVALIDATION" value="eventValidation"/>'
        )
    );
    myFetch.mockResolvedValueOnce(
        createFetchResponse200(
            '<span id="cid">22</span>\n<span id="username">Anna Jones</span>\n<span id="units">m</span>'
        )
    );

    const password = await encryptPassword(28, 'password');

    const loginInfo = await tryLogin(28, 'a@b.c', password);
    expect(loginInfo.cid).toBe(22);
    expect(loginInfo.username).toBe('Anna Jones');
    expect(loginInfo.unit).toBe('m');

    expect(myFetch.mock.lastCall).not.toBe(undefined);
    expect(myFetch.mock.lastCall[0]).toContain('li.aspx');
    expect(myFetch.mock.lastCall[1].hasOwnProperty('body')).toBe(true);
    expect(myFetch.mock.lastCall[1].body.toString()).toContain('password');
    expect(myFetch.mock.lastCall[1].body.toString()).toContain('viewState');
    expect(myFetch.mock.lastCall[1].body.toString()).toContain(
        'eventValidation'
    );
    expect(myFetch.mock.lastCall[1].body.toString()).toContain('a%40b.c');
});

test('getAlreadyClimbed', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse(
            '<pb><r n="Peak 1" i="18" f="20" o="122.1" z="38.2" a="19" d="2022-4-17 a" /><r n="Peak 2" i="19" f="21" o="123.2" z="39.3" a="20" d="2023-4-17 a" /></pb>'
        )
    );

    const p1: Feature<Point, PeakProperties> = {
        type: 'Feature',
        properties: {
            id: 19,
            name: 'Peak 2',
            elevation: 20,
        },
        geometry: {
            type: 'Point',
            coordinates: [10, 20],
        },
    };

    const p2: Feature<Point, PeakProperties> = {
        type: 'Feature',
        properties: {
            id: 18,
            name: 'Peak 2',
            elevation: 20,
        },
        geometry: {
            type: 'Point',
            coordinates: [10, 20],
        },
    };

    const alreadyLogged1 = await getClimbsAlreadyLogged(
        climber,
        [p1],
        new Date(2023, 3, 17)
    );
    expect(alreadyLogged1).toEqual([{ aid: 20, pid: 19 }]);

    const alreadyLogged2 = await getClimbsAlreadyLogged(
        climber,
        [p2],
        new Date(2022, 3, 17)
    );
    expect(alreadyLogged2).toEqual([{ aid: 19, pid: 18 }]);

    const alreadyLogged3 = await getClimbsAlreadyLogged(
        climber,
        [p1],
        new Date(2020, 3, 17)
    );
    expect(alreadyLogged3).toEqual([]);

    const alreadyLogged4 = await getClimbsAlreadyLogged(
        climber,
        [],
        new Date(2020, 3, 17)
    );
    expect(alreadyLogged4).toEqual([]);
});

test('deleteAscent success', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse200('<span id="rc">true</span>')
    );

    const userId = 28;
    climber.password = await encryptPassword(userId, 'password');

    const user = {
        id: userId,
        peakbagger_id: 17,
        pb_email: 'a@b.c',
        pb_password: climber.password,
    };

    const result = await deleteAscent(user as unknown as User, 222);
    expect(result).toBe(true);
});

test('addAscent success', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse200('<span id="rc">222</span>')
    );

    const userId = 28;
    const peakId = 17;
    climber.password = await encryptPassword(userId, 'password');

    const result = await addAscent(
        userId,
        climber,
        '2024-04-20',
        peakId,
        '',
        true
    );
    expect(result).toBe(222);
    expect(myFetch.mock.lastCall).not.toBe(undefined);
    expect(myFetch.mock.lastCall[0]).toContain('asc.aspx');
    expect(myFetch.mock.lastCall[1].body.toString()).toContain('password');
    expect(myFetch.mock.lastCall[1].body.toString()).toContain('pid=' + peakId);
});

test('getNearbyPeaks bad response 1', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(createFetchResponse('something'));

    const nearby = await getNearbyPeaks(1, 2, 3);
    expect(nearby).toEqual([]);
});

test('getNearbyPeaks bad response 2', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(null);

    const nearby = await getNearbyPeaks(1, 2, 3);
    expect(nearby).toEqual([]);
});

test('getNearbyPeaks bad response 3', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(createFetchResponse('<malformed'));

    const nearby = await getNearbyPeaks(1, 2, 3);
    expect(nearby).toEqual([]);
});

test('getNearbyPeaks missing name', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse(
            '<pb><r i="25" f="30" r="8" o="122.128" a="48.213" /></pb>'
        )
    );

    const nearby = await getNearbyPeaks(1, 2, 3);
    expect(nearby.length).toBe(1);

    // FIXME: should we filter out bad results returned by PB?
});

test('getNearbyPeaks success 1', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse(
            '<pb><r n="name1" i="25" f="30" r="8" o="122.128" a="48.213" /></pb>'
        )
    );

    const nearby = await getNearbyPeaks(1, 2, 3);
    expect(nearby.length).toBe(1);
    expect(nearby[0].type).toBe('Feature');
    expect(nearby[0].properties.name).toBe('name1');
    expect(nearby[0].properties.elevation).toBe(30);
    expect(nearby[0].properties.id).toBe(25);
    expect(nearby[0].properties.prominence).toBe(8);
});

test('getNearbyPeaks success 2', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse(
            '<pb><r n="name1" i="25" f="30" r="8" o="122.128" a="48.213" /><r n="name2" i="25" f="30" o="120.128" a="49.213"/></pb>'
        )
    );

    const nearby = await getNearbyPeaks(1, 2, 3);
    expect(nearby.length).toBe(2);

    expect(nearby[0].type).toBe('Feature');
    expect(nearby[0].properties.name).toBe('name1');
    expect(nearby[0].properties.elevation).toBe(30);
    expect(nearby[0].properties.id).toBe(25);
    expect(nearby[0].properties.prominence).toBe(8);
    expect(nearby[0].geometry.coordinates.at(0)).toBe(122.128);
    expect(nearby[0].geometry.coordinates.at(1)).toBe(48.213);

    expect(nearby[1].properties.name).toBe('name2');
    expect(nearby[1].properties.prominence).toBe(undefined);
});

test('getClimbedPeaks bad response 1', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(createFetchResponse('something'));

    const nearby = await getClimbedPeaks(climber);
    expect(nearby).toEqual([]);
});

test('getClimbedPeaks bad response 2', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(null);

    const nearby = await getClimbedPeaks(climber);
    expect(nearby).toEqual([]);
});

test('getClimbedPeaks bad response 3', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(createFetchResponse('<malformed'));

    const nearby = await getClimbedPeaks(climber);
    expect(nearby).toEqual([]);
});

test('getClimbedPeaks success 1', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse(
            '<pb><r n="Peak 1" i="18" f="20" o="122.1" z="38.2" a="19" d="2022-4-17 a" /></pb>'
        )
    );

    const climbed = await getClimbedPeaks(climber);
    //console.log(climbed);
    expect(climbed.length).toBe(1);
    expect(climbed[0].properties.name).toBe('Peak 1');
    expect(climbed[0].properties.elevation).toBe(20);
    expect(climbed[0].properties.id).toBe(18);
    expect(climbed[0].geometry.coordinates.at(0)).toBe(122.1);
    expect(climbed[0].geometry.coordinates.at(1)).toBe(38.2);
    expectTypeOf(climbed[0].properties.date).toMatchTypeOf(new Date());
});

test('getClimbedPeaks success 2', async () => {
    const myFetch = global.fetch as any;
    myFetch.mockResolvedValue(
        createFetchResponse(
            '<pb><r n="Peak 1" i="18" f="20" o="122.1" z="38.2" a="19" d="2022-4-17 a" /><r n="Peak 2" i="19" f="21" o="123.2" z="39.3" a="20" d="2023-4-17 a" /></pb>'
        )
    );

    const climbed = await getClimbedPeaks(climber);
    //console.log(climbed);
    expect(climbed.length).toBe(2);
    expect(climbed[0].properties.name).toBe('Peak 1');
    expect(climbed[0].properties.elevation).toBe(20);
    expect(climbed[0].properties.id).toBe(18);
    expect(climbed[0].geometry.coordinates.at(0)).toBe(122.1);
    expect(climbed[0].geometry.coordinates.at(1)).toBe(38.2);
    expectTypeOf(climbed[0].properties.date).toMatchTypeOf(new Date());
});

test('addAscentForPeakId', async () => {
    const myFetch = global.fetch as any;
    myFetch
        .mockResolvedValue(createFetchResponse200('<span id="rc">true</span>'))
        .mockResolvedValueOnce(
            createFetchResponse(
                '<pb><r n="Peak 1" i="18" f="20" o="122.1" z="38.2" a="19" d="2022-4-17 a" /><r n="Peak 2" i="19" f="21" o="123.2" z="39.3" a="20" d="2023-4-17 a" /></pb>'
            )
        )
        .mockResolvedValueOnce(
            createFetchResponse200('<span id="rc">1234</span>')
        );

    const userId = 28;
    climber.password = await encryptPassword(userId, 'password');

    const user = {
        id: userId,
        peakbagger_id: 17,
        pb_email: 'a@b.c',
        pb_password: climber.password,
    };

    const result = await addAscentForPeakId(
        user as unknown as User,
        88,
        new Date(),
        true
    );
    expect(result).toEqual(1234);
});
