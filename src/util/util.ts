export function niceDate(date: Date): string {
    const localeDateOptions: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Vancouver', // FIXME: should come from a user setting, or from the strava activity itself
    };
    return date.toLocaleDateString('en-CA', localeDateOptions);
}

export function formatTime(seconds: number): string {
    const h = Math.round(seconds / 3600);
    const m = Math.round(seconds / 60) % 60;
    const s = seconds % 60;
    return (
        (h ? h + ':' : '') +
        String(m).padStart(2, '0') +
        ':' +
        String(s).padStart(2, '0')
    );
}
