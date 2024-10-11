import { Bitfield } from '@util/bitfield';
import { type User } from '@util/db';

export enum ActivityType {
    /* ***IMPORTANT*** Append to END!! Otherwise the indices of existing activities in DB will be corrupted. */
    AlpineSki = 0,
    BackcountrySki,
    EBikeRide,
    EMountainBikeRide,
    GravelRide,
    Handcycle,
    Hike,
    MountainBikeRide,
    NordicSki,
    Ride,
    RockClimbing,
    RollerSki,
    Run,
    Skateboard,
    Snowboard,
    Snowshoe,
    TrailRun,
    Walk,
}

export function prettyName(name: string): string {
    return name.split(/(?=[A-Z])/).join(' ');
}

export function getPrettyActivityList(enabledActivities: number): string[] {
    const bf = new Bitfield(enabledActivities);

    const activityList = [];
    for (var key in ActivityType) {
        if (typeof Number(key) === 'number') {
            if (bf.get(Number(key))) {
                if (typeof ActivityType[key] === 'string') {
                    activityList.push(prettyName(ActivityType[key]));
                }
            }
        }
    }
    console.log(activityList);
    return activityList;
}

export function activityEnabledForUser(user: User, activity: string): boolean {
    return activityEnabled(user.enabled_activities, activity);
}

export function activityEnabled(
    enabledActivities: number,
    activity: string
): boolean {
    const bf = new Bitfield(enabledActivities);

    const at2 = Object.entries(ActivityType).find((e) => e[0] === activity);
    if (at2 === undefined) {
        //console.log("Strava sport type ", activity, "is unknown");
        return false;
    }
    const at = Number(at2[1]);
    if (bf.get(at)) {
        return true;
    }
    return false;
}
