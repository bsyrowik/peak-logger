export enum StravaScope {
    read = 0,
    read_all,
    profile_read_all,
    profile_write,
    activity_read,
    activity_read_all,
    activity_write,
}

export const stringToStravaScope: { [scope: string]: StravaScope } = {
    read: StravaScope.read,
    read_all: StravaScope.read_all,
    'profile:read_all': StravaScope.profile_read_all,
    'profile:write': StravaScope.profile_write,
    'activity:read': StravaScope.activity_read,
    'activity:read_all': StravaScope.activity_read_all,
    'activity:write': StravaScope.activity_write,
};
