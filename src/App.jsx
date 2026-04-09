import React, { useState } from 'react';
import TravelGlobe from './TravelGlobel';
import Sidebar from './Sidebar';
import { GLOBE_CONFIG } from './globeConfig';
import './styles.css';

// Test with npm run dev
// Deploy with npm run deploy

// App.js
function App() {
  const [journeyPath, setJourneyPath] = useState(GLOBE_CONFIG.path);
  const [locations, setLocations] = useState(GLOBE_CONFIG.path);

  const [resetKey, setResetKey] = useState(0);

  const handleRestart = () => {
    setResetKey(prev => prev + 1); // Changing the key forces a re-render/reset
  };

  const handleAddLocation = (city, lat, lng) => {
    const newPoint = { city, lat: parseFloat(lat), lng: parseFloat(lng) };
    setJourneyPath(prev => [...prev, newPoint]);
    setLocations(prev => [...prev, newPoint]);
  };

  const handleDeleteLocation = (indexToDelete) => {
    setJourneyPath(prev => prev.filter((_, index) => index !== indexToDelete));
    setLocations(prev => prev.filter((_, index) => index !== indexToDelete));
  };

  return (
    <div className="App">
      {/* Sidebar - Width is controlled by Sidebar.css */}
      <Sidebar 
        currentPath={journeyPath} 
        onRestart={handleRestart}
        onSelectLocation={handleAddLocation}
        onDeleteLocation={handleDeleteLocation}
        locations={locations}
      />

      {/* Main Content Area for the Globe */}
      <main className="main-content">
        <TravelGlobe 
          locations={locations} 
          dynamicPath={journeyPath} 
          key={resetKey} // This forces a reset when the key changes
        />
      </main>
    </div>
  );
}

export default App;