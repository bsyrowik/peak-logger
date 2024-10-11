// Importing these here causes node to freak out on AWS.
//import 'http://unpkg.com/maplibre-gl@^4.7.1/dist/maplibre-gl.js';
//import 'https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.js';
//import 'https://unpkg.com/maplibre-gl@^4.7.1/dist/maplibre-gl.css';
// See this answer?
// https://stackoverflow.com/questions/73091042/importing-leaflet-into-module-from-cdn-with-typescript-support
import type * as maplibregl_t from 'maplibre-gl';
const { maplibregl } = window as unknown as { maplibregl: any };

import { getElevationInUserUnitsFromFeet } from '@util/core';
import { formatTime, niceDate } from '@util/util';
import { getDetailedActivity } from '@util/strava';
import { deserializeUser, getStravaActivity } from '@util/db';
import type { User, PeakEntry, ActivityEntry } from '@util/db';

import polyline from '@mapbox/polyline';
import type { LineString } from 'geojson';

document.addEventListener('astro:page-load', async () => {
    const mapDiv = document.querySelector<HTMLDivElement>(
        '[id="activity-map"]'
    );
    if (!mapDiv) {
        // On Astro page transitions this script seems to run when we navigate away from an activity page.
        return;
    }
    if (!mapDiv.dataset) {
        throw new Error('no mapDiv.dataset');
    }
    if (!mapDiv.dataset.user) {
        throw new Error('no mapDiv.dataset.user');
    }
    var summitedPeaks;
    if (mapDiv.dataset.summitedpeaks) {
        summitedPeaks = JSON.parse(mapDiv.dataset.summitedpeaks);
        console.log(summitedPeaks);
    }
    var nearbyPeaks;
    if (mapDiv.dataset.nearbypeaks) {
        nearbyPeaks = JSON.parse(mapDiv.dataset.nearbypeaks);
        console.log(nearbyPeaks);
    }
    //console.log(mapDiv);
    //if (mapDiv.dataset.user === undefined) { return; }
    const user: User = deserializeUser(mapDiv.dataset.user);
    const activityId = Number(mapDiv.dataset.stravaid);
    console.log(user);

    const peaksGeoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [],
    };
    if (summitedPeaks) {
        summitedPeaks.forEach((peak: PeakEntry) => {
            peaksGeoJSON.features.push({
                type: 'Feature',
                properties: {
                    name: peak.name,
                    id: peak.id,
                    elevation: getElevationInUserUnitsFromFeet(
                        user,
                        peak.elevation_feet
                    ),
                },
                geometry: {
                    type: 'Point',
                    coordinates: [peak.lon, peak.lat],
                },
            });
        });
    }

    const nearbyPeaksGeoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [],
    };
    if (nearbyPeaks) {
        nearbyPeaks.forEach((peak: PeakEntry) => {
            nearbyPeaksGeoJSON.features.push({
                type: 'Feature',
                properties: {
                    name: peak.name,
                    id: peak.id,
                    elevation: getElevationInUserUnitsFromFeet(
                        user,
                        peak.elevation_feet
                    ),
                },
                geometry: {
                    type: 'Point',
                    coordinates: [peak.lon, peak.lat],
                },
            });
        });
    }

    var myGeoJSON: LineString | undefined = undefined;

    if (user.strava_refresh_token !== null) {
        try {
            const fullActivity = await getDetailedActivity(
                Number(activityId),
                user
            );
            if (!fullActivity) {
                throw new Error("didn't get full activity");
            }
            //console.log(fullActivity);

            myGeoJSON = polyline.toGeoJSON(fullActivity.map.polyline);

            const infoTable =
                document.querySelector<HTMLDivElement>('div.activity-info');
            function addRow(a: string, b: string) {
                if (!infoTable) return;
                var s = document.createElement('div');
                s.classList.add(
                    ...'flex-none flex flex-col basis-1/2 md:basis-1/3'.split(
                        ' '
                    )
                );
                infoTable.appendChild(s);

                var d = document.createElement('div');
                d.classList.add(...'px-1 text-center text-md'.split(' '));
                d.innerHTML = a;
                s.appendChild(d);

                d = document.createElement('div');
                d.classList.add(
                    ...'px-1 text-center text-xl font-bold'.split(' ')
                );
                d.innerHTML = b;
                s.appendChild(d);
            }

            addRow('Activity', fullActivity.sport_type);
            addRow('Time', niceDate(new Date(fullActivity.start_date)));
            addRow(
                'Distance',
                Math.round(fullActivity.distance / 100) / 10 + ' km'
            );
            addRow('Elevation Gain', fullActivity.total_elevation_gain + ' m');
            addRow('Moving Time', formatTime(fullActivity.moving_time));
            addRow('Elapsed Time', formatTime(fullActivity.elapsed_time));
            addRow(
                'Average Speed',
                Math.round(fullActivity.average_speed * 36) / 10 + ' km/h'
            );
            addRow('Calories', String(fullActivity.calories));
            addRow('Device', String(fullActivity.device_name));
        } catch (e: any) {
            console.log(e);
        }
    }
    if (!myGeoJSON) {
        const activity: ActivityEntry | null = await getStravaActivity(
            user.strava_id,
            Number(activityId)
        );
        if (activity && activity.summary_polyline) {
            myGeoJSON = polyline.toGeoJSON(activity.summary_polyline);
        } else {
            console.log(activity);
            throw new Error("didn't get activity");
        }
    }

    const start = myGeoJSON.coordinates[0] as unknown as [number, number];
    console.log(start);
    console.log(myGeoJSON);

    // Define the map style (OpenStreetMap raster tiles)
    const style = {
        version: 8,
        sources: {
            osm: {
                type: 'raster',
                //"tiles": ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tiles: ['https://c.tile.opentopomap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                maxzoom: 17,
            },
        },
        layers: [
            {
                id: 'osm',
                type: 'raster',
                source: 'osm', // This must match the source key above
            },
        ],
    };

    function setupMaps() {
        const map = new maplibregl.Map({
            container: 'activity-map', // container id
            style: style as unknown as maplibregl.StyleSpecification,
            center: start,
            zoom: 10, // starting zoom
        });

        map.on('load', async () => {
            // Track
            map.addSource('route', {
                type: 'geojson',
                data: myGeoJSON,
            });
            map.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round',
                },
                paint: {
                    'line-color': '#090',
                    'line-width': 5,
                },
            });

            // Add an image to use as a custom marker
            const image = await map.loadImage(
                'https://maplibre.org/maplibre-gl-js/docs/assets/custom_marker.png'
            );
            map.addImage('custom-marker', image.data);

            const mountain = await map.loadImage('/mountain.png');
            map.addImage('mountain', mountain.data, { pixelRatio: 2.0 });

            const redCircle = await map.loadImage('/red_circle.png');
            map.addImage('redCircle', redCircle.data, { pixelRatio: 6.0 });

            // Add a GeoJSON source with 3 points.
            map.addSource('summits', {
                type: 'geojson',
                data: peaksGeoJSON,
            });

            map.addSource('nearbySummits', {
                type: 'geojson',
                data: nearbyPeaksGeoJSON,
            });

            map.addSource('start', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: [
                        {
                            type: 'Feature',
                            properties: {},
                            geometry: {
                                type: 'Point',
                                coordinates: start,
                            },
                        },
                    ],
                },
            });

            // Add a symbol layer
            map.addLayer({
                id: 'start',
                type: 'symbol',
                source: 'start',
                layout: {
                    'icon-image': 'custom-marker',
                    'icon-overlap': 'always',
                },
            });

            // Add a symbol layer
            map.addLayer({
                id: 'summits',
                type: 'symbol',
                source: 'summits',
                layout: {
                    'icon-image': 'mountain',
                    'icon-overlap': 'always',
                },
            });

            // Add a symbol layer
            map.addLayer({
                id: 'nearbySummits',
                type: 'symbol',
                source: 'nearbySummits',
                layout: {
                    'icon-image': 'redCircle',
                    'icon-overlap': 'always',
                },
            });

            // Create a popup, but don't add it to the map yet.
            const popup = new maplibregl.Popup({
                closeButton: false,
                closeOnClick: false,
            });

            map.on('mouseenter', 'nearbySummits', (e: any) => {
                // Change the cursor style as a UI indicator.
                map.getCanvas().style.cursor = 'pointer';

                const coordinates = e.features[0].geometry.coordinates.slice();
                const description =
                    '<b>' +
                    e.features[0].properties.name +
                    '</b> ' +
                    e.features[0].properties.elevation;

                // Ensure that if the map is zoomed out such that multiple
                // copies of the feature are visible, the popup appears
                // over the copy being pointed to.
                while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                    coordinates[0] +=
                        e.lngLat.lng > coordinates[0] ? 360 : -360;
                }

                // Populate the popup and set its coordinates
                // based on the feature found.
                popup.setLngLat(coordinates).setHTML(description).addTo(map);
            });

            map.on('mouseleave', 'nearbySummits', () => {
                map.getCanvas().style.cursor = '';
                popup.remove();
            });

            map.on('mouseenter', 'summits', (e: any) => {
                // Change the cursor style as a UI indicator.
                map.getCanvas().style.cursor = 'pointer';

                const coordinates = e.features[0].geometry.coordinates.slice();
                const description =
                    '<b>' +
                    e.features[0].properties.name +
                    '</b> ' +
                    e.features[0].properties.elevation;

                // Ensure that if the map is zoomed out such that multiple
                // copies of the feature are visible, the popup appears
                // over the copy being pointed to.
                while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                    coordinates[0] +=
                        e.lngLat.lng > coordinates[0] ? 360 : -360;
                }

                // Populate the popup and set its coordinates
                // based on the feature found.
                popup.setLngLat(coordinates).setHTML(description).addTo(map);
            });

            map.on('mouseleave', 'summits', () => {
                map.getCanvas().style.cursor = '';
                popup.remove();
            });
        });

        // Zoom to track bounds
        type LngLatLike = maplibregl_t.LngLatLike;
        type LngLatBounds = maplibregl_t.LngLatBounds;
        if (!myGeoJSON) return;
        const coordinates = myGeoJSON.coordinates;
        const point = coordinates[0] as unknown as [number, number];
        const bounds: LngLatBounds = coordinates.reduce(
            (bounds, coord) => {
                return bounds.extend(
                    coord as unknown as [LngLatLike, LngLatLike]
                );
            },
            new maplibregl.LngLatBounds(point, point)
        );

        function reCenter() {
            map.fitBounds(bounds as unknown as [LngLatLike, LngLatLike], {
                padding: 20,
            });
        }

        reCenter();
        const reCenterButton = document.querySelector<HTMLButtonElement>(
            'button.re-center-map'
        );
        reCenterButton?.addEventListener('click', reCenter);
    }
    try {
        setupMaps();
    } catch (e: any) {
        var script = document.querySelector('#maplibregljs');
        script?.addEventListener('load', setupMaps);
    }
});
