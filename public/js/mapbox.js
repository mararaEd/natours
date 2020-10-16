
export default (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoibWFyYXJhZWQiLCJhIjoiY2tmY2dxMWx0MWZzdTJ5bXFkZHEwbDdocyJ9.M_dkJRCInH5dtFxwWggUNA';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mararaed/ckfcj9see9fso1aqwg8i12zbm',
    scrollZoom: false,
    //   center: [-118.113491, 34.111745],
    //   zoom: 10,
    //   interactive: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create Marker
    const el = document.createElement('div');
    el.className = 'marker';
    // Add Marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add Popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend the map bounds to include the  current location.
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
