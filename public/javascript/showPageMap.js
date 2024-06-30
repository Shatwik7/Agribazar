mapboxgl.accessToken = mapToken;

// Assuming product object is properly populated with lng and lat properties
const coordinates = {
  lng:  parseInt(product.lng),
  lat:  parseInt(product.lat)
};

const map = new mapboxgl.Map({
  container: 'map', // container ID
  style: 'mapbox://styles/mapbox/navigation-night-v1',
  center: [coordinates.lng, coordinates.lat], // starting position [lng, lat]
  zoom: 10 // starting zoom
});

map.addControl(new mapboxgl.NavigationControl());

const marker = new mapboxgl.Marker()
  .setLngLat(coordinates)
  .setPopup(
    new mapboxgl.Popup({ offset: 25 })
      .setHTML(
        `<h3>${product.product_name}</h3>`
      )
  )
  .addTo(map);
