import { Strava } from 'arctic';

//const baseURL = import.meta.env.PROD ? "https://dmmpn9w1fio7q.cloudfront.net/" : "http://localhost:4321/";
const baseURL = import.meta.env.PROD
    ? 'https://peaklogger.app/'
    : 'http://localhost:4321/';
const redirectURI = baseURL + 'api/strava_callback';
console.log('Providing Strava redirectURI:', redirectURI);
console.log('Strava client ID:', import.meta.env.STRAVA_CLIENT_ID);
console.log('Strava client secret:', import.meta.env.STRAVA_CLIENT_SECRET);

export const strava = new Strava(
    import.meta.env.STRAVA_CLIENT_ID,
    import.meta.env.STRAVA_CLIENT_SECRET,
    redirectURI
);
