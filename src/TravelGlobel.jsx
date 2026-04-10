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
  
  // Track the coordinates for the line drawing
  const pathRef = useRef([]);

  // --- 1. Mapbox Initialization ---
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
      // Line Source & Layer
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

      // Points Source & Layer
      mapInstance.addSource('points', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [locations[0].lng, locations[0].lat] }
          }]
        }
      });

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
      
      setCompletedSteps(0);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // --- 2. Synced Animation Logic ---
  useEffect(() => {
    if (!map.current || completedSteps >= locations.length - 1) return;

    const start = locations[completedSteps];
    const end = locations[completedSteps + 1];
    const duration = 3000; // Match flyTo duration
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

      // Current full path including the moving tip
      const currentPath = [
        ...locations.slice(0, completedSteps + 1).map(l => [l.lng, l.lat]),
        [currLng, currLat]
      ];

      // Current set of "visited" points
      const currentPoints = locations.slice(0, completedSteps + 1).map(loc => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] }
      }));

      // Add the next point only once the animation completes
      if (progress === 1) {
        currentPoints.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [end.lng, end.lat] }
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
          features: currentPoints
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

  // --- 3. Recording Logic ---
  const startRecording = () => {
    const canvas = mapContainer.current.querySelector('canvas');
    if (!canvas) return;

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
      a.download = `flight-animation-${Date.now()}.webm`;
      a.click();
    };

    mediaRecorder.current.start();
    setIsRecording(true);
    
    // Restart animation for the video
    setCompletedSteps(0);
    map.current?.jumpTo({
      center: [locations[0].lng, locations[0].lat],
      zoom: 5
    });
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#000' }}>
      <button 
        onClick={isRecording ? () => mediaRecorder.current.stop() : startRecording}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 10,
          padding: '10px 20px',
          background: isRecording ? '#ff4d4d' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        {isRecording ? "Stop & Save" : "📹 Record Animation"}
      </button>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default TravelGlobe;