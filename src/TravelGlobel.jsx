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
  
  // Ref to track current drawn path for smooth updates
  const pathRef = useRef([]);

  // --- 1. Mapbox Initialization ---
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;

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
      mapInstance.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: pathRef.current } }
      });

      mapInstance.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: { 'line-color': '#ffffff', 'line-width': 4, 'line-opacity': 0.8 }
      });
      
      // Start the animation cycle
      setCompletedSteps(0);
    });

    return () => mapInstance.remove();
  }, []);

  // --- 2. Synced Animation Logic ---
  useEffect(() => {
    if (!map.current || completedSteps >= locations.length - 1) return;

    const start = locations[completedSteps];
    const end = locations[completedSteps + 1];
    const duration = 3000; // Match flyTo duration
    const startTime = performance.now();

    // 1. Move the Camera
    map.current.flyTo({
      center: [end.lng, end.lat],
      zoom: 5,
      duration: duration,
      essential: true
    });

    // 2. Animate the Line Drawing
    const animateLine = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Interpolate coordinates
      const currLng = start.lng + (end.lng - start.lng) * progress;
      const currLat = start.lat + (end.lat - start.lat) * progress;

      // Update the path data
      // We keep all previous segments and just extend the current one
      const currentPath = [
        ...locations.slice(0, completedSteps + 1).map(l => [l.lng, l.lat]),
        [currLng, currLat]
      ];

      const source = map.current.getSource('route');
      if (source) {
        source.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: currentPath }
        });
      }

      if (progress < 1) {
        requestAnimationFrame(animateLine);
      } else {
        // Move to next city after a small pause
        setTimeout(() => setCompletedSteps(prev => prev + 1), 1000);
      }
    };

    requestAnimationFrame(animateLine);
  }, [completedSteps]);

  // --- 3. Recording Logic (Standard) ---
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
      a.download = `flight-path.webm`;
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
        style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}
      >
        {isRecording ? "Stop" : "Record"}
      </button>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default TravelGlobe;