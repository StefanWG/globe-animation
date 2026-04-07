// src/globeConfig.js

export const GLOBE_CONFIG = {
    // --- CAMERA SETTINGS ---
    camera: {
      altitude: 1.,            // Higher = further away, Lower = closer (e.g., 0.8)
      transitionDuration: 1000, // Time (ms) it takes to fly between cities
      pauseAtStop: 100,         // Extra time (ms) to wait before starting the next leg
    },

    // --- GLOBE VISUALS ---
    display: {
        // Classic Blue/Green Textures
        globeImage: "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
        topologyImage: "https://unpkg.com/three-globe/example/img/earth-topology.png",

        // Country Border Settings
        borderGeoJson: "https://raw.githubusercontent.com/datasets/geo-boundaries-world-110m/master/countries.geojson",
        borderColor: "#ffffff",
        borderWidth: 0.5,
        landColor: "rgba(0, 0, 0, 0)", // Transparent so the image shows through
    },
  
    // --- TRAVEL PATH (The Journey) ---
    path: [
      { city: 'London', lat: 51.5074, lng: -0.1278 },
      { city: 'Bratislava', lat: 48.1486, lng: 17.1077 },
      { city: 'Budapest', lat: 47.4979, lng: 19.0402 },
      { city: 'Maribor', lat: 46.5547, lng: 15.6459 },
      { city: 'Ljubljana', lat: 46.0569, lng: 14.5058 },
      { city: 'Osp', lat: 45.5700, lng: 13.8600 },
      { city: 'Petrovac', lat: 42.2057, lng: 18.9425 },
      { city: 'Tirana', lat: 41.3275, lng: 19.8187 },
      { city: 'Mount Olympus', lat: 40.0856, lng: 22.3586 },
      { city: 'Athens', lat: 37.9838, lng: 23.7275 },
      { city: 'Athens', lat: 37.9838, lng: 23.7275 }
    ],
  
    // --- ARC STYLING (The Lines) ---
    arcs: {
      color: '#ff5a5f',         // Line color
      stroke: 1,              // Line thickness
      altitude: 0, // Set to 0 for flat-on-the-ground lines
      
      // Animation for the "Active" leg
      activeDashLength: 0.9,    // 0 to 1 (0.5 is a dash, 1 is solid)
      activeDashGap: 4,         // Space between dashes
      activeAnimateTime: 2000,  // Speed of dash movement (lower is faster)
      
      // Look after the leg is finished
      staticDashLength: 1,      // 1 makes it a solid line
      staticDashGap: 0,         // 0 removes all gaps
      staticAnimateTime: 0      // 0 stops all movement
    },
  
    // --- LABEL STYLING (The City Names) ---
    labels: {
      size: 1.5,
      dotRadius: 0.5,
      color: 'white',
      // Logic: Should the name appear as we start moving (true) 
      // or only after we arrive (false)?
      revealBeforeArrival: true 
    }
  };