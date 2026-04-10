import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const TravelGlobe = ({ locations = [] }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  
  const pathRef = useRef([]);

  // --- 1. Initialization ---
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN || locations.length === 0) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    pathRef.current = [[locations[0].lng, locations[0].lat]];

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      projection: 'globe',
      center: [locations[0].lng, locations[0].lat],
      zoom: 5,
      pitch: 45,
    });

    map.current = mapInstance;

    mapInstance.on('load', () => {
      // Route Line
      mapInstance.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: pathRef.current } }
      });
      mapInstance.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 4, 'line-opacity': 0.8 }
      });

      // Points & Labels Source
      mapInstance.addSource('points', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [locations[0].lng, locations[0].lat] },
            properties: { city: locations[0].city }
          }]
        }
      });

      // City Dots Layer
      mapInstance.addLayer({
        id: 'city-dots',
        type: 'circle',
        source: 'points',
        paint: {
          'circle-radius': 6,
          'circle-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#007bff'
        }
      });

      // City Labels Layer (Symbol)
      mapInstance.addLayer({
        id: 'city-labels',
        type: 'symbol',
        source: 'points',
        layout: {
          'text-field': ['get', 'city'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 14,
          'text-offset': [0, 1.5],
          'text-anchor': 'top'
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.8)',
          'text-halo-width': 2
        }
      });
      
      setCompletedSteps(0);
    });

    return () => mapInstance.current?.remove();
  }, []);

  // --- 2. Animation Loop ---
  useEffect(() => {
    if (!map.current || completedSteps >= locations.length - 1) return;

    const start = locations[completedSteps];
    const end = locations[completedSteps + 1];
    const duration = 3000; 
    const startTime = performance.now();

    map.current.flyTo({
      center: [end.lng, end.lat],
      zoom: 5,
      duration: duration,
      essential: true
    });

    const animateUpdate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const currLng = start.lng + (end.lng - start.lng) * progress;
      const currLat = start.lat + (end.lat - start.lat) * progress;

      // Update Path
      const currentPath = [
        ...locations.slice(0, completedSteps + 1).map(l => [l.lng, l.lat]),
        [currLng, currLat]
      ];

      // Update Points (Include City Property)
      const currentFeatures = locations.slice(0, completedSteps + 1).map(loc => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
        properties: { city: loc.city }
      }));

      // Add final point label when arrived
      if (progress === 1) {
        currentFeatures.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [end.lng, end.lat] },
          properties: { city: end.city }
        });
      }

      const routeSource = map.current.getSource('route');
      const pointSource = map.current.getSource('points');

      if (routeSource) {
        routeSource.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: currentPath }
        });
      }

      if (pointSource) {
        pointSource.setData({
          type: 'FeatureCollection',
          features: currentFeatures
        });
      }

      if (progress < 1) {
        requestAnimationFrame(animateUpdate);
      } else {
        setTimeout(() => setCompletedSteps(prev => prev + 1), 1000);
      }
    };

    requestAnimationFrame(animateUpdate);
  }, [completedSteps, locations]);

  // --- 3. Recording (Standard) ---
  const startRecording = () => {
    const canvas = mapContainer.current.querySelector('canvas');
    const stream = canvas.captureStream(60);
    mediaRecorder.current = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 8000000
    });

    chunks.current = [];
    mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data);
    mediaRecorder.current.onstop = () => {
      const blob = new Blob(chunks.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flight-capture.webm`;
      a.click();
    };

    mediaRecorder.current.start();
    setIsRecording(true);
    setCompletedSteps(0);
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <button 
        onClick={isRecording ? () => mediaRecorder.current.stop() : startRecording}
        style={{
          position: 'absolute', top: '20px', right: '20px', zIndex: 10,
          padding: '10px 20px', background: isRecording ? '#ff4d4d' : '#007bff',
          color: 'white', borderRadius: '5px', cursor: 'pointer'
        }}
      >
        {isRecording ? "Stop" : "Record"}
      </button>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default TravelGlobe;