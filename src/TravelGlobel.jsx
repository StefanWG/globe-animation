import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// --- Physics Constants ---
const TRAVEL_SPEED_FACTOR = 1.5; 
const MIN_DURATION = 1000;
const MAX_DURATION = 3500;

const getDistance = (p1, p2) => {
  const R = 6371;
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const TravelGlobe = ({ locations = [] }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);

  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN || locations.length === 0) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      projection: 'globe',
      center: [locations[0].lng, locations[0].lat],
      zoom: 6,
      pitch: 40,
    });

    map.current = mapInstance;

    mapInstance.on('load', () => {
      mapInstance.setFog({
        color: 'rgb(186, 210, 247)',
        'high-color': 'rgb(36, 92, 223)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(11, 11, 25)',
        'star-intensity': 0.6
      });

      mapInstance.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[locations[0].lng, locations[0].lat]] } }
      });

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

      mapInstance.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 4, 'line-opacity': 0.8 }
      });

      mapInstance.addLayer({
        id: 'city-dots',
        type: 'circle',
        source: 'points',
        paint: { 'circle-radius': 5, 'circle-color': '#ffffff', 'circle-stroke-width': 2, 'circle-stroke-color': '#007bff' }
      });

      mapInstance.addLayer({
        id: 'city-labels',
        type: 'symbol',
        source: 'points',
        layout: {
          'text-field': ['get', 'city'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 13,
          'text-offset': [0, 1.2],
          'text-anchor': 'top'
        },
        paint: { 'text-color': '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.8)', 'text-halo-width': 1.5 }
      });
      
      setCompletedSteps(0);
    });

    return () => mapInstance.remove();
  }, []);

  useEffect(() => {
    if (!map.current || completedSteps >= locations.length - 1) return;

    const start = locations[completedSteps];
    const end = locations[completedSteps + 1];
    const distance = getDistance(start, end);

    // Calculate Midpoint
    const midLng = (start.lng + end.lng) / 2;
    const midLat = (start.lat + end.lat) / 2;

    const segmentDuration = Math.max(MIN_DURATION, Math.min(distance * TRAVEL_SPEED_FACTOR, MAX_DURATION));
    const startTime = performance.now();

    // Zoom pulls back more as distance increases
    let targetZoom = 7; 
    if (distance > 1000) targetZoom = 4;
    if (distance > 3000) targetZoom = 2;

    // CENTER ON MIDPOINT
    map.current.flyTo({
      center: [midLng, midLat],
      zoom: targetZoom,
      duration: segmentDuration,
      essential: true,
      curve: 1.0, 
      speed: 0.4
    });

    let animationFrameId;

    const animateUpdate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / segmentDuration, 1);

      const currLng = start.lng + (end.lng - start.lng) * progress;
      const currLat = start.lat + (end.lat - start.lat) * progress;

      const currentPath = [
        ...locations.slice(0, completedSteps + 1).map(l => [l.lng, l.lat]),
        [currLng, currLat]
      ];

      const currentFeatures = locations.slice(0, completedSteps + 1).map(loc => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
        properties: { city: loc.city }
      }));

      if (progress === 1) {
        currentFeatures.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [end.lng, end.lat] },
          properties: { city: end.city }
        });
      }

      const routeSource = map.current.getSource('route');
      const pointSource = map.current.getSource('points');

      if (routeSource) routeSource.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: currentPath } });
      if (pointSource) pointSource.setData({ type: 'FeatureCollection', features: currentFeatures });

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animateUpdate);
      } else {
        setTimeout(() => setCompletedSteps(prev => prev + 1), 1500);
      }
    };

    animationFrameId = requestAnimationFrame(animateUpdate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [completedSteps, locations]);

  const startRecording = () => {
    const canvas = mapContainer.current.querySelector('canvas');
    const stream = canvas.captureStream(60);
    mediaRecorder.current = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 10000000 
    });

    chunks.current = [];
    mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data);
    mediaRecorder.current.onstop = () => {
      const blob = new Blob(chunks.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `midpoint-flight.webm`;
      a.click();
    };

    mediaRecorder.current.start();
    setIsRecording(true);
    setCompletedSteps(0);
    map.current?.jumpTo({ center: [locations[0].lng, locations[0].lat], zoom: 5 });
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#000' }}>
      <button 
        onClick={isRecording ? () => mediaRecorder.current.stop() : startRecording}
        style={{
          position: 'absolute', top: '20px', right: '20px', zIndex: 10,
          padding: '12px 24px', background: isRecording ? '#ff4d4d' : '#007bff',
          color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
          border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
        }}
      >
        {isRecording ? "Stop & Save" : "📹 Record Midpoint Flight"}
      </button>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default TravelGlobe;