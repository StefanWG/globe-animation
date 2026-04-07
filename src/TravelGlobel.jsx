import React, { useState, useEffect, useRef } from "react";
import Globe from "react-globe.gl";
import { GLOBE_CONFIG } from "./globeConfig"; // Import your config file

const TravelGlobe = ({ locations = [] }) => {
  const containerRef = useRef();
  const globeRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // 1. Dynamic Resizing logic
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

  useEffect(() => {
    if (globeRef.current) {
      // Set the starting zoom level immediately
      globeRef.current.pointOfView({ altitude: GLOBE_CONFIG.camera.altitude });
    }
  }, []);

  useEffect(() => {
    if (globeRef.current && locations.length > 0) {
      const lastCity = locations[locations.length - 1];

      // Trigger the flying animation
      globeRef.current.pointOfView(
        {
          lat: lastCity.lat,
          lng: lastCity.lng,
          altitude: GLOBE_CONFIG.camera.altitude
        },
        GLOBE_CONFIG.camera.transitionDuration // Uses the 1000ms from your config
      );
    }
  }, [locations], GLOBE_CONFIG.camera.altitude); // Fires every time a city is added or the list changes

  // 2. Map Arc Data from config
  const arcsData = React.useMemo(() => {
    const arcs = [];
    for (let i = 0; i < locations.length - 1; i++) {
      arcs.push({
        startLat: locations[i].lat,
        startLng: locations[i].lng,
        endLat: locations[i + 1].lat,
        endLng: locations[i + 1].lng,
        color: GLOBE_CONFIG.arcs.color,
      });
    }
    return arcs;
  }, [locations]);

  // 3. Map Label Data from config
  const labelsData = React.useMemo(() => {
    return locations.map((loc) => ({
      lat: loc.lat,
      lng: loc.lng,
      text: loc.name || loc.city,
      color: GLOBE_CONFIG.labels.color,
      size: GLOBE_CONFIG.labels.size,
      dotRadius: GLOBE_CONFIG.labels.dotRadius,
    }));
  }, [locations]);

  // 4. Handle Flight Camera Settings
  useEffect(() => {
    if (globeRef.current && locations.length > 0) {
      const lastCity = locations[locations.length - 1];
      globeRef.current.pointOfView(
        { 
          lat: lastCity.lat, 
          lng: lastCity.lng, 
          altitude: GLOBE_CONFIG.camera.altitude 
        },
        GLOBE_CONFIG.camera.transitionDuration
      );
    }
  }, [locations, GLOBE_CONFIG.camera.altitude]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(0,0,0,0)"

        // Visuals from Config
        globeImageUrl={GLOBE_CONFIG.display.globeImage}
        bumpImageUrl={GLOBE_CONFIG.display.topologyImage}
        
        // Arcs from Config
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={GLOBE_CONFIG.arcs.activeDashLength}
        arcDashGap={GLOBE_CONFIG.arcs.activeDashGap}
        arcDashAnimateTime={GLOBE_CONFIG.arcs.activeAnimateTime}
        arcStroke={GLOBE_CONFIG.arcs.stroke}
        
        // Labels from Config
        labelsData={labelsData}
        labelLat={d => d.lat}
        labelLng={d => d.lng}
        labelText={d => d.text}
        labelSize={d => d.size}
        labelDotRadius={d => d.dotRadius}
        labelColor={d => d.color}
        labelResolution={2}

        // Atmosphere
        atmosphereColor="#3a228a"
        atmosphereAltitude={0.15}
      />
    </div>
  );
};

export default TravelGlobe;