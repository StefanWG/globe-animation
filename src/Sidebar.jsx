import React, { useState, useEffect } from 'react';
import './Sidebar.css';

const Sidebar = ({ currentPath, onSelectLocation, onDeleteLocation }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // DEBOUNCE LOGIC: Wait 500ms after user stops typing
  useEffect(() => {
    const timeOutId = setTimeout(() => {
      if (query.length > 2) {
        performSearch(query);
      } else {
        setSearchResults([]);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timeOutId); // Cleanup if user types again quickly
  }, [query]);

  const performSearch = async (searchTerm) => {
    try {
      // Use a unique email to avoid being lumped in with other anonymous users
      const email = "stefan_travel_app_test@example.com"; 
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&limit=5&email=${email}`;
      
      const res = await fetch(url);
      
      if (res.status === 429) {
        console.error("Rate limited! Waiting...");
        return;
      }

      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Search failed:", err);
    }
  };

  return (
    <div className="sidebar">
      <section className="search-section">
        <h3>Add Destination</h3>
        <input 
          type="text" 
          placeholder="Type a city name..." 
          value={query} 
          onChange={(e) => setQuery(e.target.value)} // Just updates state
        />
        
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((item) => (
              <div 
                key={item?.place_id} 
                className="result-item"
                onClick={() => {
                  onSelectLocation(item.display_name.split(',')[0], item.lat, item.lon);
                  setQuery('');
                  setSearchResults([]);
                }}
              >
                {item?.display_name}
              </div>
            ))}
          </div>
        )}
      </section>
      
      <hr />
      
      <div className="itinerary-header">
        <h3>Your Journey</h3>
      </div>

      <div className="city-list">
        {currentPath.map((stop, index) => (
          <div key={index} className="city-pill">
            <span className="index">{index + 1}</span>
            <span className="city-name">{stop.city}</span>
            <button className="delete-btn" onClick={() => onDeleteLocation(index)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;