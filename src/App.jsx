import React, { useState } from 'react';
import TravelGlobe from './TravelGlobel';
import Sidebar from './Sidebar';
import { GLOBE_CONFIG } from './globeConfig';
import './styles.css';

// App.js
function App() {
  const [journeyPath, setJourneyPath] = useState(GLOBE_CONFIG.path);
  const [locations, setLocations] = useState(GLOBE_CONFIG.path);

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
        onSelectLocation={handleAddLocation}
        onDeleteLocation={handleDeleteLocation}
        locations={locations}
      />

      {/* Main Content Area for the Globe */}
      <main className="main-content">
        <TravelGlobe 
          locations={locations} 
          dynamicPath={journeyPath} 
        />
      </main>
    </div>
  );
}

export default App;