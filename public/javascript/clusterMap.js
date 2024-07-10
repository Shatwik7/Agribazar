mapboxgl.accessToken = mapToken;

const map = new mapboxgl.Map({
    container: 'cluster-map',
    style: 'mapbox://styles/mapbox/outdoors-v11',
    center: [79.63857396297851, 22.09543025085631],
    zoom: 3
});

map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

let sourceAdded = false;
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}
document.getElementById('address').addEventListener('input', debounce(handleInput, 500));
document.getElementById('radius').addEventListener('input', debounce(handleInput, 500));
document.getElementById('search').addEventListener('input', debounce(handleInput, 500));

async function handleInput() {
    const address = document.getElementById('address').value;
    const radius = document.getElementById('radius').value||null;
    const search = document.getElementById('search').value;

    if ((address && !radius) || (!address && radius)) {
        console.warn('Both address and radius must be provided together.');
        return;
    }
    try {
        const response = await axios.post('/product/map/data', { address, radius, search });
        const data = response.data;
        if(response.data.length===0){
            return;
        }
        updateMap(data.products);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}


document.getElementById('clearBtn').addEventListener('click', async() => {
    document.getElementById('searchForm').reset();
    try {
        const response = await axios.get('/product/map/data');
        const data = response.data;
        updateMap(data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
});

function updateMap(products) {
    const objectsWithGeometry = products.map(obj => {
        const { lng, lat, product_id, product_name, image_url, description, starting_price, ...rest } = obj;
        var imageOtimized=image_url;
        if(!image_url.includes('/upload/w_500,h_400/q_auto/f_auto')){
            imageOtimized=image_url.replace('/upload', '/upload/w_500,h_400/q_auto/f_auto');
        }
        return {
            geometry: {
                type: "Point",
                coordinates: [lng, lat]
            },
            properties: {
                product_id,
                product_name,
                product_card: `
                    <div class="center">
                    <div class="article-card">
                        <div class="close-btn">&times;</div>
                        <a href="/product/${product_id}"><div class="content">
                        <p class="date">$${starting_price}</p>
                        <p class="title">${product_name}</p>
                        </div>
                        <img src="${imageOtimized}" alt="article-cover"/>
                    </div></a>
                    </div>`
            }
        };
    });
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

