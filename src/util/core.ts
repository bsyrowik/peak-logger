import { actions } from 'astro:actions';
import polyline from '@mapbox/polyline';
import { along, length, pointToLineDistance } from '@turf/turf';
import type { Feature, Point, LineString } from 'geojson';

import {
    getClimber,
    addActivityAndSummits,
    updateStravaActivity,
    getStravaActivity,
    deleteUserActivity,
    getPeaks,
} from '@util/db';
import { getValidAccessToken, getDetailedActivity } from '@util/strava';
import { activityEnabledForUser } from '@util/activity';
import {
    getNearbyPeaks,
    getClimbsAlreadyLogged,
    addAscentsForClimber,
    addAscentForPeakId,
    deleteAscent,
} from '@util/peakbagger';
import type { Activity } from '@util/strava';
import type {
    PeakAnalysis,
    MinAscentInfo,
    PeakProperties,
    PeakClosenessProperties,
} from '@util/peakbagger';
import type { PeakClosenessInfo, User } from '@util/db';

import { PBAscentsArePublicName, PBPostAscentsName } from 'src/consts.ts';
import { StravaUpdateDescriptionName } from 'src/consts.ts';
import { PBRemoveAscentsName } from 'src/consts.ts';
import { DetectionRadiusName } from 'src/consts.ts';

export function getElevationInUserUnitsFromFeet(
    user: User,
    feet: number
): string {
    // FIXME: should get this from a user setting
    const metric: boolean = true;
    if (metric) {
        return Math.floor(feet / 3.280839895) + ' m';
    }
    console.log(user);
    return feet + ' ft';
}

async function updateStravaDescriptionFromPeakList(
    user: User,
    activityId: number,
    peakList: PeakClosenessInfo[]
) {
    const summitedPeaks: Feature<Point, PeakProperties>[] = [];
    const peakInfo = await getPeaks(peakList.map((peak) => peak.pid));
    peakList.forEach((peak) => {
        summitedPeaks.push({
            type: 'Feature',
            properties: {
                name: peakInfo.find((pi) => pi.id == peak.pid)?.name ?? '',
                id: peak.pid,
                elevation:
                    peakInfo.find((pi) => pi.id == peak.pid)?.elevation_feet ??
                    0,
            },
            geometry: {
                type: 'Point',
                coordinates: [0, 0],
            },
        });
    });
    const detailedActivity: Activity | null = await getDetailedActivity(
        activityId,
        user
    );
    if (!detailedActivity) {
        return false;
    }
    const accessToken = await getValidAccessToken(user);
    await updateActivityDescriptionAndTitle(
        user,
        accessToken,
        detailedActivity,
        summitedPeaks,
        true
    );
}

export async function importActivity(
    user: User,
    activityId: number,
    formData: FormData
): Promise<boolean> {
    const checkActivityType = false;
    await getPeaksBaggedForStravaActivity(
        user,
        activityId,
        checkActivityType,
        formData
    );
    return true;
}

export async function reAnalyzeActivity(
    user: User,
    activityId: number,
    formData: FormData
): Promise<boolean> {
    const activity = await getStravaActivity(user.strava_id, activityId);
    const previouslyLoggedAscents = activity?.logged_ascents;

    const checkActivityType = false;
    await getPeaksBaggedForStravaActivity(
        user,
        activityId,
        checkActivityType,
        formData
    );

    // Update PB
    const newActivity = await getStravaActivity(user.strava_id, activityId);
    const outdatedAscents = previouslyLoggedAscents?.filter(
        (previous) =>
            !newActivity?.summited_peaks.find(
                (current) => previous.pid == current.pid
            )
    );
    const removeAscentFromPB = formData.get(PBRemoveAscentsName);
    if (removeAscentFromPB && outdatedAscents && outdatedAscents.length > 0) {
        outdatedAscents.forEach(async (ascent) => {
            await deleteAscent(user, ascent.aid);
        });
    }

    return true;
}

export async function deleteActivity(
    user: User,
    activityId: number,
    formData: FormData
): Promise<boolean> {
    const activity = await getStravaActivity(user.strava_id, activityId);
    if (!activity) return false;

    // Update PB
    const removeAscentFromPB = formData.get(PBRemoveAscentsName);
    if (removeAscentFromPB) {
        activity.logged_ascents?.forEach(async (ascent) => {
            await deleteAscent(user, ascent.aid);
        });
        activity.logged_ascents = [];
    }

    // Update Strava
    const updateStrava = formData.get(StravaUpdateDescriptionName);
    if (updateStrava) {
        await updateStravaDescriptionFromPeakList(user, activityId, []);
    }

    await deleteUserActivity(user.strava_id, activityId);

    return true;
}

export async function addSummitToActivity(
    user: User,
    activityId: number,
    peakId: number,
    utcDate: number,
    formData: FormData
): Promise<boolean> {
    const activity = await getStravaActivity(user.strava_id, activityId);
    if (!activity) return false;

    const toAdd = activity.nearby_peaks.find((p) => p.pid === peakId);
    if (!toAdd) {
        return false;
    } else {
        activity.summited_peaks.push(toAdd);
        const index = activity.nearby_peaks
            .map((p) => p.pid)
            .indexOf(toAdd.pid);
        activity.nearby_peaks.splice(index, 1);
    }

    // Update PB
    const addAscentToPB = formData.get(PBPostAscentsName);
    if (addAscentToPB) {
        const isPublic = Boolean(formData.get(PBAscentsArePublicName)) ?? false;
        const ascentId = await addAscentForPeakId(
            user,
            peakId,
            new Date(utcDate),
            isPublic
        );
        if (ascentId > 0) {
            if (!activity.logged_ascents) {
                activity.logged_ascents = [];
            }
            activity.logged_ascents.push({ pid: peakId, aid: ascentId });
        }
    }

    // Update Strava
    const updateStrava = formData.get(StravaUpdateDescriptionName);
    if (updateStrava) {
        await updateStravaDescriptionFromPeakList(
            user,
            activityId,
            activity.summited_peaks
        );
    }

    // Update DB
    await updateStravaActivity(activity);

    return true;
}

export async function removeSummitFromActivity(
    user: User,
    activityId: number,
    peakId: number,
    formData: FormData
): Promise<boolean> {
    const activity = await getStravaActivity(user.strava_id, activityId);
    if (!activity) return false;

    const toRemove = activity.summited_peaks.find((p) => p.pid === peakId);
    if (!toRemove) {
        return false;
    } else {
        activity.nearby_peaks.push(toRemove);
        const index = activity.summited_peaks
            .map((p) => p.pid)
            .indexOf(toRemove.pid);
        activity.summited_peaks.splice(index, 1);
    }

    // Update PB
    const removeAscentFromPB = formData.get(PBRemoveAscentsName);
    if (removeAscentFromPB) {
        if (activity.logged_ascents) {
            const aToRemove = activity.logged_ascents.find(
                (a) => a.pid === toRemove.pid
            );
            if (aToRemove) {
                await deleteAscent(user, aToRemove.aid);
                const index = activity.logged_ascents
                    .map((a) => a.pid)
                    .indexOf(aToRemove.pid);
                activity.logged_ascents.splice(index, 1);
            }
        }
    }

    // Update Strava
    const updateStrava = formData.get(StravaUpdateDescriptionName);
    if (updateStrava) {
        await updateStravaDescriptionFromPeakList(
            user,
            activityId,
            activity.summited_peaks
        );
    }

    // Update DB
    await updateStravaActivity(activity);

    return true;
}

export async function getPeaksBaggedForStravaActivity(
    user: User,
    stravaActivityId: number,
    checkActivityType: boolean = true,
    formData: FormData | null = null
): Promise<string> {
    var overrideUpdateStrava = null;
    var overridePostToBP = null;
    var overridePBPrivate = null;
    var overrideDetectionRadius = null;
    if (formData) {
        overrideUpdateStrava = formData.get(StravaUpdateDescriptionName);
        overridePostToBP = formData.get(PBPostAscentsName);
        overridePBPrivate = formData.get(PBAscentsArePublicName);
        overrideDetectionRadius = formData.get(DetectionRadiusName);
    }

    const detailedActivity = await getDetailedActivity(stravaActivityId, user);
    if (!detailedActivity) {
        return '';
    }
    console.log(
        detailedActivity.name,
        detailedActivity.description,
        detailedActivity.sport_type
    );

    if (checkActivityType) {
        if (!activityEnabledForUser(user, detailedActivity.sport_type)) {
            console.log('activity not enabled... returning without processing');
            return '';
        }
    }

    const detectionRadius: number =
        formData && overrideDetectionRadius
            ? Number(overrideDetectionRadius)
            : user.detection_radius;
    const peaks = await getSummitedPeaks(detailedActivity, detectionRadius);
    console.log(peaks);

    const climber = getClimber(user);
    var peaksLogged: MinAscentInfo[] | null = null;
    if (climber !== null) {
        console.log(climber);
        if (formData ? overridePostToBP : user.pb_post_summits) {
            const publicPosts = formData
                ? Boolean(overridePBPrivate)
                : user.pb_ascents_are_public;
            peaksLogged = await addAscentsForClimber(
                user.id,
                climber,
                peaks.summited,
                new Date(detailedActivity.start_date),
                publicPosts
            );
        } else {
            peaksLogged = await getClimbsAlreadyLogged(
                climber,
                peaks.summited,
                new Date(detailedActivity.start_date)
            );
        }
    }

    await addActivityAndSummits(detailedActivity, peaks, peaksLogged);
    //return detailedActivity.name + "\nPeaks: " + peaks.summited.map((peak : Feature<Point, PeakProperties>) => peak.properties.name).join(', ');

    if (formData ? overrideUpdateStrava : user.strava_update_description) {
        const accessToken = await getValidAccessToken(user);
        await updateActivityDescriptionAndTitle(
            user,
            accessToken,
            detailedActivity,
            peaks.summited
        );
    }

    var ret = 'Summited peaks: ';
    peaks.summited.forEach((peak: Feature<Point, PeakProperties>) => {
        ret += '\n 🏔 ' + peak.properties.name;
    });
    console.log(ret);
    console.log('FINISHED!');
    return ret;
}

function updateDescription(
    user: User,
    description: string,
    summitedPeaks: Feature<Point, PeakProperties>[]
): string {
    const startString = 'Summited Peaks:';
    const mountainBulletSnow = '🏔 ';
    const mountainBulletBald = '⛰️  ';
    const peakloggerURL = 'https://peaklogger.app';
    const snowMountainThresholdFeet = 2000 * 3.280839895;

    var peakNames = summitedPeaks.map(
        (peak: Feature<Point, PeakProperties>) => {
            const icon =
                peak.properties.elevation > snowMountainThresholdFeet
                    ? mountainBulletSnow
                    : mountainBulletBald;
            return (
                icon +
                peak.properties.name +
                ' ' +
                getElevationInUserUnitsFromFeet(user, peak.properties.elevation)
            );
        }
    );

    const lines = description
        .trim()
        .split('\n')
        .map((s) => s.trim());
    var newLines: string[] = [];
    var strip = false;
    for (var i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line == startString) {
            strip = true;
            continue;
        }
        if (
            strip &&
            (line.startsWith(mountainBulletSnow) ||
                line.startsWith(mountainBulletBald) ||
                line.startsWith(peakloggerURL))
        ) {
            continue;
        }
        strip = false;
        newLines.push(line);
    }
    if (newLines.length > 0) {
        newLines.push('');
    }
    if (peakNames.length > 0) {
        newLines.push(startString);
        newLines.push(...peakNames);
        newLines.push(peakloggerURL);
    }
    newLines.push(''); // For some reason the web interface on Strava seems to cut off the last line?
    return newLines.join('\n');
}

export async function updateActivityDescriptionAndTitle(
    user: User,
    accessToken: string,
    activity: Activity,
    summitedPeaks: Feature<Point, PeakProperties>[],
    forceUpdate: boolean = false
): Promise<boolean> {
    console.log('updateActivityDescriptionAndTitle ');
    if (summitedPeaks.length == 0 && !forceUpdate) {
        console.log('no peaks summited - no description or title to update');
        return true;
    }
    const newDescription = updateDescription(
        user,
        activity.description,
        summitedPeaks
    );
    return await setActivityDescriptionAndTitle(
        accessToken,
        activity.id,
        newDescription,
        null
    );
}

async function setActivityDescriptionAndTitle(
    accessToken: string,
    activityId: number,
    descriptionString: string | null,
    titleString: string | null
): Promise<boolean> {
    console.log(
        'setActivityDescriptionAndTitle',
        accessToken,
        activityId,
        /*descriptionString,*/ titleString
    );
    const update: { [key: string]: string } = {};
    if (descriptionString) {
        update['description'] = descriptionString;
    }
    if (titleString) {
        update['name'] = titleString;
    }
    if (!update) {
        return true;
    }
    const stravaUpdateResponse = await fetch(
        'https://www.strava.com/api/v3/activities/' + activityId,
        {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(update),
        }
    );
    //console.log(stravaUpdateResponse);
    if (stravaUpdateResponse.status == 200) {
        return true;
    }
    return false;
}

export async function getSummitedPeaks(
    detailedActivity: Activity,
    detectionRadius: number
): Promise<PeakAnalysis> {
    console.log('getSummitedPeaks for radius', detectionRadius);

    // FIXME: use stream instead of lower-resolution polyline to detect summit!!
    const myGeoJSON: LineString = polyline.toGeoJSON(
        detailedActivity.map.polyline
    );
    var summitedPeaks: Feature<Point, PeakClosenessProperties>[] = [];
    var closePeaks: Feature<Point, PeakClosenessProperties>[] = [];
    var nearbyPeaks: { [id: number]: Feature<Point, PeakProperties> } = {};
    const lineStringAsFeature: Feature<LineString> = {
        type: 'Feature',
        geometry: myGeoJSON,
        properties: {},
    };

    var lineLength = length(lineStringAsFeature, { units: 'kilometers' });
    var distanceAlongLine = 0;
    do {
        distanceAlongLine += 10;
        var distance = Math.min(distanceAlongLine, lineLength);
        var c = along(myGeoJSON, distance, { units: 'kilometers' });

        var nearby: Feature<Point, PeakProperties>[] = [];
        const lat = c.geometry.coordinates[1],
            lon = c.geometry.coordinates[0],
            n = 30;
        if (typeof window === 'undefined') {
            nearby = await getNearbyPeaks(lat, lon, n);
        } else {
            const { data, error } = await actions.peakbagger.getNearbyPeaks({
                lat,
                lon,
                n,
            });
            if (!error && data) {
                nearby = data;
                console.log(nearby);
            }
        }
        nearby.forEach((f) => (nearbyPeaks[f.properties.id] = f));
    } while (distanceAlongLine < lineLength);

    console.log('got list of nearby peaks');

    function buildFeature(
        f: Feature<Point, PeakProperties>,
        dist: number
    ): Feature<Point, PeakClosenessProperties> {
        const a: any = f as unknown;
        a.properties.dist = dist;
        return a as unknown as Feature<Point, PeakClosenessProperties>;
    }

    Object.values(nearbyPeaks).forEach((f: Feature<Point, PeakProperties>) => {
        var p: Point = f.geometry;
        const dist = pointToLineDistance(p.coordinates, myGeoJSON, {
            units: 'meters',
        });
        console.log('distance:', dist, f.properties?.name);
        if (dist < detectionRadius) {
            console.log(' *** Summited!');
            summitedPeaks.push(buildFeature(f, dist));
        } else if (dist < 200) {
            closePeaks.push(buildFeature(f, dist));
        }
    });

    return { summited: summitedPeaks, close: closePeaks };
}
