import React, { useState, useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';
import { GLOBE_CONFIG } from './globeConfig';

const TravelGlobe = ({ dynamicPath = [] }) => {
  const globeEl = useRef();
  const [completedSteps, setCompletedSteps] = useState(0);
  const [countries, setCountries] = useState({ features: [] });

  // Safety check: if dynamicPath isn't ready, don't try to calculate data
  const safePath = dynamicPath || [];

  const getArcData = () => {
    return safePath.slice(0, completedSteps + 1).map((start, i) => {
      const end = safePath[i + 1];
      if (!end) return null;
      
      return {
        startLat: start.lat,
        startLng: start.lng,
        endLat: end.lat,
        endLng: end.lng,
        isLast: i === completedSteps 
      };
    }).filter(Boolean);
  };

  const getPointData = () => {
    return safePath.slice(0, completedSteps + 2);
  };
  
  const getLabelData = () => {
    if (safePath.length === 0) return [];
    const targetIndex = Math.min(completedSteps + 1, safePath.length - 1);
    return [safePath[targetIndex]];
  };

  useEffect(() => {
    fetch(GLOBE_CONFIG.display.borderGeoJson)
      .then(res => res.json())
      .then(data => setCountries(data))
      .catch(err => console.error("Error loading borders:", err));
  }, []);

  useEffect(() => {
    if (safePath.length > 0 && completedSteps < safePath.length - 1) {
      const nextCity = safePath[completedSteps + 1];

      if (globeEl.current && nextCity) {
        globeEl.current.pointOfView(
          { 
            lat: nextCity.lat, 
            lng: nextCity.lng, 
            altitude: GLOBE_CONFIG.camera.altitude 
          }, 
          GLOBE_CONFIG.camera.transitionDuration
        );
      }

      const totalWait = GLOBE_CONFIG.camera.transitionDuration + GLOBE_CONFIG.camera.pauseAtStop;
      const timer = setTimeout(() => {
        setCompletedSteps(prev => prev + 1);
      }, totalWait);

      return () => clearTimeout(timer);
    }
  }, [completedSteps, safePath]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Globe
        ref={globeEl}
        width={undefined} 
        height={undefined}
        globeImageUrl={GLOBE_CONFIG.display.globeImage}
        bumpImageUrl={GLOBE_CONFIG.display.topologyImage}
        polygonsData={countries.features}
        polygonCapColor={() => GLOBE_CONFIG.display.landColor}
        polygonSideColor={() => 'rgba(0, 0, 0, 0)'}
        polygonStrokeColor={() => GLOBE_CONFIG.display.borderColor}
        polygonAltitude={0.001}
        arcsData={getArcData()}
        arcColor={() => GLOBE_CONFIG.arcs.color}
        arcStroke={GLOBE_CONFIG.arcs.stroke}
        arcAltitude={GLOBE_CONFIG.arcs.altitude}
        arcDashLength={arc => arc.isLast ? GLOBE_CONFIG.arcs.activeDashLength : GLOBE_CONFIG.arcs.staticDashLength}
        arcDashGap={arc => arc.isLast ? GLOBE_CONFIG.arcs.activeDashGap : GLOBE_CONFIG.arcs.staticDashGap}
        arcDashAnimateTime={arc => arc.isLast ? GLOBE_CONFIG.arcs.activeAnimateTime : GLOBE_CONFIG.arcs.staticAnimateTime}
        pointsData={getPointData()}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0.007}
        pointColor={() => "#ffffff"}
        pointRadius={0.5}
        pointsMerge={true}
        labelsData={getLabelData()}
        labelLat="lat"
        labelLng="lng"
        labelText="city"
        labelSize={GLOBE_CONFIG.labels.size}
        labelDotRadius={0}
        labelColor={() => GLOBE_CONFIG.labels.color}
        labelResolution={2}
        ringsData={safePath.length > 0 && completedSteps < safePath.length ? [safePath[completedSteps]] : []}
        ringLat={d => d.lat}
        ringLng={d => d.lng}
        ringColor={() => GLOBE_CONFIG.arcs.color}
      />
    </div>
  );
};

export default TravelGlobe;