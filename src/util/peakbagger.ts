import { XMLParser } from 'fast-xml-parser';
import type { Feature, Point } from 'geojson';
import type { User } from '@util/db';
import { getClimber } from '@util/db';
import { actions } from 'astro:actions';

import { sha256 } from '@oslojs/crypto/sha2';
import { encodeHexLowerCase, decodeHex } from '@oslojs/encoding';

const xmlParserOptions = {
    ignoreAttributes: false,
    attributeNamePrefix: '',
};
let xmlParser = new XMLParser(xmlParserOptions);

let base_url = 'https://peakbagger.com/m';

export interface PeakAnalysis {
    summited: Feature<Point, PeakClosenessProperties>[];
    close: Feature<Point, PeakClosenessProperties>[];
}

type PeakAscentRaw = {
    i: string; // index
    n: string; // name
    f: string; // elevation
    z: string; // lat
    o: string; // lon
    t: string;
    v: string;
    r: string;
    s: string;
    l: string;
    d: string; // date
    a: string; // ascent ID
    lkvp: string;
};

type PeakRaw = {
    i: string; // index
    n: string; // name
    f: string; // elevation
    a: string; // lat
    o: string; // lon
    t?: string; // total ascents
    v?: string; // my ascent count
    r?: string; // prominence
    s?: string; // true isolation (km)
    l?: string; // location
    lkvp?: string; // link map
};

export interface PeakProperties {
    name: string;
    id: number;
    elevation: number;
    prominence?: number;
}

export interface PeakClosenessProperties extends PeakProperties {
    dist: number;
}

export interface PeakAscentProperties {
    name: string;
    id: number;
    elevation: number;
    date: Date;
    ascent_id: number;
}

export interface MinAscentInfo {
    pid: number; // Peak ID
    aid: number; // Ascent ID
}

interface LoginInfo {
    cid: number;
    username: string;
    unit: string;
}

export interface Climber {
    id: number;
    email: string;
    password: string;
}

function getSubtle() {
    if (typeof window === 'undefined') {
        // Node.js
        return globalThis.crypto.subtle;
    } else {
        return window.crypto.subtle;
    }
}

export function extractParamValue(lines: string[], re: RegExp) {
    const line = lines.find((value) => re.test(value)) ?? '';
    const fields = line.split(' ');
    const valuefield = fields.find((param) => /^value=/.test(param)) ?? '';
    const parts = valuefield.split('"');
    if (parts.length > 1) {
        return parts[1];
    }
    return undefined;
}

export function extractSpanValueFromId(lines: string[], re: RegExp) {
    const line = lines.find((value) => re.test(value)) ?? '';
    const parts = line.split('>');
    if (parts.length > 1 && parts[1]) {
        const value = parts[1].split('<');
        if (value.length > 0) {
            return value[0];
        }
    }
    return undefined;
}

export async function encryptPassword(
    userId: number,
    password: string
): Promise<string> {
    const subtle = getSubtle();
    const encoder = new TextEncoder();
    const k = sha256(encoder.encode(String(userId)));
    const key = await subtle.importKey('raw', k, 'AES-GCM', true, [
        'encrypt',
        'decrypt',
    ]);
    const e = await subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: k,
        },
        key,
        encoder.encode(password)
    );
    return encodeHexLowerCase(new Uint8Array(e));
}

export async function decryptPassword(
    userId: number,
    cyphertext: string
): Promise<string> {
    const subtle = getSubtle();
    const encoder = new TextEncoder();
    const k = sha256(encoder.encode(String(userId)));
    const key = await subtle.importKey('raw', k, 'AES-GCM', true, [
        'encrypt',
        'decrypt',
    ]);
    const ab = decodeHex(cyphertext);
    const d = await subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: k,
        },
        key,
        ab
    );
    return new TextDecoder().decode(d);
}

export async function tryLogin(
    userId: number,
    email: string,
    password: string
): Promise<LoginInfo> {
    var get_response = await fetch(base_url + '/li.aspx');
    if (get_response.status != 200) {
        throw new Error('Login failed.  Peakbagger.com may be down?');
    }

    var viewstate =
        '/wEPDwUJNTg0NDYzMTQzZGSHFUVJR90VyVuHvb4QKwuNU7nduF0Am9L0lR8a5FkTfQ==';
    var eventvalidation =
        '/wEdAAQPX9e0DDynqvFpdIaCSzAn3OGoFV0wH4BWjvO52fnz3QvRV/VOrSgH88movR/T2mHE4QaA3nzH6Y5iPnzUbEGLgbL59aP18T91RX+SER90DcrgBYesaZubuUUtQBLv2Dc=';

    const text = await get_response.text();
    const input_tags = text.split('\n').filter((line) => /<input/.test(line));
    viewstate = extractParamValue(input_tags, /__VIEWSTATE/) ?? viewstate;
    eventvalidation =
        extractParamValue(input_tags, /__EVENTVALIDATION/) ?? eventvalidation;

    const login_params = new URLSearchParams({
        __VIEWSTATE: String(viewstate),
        __EVENTVALIDATION: String(eventvalidation),
        email: String(email),
        pwd: await decryptPassword(userId, password),
    });

    var post_response = await fetch(base_url + '/li.aspx', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: login_params,
    });

    const post_text = await post_response.text();
    const post_lines = post_text.split('\n');
    const spans = post_lines.filter((line) => /<span/.test(line));

    const cid = Number(extractSpanValueFromId(spans, /cid/));
    const username = extractSpanValueFromId(spans, /username/) ?? '';
    const unit = extractSpanValueFromId(spans, /unit/) ?? '';

    if (!cid || cid == 0) {
        throw new Error(
            'Not able to login.  Double-check your email address and password.'
        );
    }
    return { cid, username, unit };
}

export async function deleteAscent(
    user: User,
    ascentId: number
): Promise<boolean> {
    if (typeof window === 'undefined') {
        const climber = getClimber(user);
        if (!climber) return false;
        return await deleteAscentServer(user.id, climber, ascentId);
    } else {
        const { data, error } = await actions.peakbagger.deleteUserAscent({
            ascentId,
        });
        if (!error && data) {
            return data;
        }
        return false;
    }
}

export async function deleteAscentServer(
    userId: number,
    climber: Climber,
    ascentId: number
): Promise<boolean> {
    var get_response = await fetch(base_url + '/ad.aspx');
    if (get_response.status != 200) {
        throw new Error('Login failed.  Peakbagger.com may be down?');
    }

    var viewstate =
        '/wEPDwUJNTg0NDYzMTQzZGSHFUVJR90VyVuHvb4QKwuNU7nduF0Am9L0lR8a5FkTfQ==';
    var eventvalidation =
        '/wEdAAQPX9e0DDynqvFpdIaCSzAn3OGoFV0wH4BWjvO52fnz3QvRV/VOrSgH88movR/T2mHE4QaA3nzH6Y5iPnzUbEGLgbL59aP18T91RX+SER90DcrgBYesaZubuUUtQBLv2Dc=';

    const text = await get_response.text();
    const input_tags = text.split('\n').filter((line) => /<input/.test(line));
    viewstate = extractParamValue(input_tags, /__VIEWSTATE/) ?? viewstate;
    eventvalidation =
        extractParamValue(input_tags, /__EVENTVALIDATION/) ?? eventvalidation;

    const body = new URLSearchParams({
        __VIEWSTATE: String(viewstate),
        __EVENTVALIDATION: String(eventvalidation),
        pwd: await decryptPassword(userId, climber.password),
        submit: 'Submit',
        email: climber.email,
        aid: String(ascentId),
    });
    console.log(body);

    var response = await fetch(base_url + '/ad.aspx', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
    });
    if (response.status != 200) {
        console.log(
            'Posting ascent to Peakbagger.com was not successful:',
            response
        );
        return false;
    }
    try {
        const text = await response.text();
        console.log(text);
        const lines = text.split('\n');
        const rcLine = lines.filter((l) => l.includes('id="rc"'))[0];
        const rc = rcLine.split('>')[1].split('<')[0];
        return Boolean(rc);
    } catch (e: any) {
        console.error(e);
        return false;
    }
}

export async function addAscent(
    userId: number,
    climber: Climber,
    dateString: string,
    peakId: number,
    tripReport: string,
    isPublic: boolean
): Promise<number> {
    console.log('public?', isPublic);
    const body = new URLSearchParams({
        pwd: await decryptPassword(userId, climber.password),
        gf: '000000000000000',
        submit: 'Submit',
        gx: '',
        tr: tripReport,
        __VIEWSTATE:
            '/wEPDwUJNTg0NDYzMTQzZGSHFUVJR90VyVuHvb4QKwuNU7nduF0Am9L0lR8a5FkTfQ==',
        email: climber.email,
        ds: '',
        rf: '000000000000000',
        pid: String(peakId),
        d: dateString,
        at: 'S',
        ...(!isPublic && { v: '0' }),
    });
    //console.log(body);
    /*
            <span id="rc" name="rc">2695889</span>

            <input name="email" type="text" id="email" name="email" />
            <input name="pwd" type="password" id="pwd" name="pwd" />
            <input name="pid" type="text" id="pid" name="pid" />
            <input name="d" type="text" id="d" name="d" />
            <textarea name="tr" rows="2" cols="20" id="tr" name="tr"> </textarea>
            <input name="sef" type="text" id="sef" name="sef" />
            <input name="rf" type="text" id="rf" name="rf" />
            <input name="gf" type="text" id="gf" name="gf" />
            <input name="ds" type="text" id="ds" name="ds" />
            <textarea name="gx" rows="2" cols="20" id="gx" name="gx"> </textarea>
            <input name="du" type="text" id="du" name="du" />
            <input name="dd" type="text" id="dd" name="dd" />
            <input name="at" type="text" id="at" name="at" />
            <input name="er" type="text" id="er" name="er" />

            <!-- Starting point -->
            <input name="sp" type="text" id="sp" name="sp" />

            <!-- Route up -->
            <input name="ru" type="text" id="ru" name="ru" />

            <!-- Extra gain up -->
            <input name="gu" type="text" id="gu" name="gu" />

            <!-- Machine to summit -->
            <input name="ms" type="text" id="ms" name="ms" />

            <!-- Machine to trailhead -->
            <input name="mt" type="text" id="mt" name="mt" />

            <!-- Minutes up -->
            <input name="mu" type="text" id="mu" name="mu" />

            <!-- Minutes down -->
            <input name="md" type="text" id="md" name="md" />

            <!-- Others in party -->
            <input name="op" type="text" id="op" name="op" />

            <!-- Solo -->
            <input name="so" type="text" id="so" name="so" />

            <!-- Only party on mountain -->
            <input name="oy" type="text" id="oy" name="oy" />

            <!-- Ascent is visible to others -->
            <input name="v" type="text" value="0" id="v" name="v" />
*/
    //console.log(body);

    var response = await fetch(base_url + '/asc.aspx?aid=0', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
    });
    if (response.status != 200) {
        console.log(
            'Posting ascent to Peakbagger.com was not successful:',
            response
        );
        return 0;
    }
    try {
        const text = await response.text();
        //console.log(text);
        const lines = text.split('\n');
        const rcLine = lines.filter((l) => l.includes('id="rc"'))[0];
        const rc = rcLine.split('>')[1].split('<')[0];
        return Number(rc);
    } catch (e: any) {
        console.error(e);
        return 0;
    }
}

async function getClimberAscents(
    climber: Climber
): Promise<Feature<Point, PeakAscentProperties>[]> {
    var peaksClimbedByUser: Feature<Point, PeakAscentProperties>[] = [];
    if (typeof window === 'undefined') {
        peaksClimbedByUser = await getClimbedPeaks(climber);
    } else {
        const { data, error } = await actions.peakbagger.getUserAscents();
        if (!error && data) {
            peaksClimbedByUser = data;
            peaksClimbedByUser.forEach(
                (f) => (f.properties.date = new Date(f.properties.date))
            );
        }
    }
    return peaksClimbedByUser;
}

async function getClimberAscentsForDate(
    climber: Climber,
    date: Date
): Promise<MinAscentInfo[]> {
    var peaksClimbedByUser: Feature<Point, PeakAscentProperties>[] =
        await getClimberAscents(climber);
    const climbedPeaksOnDateFull = peaksClimbedByUser.filter(
        (f: Feature<Point, PeakAscentProperties>) => {
            //console.log(f.properties.date.getFullYear(), date.getFullYear(), f.properties.date.getDate(), date.getDate(), f.properties.date.getMonth(), date.getMonth());
            return (
                f.properties.date.getFullYear() == date.getFullYear() &&
                f.properties.date.getDate() == date.getDate() &&
                f.properties.date.getMonth() == date.getMonth()
            );
        }
    );
    //console.log("logged peaks climbed on ", date, ": ",  climbedPeaksOnDateFull);
    const climbedPeaksOnDate: MinAscentInfo[] = climbedPeaksOnDateFull.map(
        (f: Feature<Point, PeakAscentProperties>) => {
            return { pid: f.properties.id, aid: f.properties.ascent_id };
        }
    );
    return climbedPeaksOnDate;
}

export async function getClimbsAlreadyLogged(
    climber: Climber,
    climbedPeaks: Feature<Point, PeakProperties>[],
    date: Date
): Promise<MinAscentInfo[]> {
    const climbedPeaksOnDate: MinAscentInfo[] = await getClimberAscentsForDate(
        climber,
        date
    );
    return climbedPeaksOnDate.filter(
        (p) =>
            climbedPeaks.find(
                (f: Feature<Point, PeakProperties>) => f.properties.id === p.pid
            ) !== undefined
    );
}

export async function addAscentForPeakId(
    user: User,
    peakId: number,
    date: Date,
    isPublic: boolean
): Promise<number> {
    const climber = getClimber(user);
    if (!climber) return 0;
    const climbedPeaks: Feature<Point, PeakClosenessProperties>[] = [
        {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [0, 0],
            },
            properties: {
                dist: 0,
                name: '',
                id: peakId,
                elevation: 0,
            },
        },
    ];
    const loggedAscents = await addAscentsForClimber(
        user.id,
        climber,
        climbedPeaks,
        date,
        isPublic
    );
    console.log('loggedAscents:', loggedAscents);
    if (loggedAscents.length > 0) {
        return loggedAscents[0].aid;
    }
    return 0;
}

export async function addAscentsForClimber(
    userId: number,
    climber: Climber,
    climbedPeaks: Feature<Point, PeakClosenessProperties>[],
    date: Date,
    isPublic: boolean
): Promise<MinAscentInfo[]> {
    console.log('Trying to update peaks climbed on', date, '...');
    const climbedPeaksOnDate: MinAscentInfo[] = await getClimberAscentsForDate(
        climber,
        date
    );
    var loggedAscents: MinAscentInfo[] = climbedPeaksOnDate.filter((p) =>
        climbedPeaks.find(
            (f: Feature<Point, PeakProperties>) => f.properties.id === p.pid
        )
    );
    const toUpdate: Feature<Point, PeakProperties>[] = climbedPeaks.filter(
        (f: Feature<Point, PeakProperties>) =>
            !climbedPeaksOnDate.find((p) => p.pid === f.properties.id)
    );
    //console.log("new peaks to log:", toUpdate);

    const dateString: string =
        date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    //console.log(dateString);

    var success = true;
    const tripReport: string = ''; // TODO: link to strava if the strava activity share mode is 'Everyone'
    for (var i = 0; i < toUpdate.length; i++) {
        const f = toUpdate[i];
        var ascentId: number = 0;
        const peakId = f.properties.id;
        if (typeof window === 'undefined') {
            ascentId = await addAscent(
                userId,
                climber,
                dateString,
                peakId,
                tripReport,
                isPublic
            );
        } else {
            const { data, error } = await actions.peakbagger.addUserAscent({
                peakId,
                dateString,
                tripReport,
                isPublic,
            });
            if (!error && data) {
                ascentId = data;
            }
        }
        if (ascentId) {
            //console.log("got ascent ID:", ascentId);
            loggedAscents.push({ pid: f.properties.id, aid: ascentId });
        }
        success = success && ascentId > 0;
    }
    console.log('done');
    return loggedAscents;
}

export async function getClimbedPeaks(
    climber: Climber
): Promise<Feature<Point, PeakAscentProperties>[]> {
    var query = new URLSearchParams({
        pn: 'APIGetAscents',
        p1: String(climber.id),
        p2: '1',
        p3: 'en',
        p4: '0',
        p5: String(climber.id),
    }).toString();

    console.log(query);

    var climbedPeaks: PeakAscentRaw[] = await fetch(
        base_url + '/pt.ashx?' + query
    )
        .then((response) => {
            try {
                return response.text();
            } catch (e) {
                console.log(e);
                return '';
            }
        })
        .then((response) => {
            //console.log(response);
            try {
                return xmlParser.parse(response);
            } catch (e) {
                console.log(e);
                return {};
            }
        })
        .then((data) => {
            //console.log("Returned data:");
            //console.log(data.pb.r);
            //console.log("\n");
            try {
                if (Array.isArray(data.pb.r)) {
                    return data.pb.r;
                } else {
                    return [data.pb.r];
                }
            } catch (e) {
                console.log(e);
                return [];
            }
        });

    var points: Feature<Point, PeakAscentProperties>[] = [];
    climbedPeaks.forEach((p) => {
        const date = new Date(p.d.split(' ')[0]);
        date.setUTCHours(7); // FIXME: this is a hack to get this date into PST
        //console.log(date, date.getTime());
        points.push({
            type: 'Feature',
            properties: {
                name: p.n,
                id: Number(p.i),
                elevation: Number(p.f),
                date: date,
                ascent_id: Number(p.a),
            },
            geometry: {
                type: 'Point',
                coordinates: [Number(p.o), Number(p.z)],
            },
        });
    });

    //console.log(points.slice(0, 4));

    return points;
}

export async function getNearbyPeaks(
    lat: number,
    lon: number,
    n: number
): Promise<Feature<Point, PeakProperties>[]> {
    console.log('get peaks near', lat, lon);
    var query = new URLSearchParams({
        pn: 'APIGetNearbyPeaks',
        p1: String(lat), // lat
        p2: String(lon), // lon
        p3: '0', // climber id
        p4: '1', // provisional peaks: 0=exclude, 1=include, 2=only
        p5: '0', // exclude peaks climbed by me (1)
        p9: '0', // 1 = only peaks on a list
        p10: '0', // ascents: 0=with and without, 1=only with, 2=only without
        p6: '-32000', // min elevation (feet)
        p11: '32000', // max elevation (feet)
        p7: '0', // min prominence (feet)
        p8: String(n), // number of peaks to return
        p12: "'en'", // lang
        p13: '0', // 1=only peaks with tracks
        p14: '0', // 1=list peaks of any prominence
        p15: "''", // ?
        p16: '0', // include personal lists as listed peaks
        p17: '0.0', // isolation (km)
    }).toString();

    console.log(query);

    var nearbyPeaks: PeakRaw[] = await fetch(base_url + '/pt.ashx?' + query)
        .then((response) => {
            //console.log(response);
            try {
                return response.text();
            } catch (e) {
                console.log(e);
                return '';
            }
        })
        .then((response) => {
            //console.log(response);
            try {
                return xmlParser.parse(response);
            } catch (e) {
                console.log(e);
                return {};
            }
        })
        .then((data) => {
            //console.log("Returned data:");
            //console.log(data.pb.r);
            //console.log("\n");
            try {
                if (Array.isArray(data.pb.r)) {
                    return data.pb.r;
                } else {
                    return [data.pb.r];
                }
            } catch (e) {
                console.log(e);
                console.log(data);
                return [];
            }
        });

    var points: Feature<Point, PeakProperties>[] = [];
    nearbyPeaks.forEach((p) => {
        points.push({
            type: 'Feature',
            properties: {
                name: p.n,
                id: Number(p.i),
                elevation: Number(p.f),
                ...(p.hasOwnProperty('r') && { prominence: Number(p.r) }),
                /*ascents: Number(p.t), // (optional), count */
                /*location: String(p.l), // Canada-BC */
                /*true_isolation: Number(p.s), // (optional) km */
                /*my_ascents_count: Number(p.v), // (optional), count */
            },
            geometry: {
                type: 'Point',
                coordinates: [Number(p.o), Number(p.a)],
            },
        });
    });

    //console.log(nearbyPeaks);

    return points;
}
