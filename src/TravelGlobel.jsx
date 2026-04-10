import React, { useState, useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';
import { GLOBE_CONFIG } from './globeConfig';

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

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
    
    // TODO: Move this to a config file
    // Setup Recorder
    const options = { 
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 8000000 // 8 Mbps for high quality
    };

    // Fallback if VP9 isn't supported
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/webm';
      options.videoBitsPerSecond = 8000000;
    }

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

useEffect(() => {
  // Only proceed if we aren't at the end
  if (completedSteps < locations.length - 1) {
    console.log("Setting timer for step:", completedSteps);

    const timer = setTimeout(() => {
      // 1. Calculate the next index
      const nextStep = completedSteps + 1;
      
      console.log("TIMER FIRED for step:", nextStep);

      // 2. Camera Logic
      const current = locations[completedSteps];
      const next = locations[nextStep];
      
      if (current && next) {
        const dist = calculateDistance(current.lat, current.lng, next.lat, next.lng);
        // Altitude logic
        const alt = dist < 1500 ? 0.4 : dist > 6000 ? 1.2 : 0.8;

        globeRef.current?.pointOfView(
          { lat: next.lat, lng: next.lng, altitude: alt }, 
          1000
        );
      }

      // 3. Increment State
      setCompletedSteps(nextStep);

    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }
}, [completedSteps, locations.length]); // Watching length is safer

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
    // TODO: Move the CSS to separate file
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
        rendererConfig={{ 
          antialias: true, 
          alpha: true,
          precision: 'highp',
          logarithmicDepthBuffer: true // Helps with Z-fighting
        }}
        ref={globeRef}
        devicePixelRatio={window.devicePixelRatio} // Forces 2x sharpness on most screens
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
        polygonAltitude={0.00001}

        // Arcs with Dynamic Animation
        arcsData={getArcData()}
        arcColor={() => GLOBE_CONFIG.arcs.color}
        arcStroke={GLOBE_CONFIG.arcs.stroke}
        arcAltitude={GLOBE_CONFIG.arcs.altitude}
        // arcAltitudeStart={0}
        // arcAltitudeEnd={0}
        arcDashLength={arc => arc.isLast ? GLOBE_CONFIG.arcs.activeDashLength : GLOBE_CONFIG.arcs.staticDashLength}
        arcDashGap={arc => arc.isLast ? GLOBE_CONFIG.arcs.activeDashGap : GLOBE_CONFIG.arcs.staticDashGap}
        arcDashAnimateTime={arc => arc.isLast ? GLOBE_CONFIG.arcs.activeAnimateTime : GLOBE_CONFIG.arcs.staticAnimateTime}

        // Points & Labels
        pointsData={getPointData()}
        pointColor={() => "#ffffff"}
        pointRadius={0.2}
        pointAltitude={0.005}
        labelsData={getLabelData()}
        labelLat="lat"
        labelLng="lng"
        labelText="city"
        labelSize={GLOBE_CONFIG.labels.size}
        labelColor={() => GLOBE_CONFIG.labels.color}
        labelResolution={2}
        
        atmosphereColor="#3a228a"
        atmosphereAltitude={0.15}
      />
    </div>
  );
};

export default TravelGlobe;