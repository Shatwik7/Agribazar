mapboxgl.accessToken = mapToken;

const map = new mapboxgl.Map({
    container: 'cluster-map',
    style: 'mapbox://styles/mapbox/outdoors-v11',
    center: [79.63857396297851, 22.09543025085631],
    zoom: 3
});

map.addControl(new mapboxgl.NavigationControl());

let sourceAdded = false;

document.getElementById('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const address = document.getElementById('address').value;
    const radius = document.getElementById('radius').value;

    try {
        const response = await axios.post('/product/map/data', { address, radius });

        const data = response.data;
        updateMap(data.objectsWithGeometry);
    } catch (error) {
        console.error('Error fetching data:', error);
        alert(error.response?.data?.error || 'Failed to fetch data. Please try again.');
    }
});

document.getElementById('clearBtn').addEventListener('click', () => {
    document.getElementById('searchForm').reset();
});

function updateMap(objectsWithGeometry) {
    const geojson = { type: 'FeatureCollection', features: objectsWithGeometry };

    if (sourceAdded) {
        map.getSource('farms').setData(geojson);
    } else {
        map.addSource('farms', {
            type: 'geojson',
            data: geojson,
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
        });

        map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'farms',
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': [
                    'step',
                    ['get', 'point_count'],
                    '#4caf50',
                    15,
                    '#ff9800',
                    30,
                    '#2196f3',
                    40,
                    '#BC3737',
                    200,
                    '#ECAB2B',
                    300,
                    '#9192A5'

                ],
                'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    20,15,
                    28,30,
                    40,35,
                    30,60,
                    40,
                ]
            }
        });

        map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'farms',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': ['get', 'point_count_abbreviated'],
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 12
            }
        });

        map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'farms',
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-color': '#11b4da',
                'circle-radius': 6,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff'
            }
        });

        map.on('click', 'clusters', (e) => {
            const features = map.queryRenderedFeatures(e.point, {
                layers: ['clusters']
            });
            const clusterId = features[0].properties.cluster_id;
            map.getSource('farms').getClusterExpansionZoom(
                clusterId,
                (err, zoom) => {
                    if (err) return;

                    map.easeTo({
                        center: features[0].geometry.coordinates,
                        zoom: zoom
                    });
                }
            );
        });

        map.on('click', 'unclustered-point', (e) => {
            const coordinates = e.features[0].geometry.coordinates.slice();
            const text = `${e.features[0].properties.product_card}`;

            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            const popup = new mapboxgl.Popup()
                .setLngLat(coordinates)
                .setHTML(text)
                .addTo(map);

            popup.getElement().querySelector('.close-btn').addEventListener('click', () => {
                popup.remove();
            });
        });

        map.on('mouseenter', 'clusters', () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'clusters', () => {
            map.getCanvas().style.cursor = '';
        });

        sourceAdded = true;
    }
}

