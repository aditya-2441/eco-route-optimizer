import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Truck, Leaf, Route as RouteIcon, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Component to automatically re-center the map when new results arrive
function ChangeView({ center }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

export default function App() {
  const [locations, setLocations] = useState("New Delhi, India\nAgra, India\nJaipur, India\nChandigarh, India");
  const [vehicle, setVehicle] = useState("diesel_truck");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]); // Default to Delhi

  const handleOptimize = async () => {
    setLoading(true);
    const locationArray = locations.split('\n').filter(loc => loc.trim() !== "");

    try {
      const response = await fetch('http://localhost:8000/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations: locationArray, vehicle_type: vehicle })
      });
      
      const data = await response.json();
      if (data.status === "success") {
        setResults(data);
        // Center map on the first coordinate of the new route
        setMapCenter(data.coordinates[0]);
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert("Backend connection failed!");
    }
    setLoading(false);
  };

  // Helper to create the polyline path based on the optimized index order
const getRoutePath = () => {
  // Use the detailed road geometry from the backend if available
  if (results && results.road_geometry) {
    return results.road_geometry;
  }
  return [];
};

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
      <div className="w-1/3 p-6 bg-white shadow-lg z-10 flex flex-col overflow-y-auto">
        <h1 className="text-2xl font-bold text-green-700 flex items-center mb-6">
          <Leaf className="mr-2" /> EcoRoute Optimizer
        </h1>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2 flex items-center">
            <MapPin className="mr-1 w-4 h-4" /> Stop List (Addresses)
          </label>
          <textarea 
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
            rows="5"
            value={locations}
            onChange={(e) => setLocations(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2 flex items-center">
            <Truck className="mr-1 w-4 h-4" /> Fleet Vehicle
          </label>
          <select 
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
          >
            <option value="diesel_truck">Heavy Diesel Truck (High CO2)</option>
            <option value="diesel_van">Delivery Van (Medium CO2)</option>
            <option value="electric_van">EV Van (Low CO2)</option>
          </select>
        </div>

        <button 
          onClick={handleOptimize}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center"
        >
          {loading ? "Calculating..." : <><RouteIcon className="mr-2" /> Generate Green Route</>}
        </button>

        {results && results.status === "success" && (
          <div className="mt-8 p-5 bg-green-50 border border-green-200 rounded-lg animate-in fade-in duration-500">
            <h3 className="text-lg font-bold text-green-800 mb-3 underline">Route Analytics</h3>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Distance:</span>
              <span className="font-bold">{results.total_distance_km} km</span>
            </div>
            <div className="flex justify-between mb-4">
              <span className="text-gray-600">Total CO₂:</span>
              <span className="font-bold text-red-500">{results.co2_emissions_kg} kg</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600 font-semibold block mb-2 text-xs uppercase">Optimized Sequence:</span>
              <div className="space-y-1">
                {results.optimized_route_indices.map((idx, i) => (
                  <div key={i} className="flex items-center text-xs bg-white p-2 rounded border">
                    <span className="w-5 h-5 bg-green-700 text-white rounded-full flex items-center justify-center mr-2">{i + 1}</span>
                    {results.valid_locations[idx]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="w-2/3 relative">
        <MapContainer center={mapCenter} zoom={6} className="w-full h-full z-0">
          <ChangeView center={mapCenter} />
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {results && results.coordinates && results.coordinates.map((coord, idx) => (
            <Marker key={idx} position={coord}>
              <Popup>{results.valid_locations[idx]}</Popup>
            </Marker>
          ))}
          {results && <Polyline positions={getRoutePath()} color="green" weight={4} dashArray="10, 10" />}
        </MapContainer>
      </div>
    </div>
  );
}