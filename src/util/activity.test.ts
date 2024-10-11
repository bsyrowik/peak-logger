import { expect, test } from 'vitest';
import {
    activityEnabled,
    activityEnabledForUser,
    ActivityType,
    getPrettyActivityList,
    prettyName,
} from '@util/activity';
import type { User } from './db';

test('prettyName', () => {
    expect(prettyName('GravelRide')).toBe('Gravel Ride');
    expect(prettyName('Run')).toBe('Run');
    expect(prettyName('run')).toBe('run');
    expect(prettyName('EBikeRide')).toBe('E Bike Ride');
});

test('getPrettyActivityList', () => {
    expect(
        getPrettyActivityList(
            (1 << ActivityType.AlpineSki) | (1 << ActivityType.BackcountrySki)
        )
    ).toEqual(['Alpine Ski', 'Backcountry Ski']);
    expect(getPrettyActivityList(1 << ActivityType.BackcountrySki)).toEqual([
        'Backcountry Ski',
    ]);
});

test('activityEnabledForUser', () => {
    const u = {
        enabled_activities: 1 << ActivityType.Hike,
    };
    expect(activityEnabledForUser(u as unknown as User, 'AlpineSki')).toBe(
        false
    );
    expect(activityEnabledForUser(u as unknown as User, 'Hike')).toBe(true);
    expect(activityEnabledForUser(u as unknown as User, 'Walk')).toBe(false);
});

test('activityEnabled', () => {
    expect(activityEnabled(1 << ActivityType.Hike, 'AlpineSki')).toBe(false);
    expect(activityEnabled(1 << ActivityType.Hike, 'Hike')).toBe(true);
    expect(activityEnabled(1 << ActivityType.Hike, 'Run')).toBe(false);
    expect(activityEnabled(1 << ActivityType.Hike, 'Walk')).toBe(false);
    expect(activityEnabled(0x3ffff, 'AlpineSki')).toBe(true);
    expect(activityEnabled(0x3ffff, 'Run')).toBe(true);
    expect(activityEnabled(0x3ffff, 'Walk')).toBe(true);
    expect(activityEnabled(0x1ffff, 'Walk')).toBe(false);
});
