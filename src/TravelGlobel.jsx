import React, { useState, useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';
import { GLOBE_CONFIG } from './globeConfig';

const TravelGlobe = ({ locations = [], onRestart }) => {
  const globeRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [completedSteps, setCompletedSteps] = useState(0);
  const [countries, setCountries] = useState({ features: [] });
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  
  // --- 1. Animation Logic ---
  useEffect(() => {
    if (completedSteps < locations.length - 1) {
      const timer = setTimeout(() => {
        setCompletedSteps(prev => prev + 1);
        
        // Move camera to next location
        const nextLoc = locations[completedSteps + 1];
        globeRef.current?.pointOfView(
          { lat: nextLoc.lat, lng: nextLoc.lng, altitude: 2.0 }, 
          2000
        );
      }, 3000); // 3 seconds per hop
      return () => clearTimeout(timer);
    }
  }, [completedSteps, locations]);

  // --- 2. Recording Logic (The Soft Reset) ---
  const startRecording = () => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) return;

    // Capture Stream
    const stream = canvas.captureStream ? canvas.captureStream(60) : canvas.mozCaptureStream(60);
    
    // Setup Recorder
    const options = { mimeType: 'video/webm;codecs=vp9' };
    mediaRecorder.current = new MediaRecorder(stream, MediaRecorder.isTypeSupported(options.mimeType) ? options : { mimeType: 'video/webm' });
    chunks.current = [];

    mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data);
    mediaRecorder.current.onstop = () => {
      const blob = new Blob(chunks.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `globe-journey-${Date.now()}.webm`;
      a.click();
      window.URL.revokeObjectURL(url);
    };

    // START
    mediaRecorder.current.start();
    setIsRecording(true);

    // THE SOFT RESET: Reset animation without killing the component/canvas
    setCompletedSteps(0);
    globeRef.current?.pointOfView(
      { lat: locations[0].lat, lng: locations[0].lng, altitude: 2.0 }, 
      500
    );
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  // 1. Responsive Resizing Logic
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    updateSize();
    return () => resizeObserver.disconnect();
  }, []);

  // 2. Fetch Borders (Optional Visuals)
  useEffect(() => {
    if (GLOBE_CONFIG.display.borderGeoJson) {
      fetch(GLOBE_CONFIG.display.borderGeoJson)
        .then(res => res.json())
        .then(data => setCountries(data))
        .catch(err => console.error("Error loading borders:", err));
    }
  }, []);

  // 3. Sequential Animation Controller
  useEffect(() => {
    // Reset steps if locations change externally
    if (locations.length === 0) {
      setCompletedSteps(0);
      return;
    }

    if (completedSteps < locations.length - 1) {
      const nextCity = locations[completedSteps + 1];

      // Fly to the next destination
      if (globeRef.current && nextCity) {
        globeRef.current.pointOfView(
          { 
            lat: nextCity.lat, 
            lng: nextCity.lng, 
            altitude: GLOBE_CONFIG.camera.altitude 
          }, 
          GLOBE_CONFIG.camera.transitionDuration
        );
      }

      // Wait for flight + pause before moving to the next step
      const totalWait = GLOBE_CONFIG.camera.transitionDuration + GLOBE_CONFIG.camera.pauseAtStop;
      const timer = setTimeout(() => {
        setCompletedSteps(prev => prev + 1);
      }, totalWait);

      return () => clearTimeout(timer);
    }
  }, [completedSteps, locations]);

  // 4. Data Formatters
  const getArcData = () => {
    return locations.slice(0, completedSteps + 1).map((start, i) => {
      const end = locations[i + 1];
      if (!end) return null;
      return {
        startLat: start.lat,
        startLng: start.lng,
        endLat: end.lat,
        endLng: end.lng,
        isLast: i === completedSteps // Marks the "current" moving line
      };
    }).filter(Boolean);
  };

  const getPointData = () => locations.slice(0, completedSteps + 2);

  const getLabelData = () => {
    if (locations.length === 0) return [];
    // Show labels only for reached destinations
    const targetIndex = Math.min(completedSteps + 1, locations.length - 1);
    return [locations[targetIndex]];
  };

  return (
    <div ref={containerRef} className="main-content" style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <button 
        onClick={isRecording ? stopRecording : startRecording}
        className="record-btn"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 1000,
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
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(0,0,0,0)"
        
        // Base Textures
        globeImageUrl={GLOBE_CONFIG.display.globeImage}
        bumpImageUrl={GLOBE_CONFIG.display.topologyImage}
        
        // Borders/Countries
        polygonsData={countries.features}
        polygonCapColor={() => GLOBE_CONFIG.display.landColor}
        polygonSideColor={() => 'rgba(0, 0, 0, 0)'}
        polygonStrokeColor={() => GLOBE_CONFIG.display.borderColor}
        polygonAltitude={0.001}

        // Arcs with Dynamic Animation
        arcsData={getArcData()}
        arcColor={() => GLOBE_CONFIG.arcs.color}
        arcStroke={GLOBE_CONFIG.arcs.stroke}
        arcAltitude={GLOBE_CONFIG.arcs.altitude}
        arcDashLength={arc => arc.isLast ? GLOBE_CONFIG.arcs.activeDashLength : GLOBE_CONFIG.arcs.staticDashLength}
        arcDashGap={arc => arc.isLast ? GLOBE_CONFIG.arcs.activeDashGap : GLOBE_CONFIG.arcs.staticDashGap}
        arcDashAnimateTime={arc => arc.isLast ? GLOBE_CONFIG.arcs.activeAnimateTime : GLOBE_CONFIG.arcs.staticAnimateTime}

        // Points & Labels
        pointsData={getPointData()}
        pointColor={() => "#ffffff"}
        pointRadius={0.5}
        pointAltitude={0.01}
        labelsData={getLabelData()}
        labelLat="lat"
        labelLng="lng"
        labelText="city"
        labelSize={GLOBE_CONFIG.labels.size}
        labelColor={() => GLOBE_CONFIG.labels.color}
        labelResolution={2}

        // Pulse Ring on Current Location
        ringsData={locations.length > 0 && completedSteps < locations.length ? [locations[completedSteps]] : []}
        ringLat={d => d.lat}
        ringLng={d => d.lng}
        ringColor={() => GLOBE_CONFIG.arcs.color}
        
        atmosphereColor="#3a228a"
        atmosphereAltitude={0.15}
      />
    </div>
  );
};

export default TravelGlobe;