import React, { useState, useEffect } from 'react';
import { Leaf, Milestone as RouteIcon, MapPin, Package, Weight, Info, RefreshCw, IndianRupee, Truck, Search, PlusCircle, CheckCircle } from 'lucide-react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker, Polyline } from '@react-google-maps/api';

// ==========================================
// MODULE 1: SHIPPER VIEW
// ==========================================
function ShipCargoView({ availableTrucks }) {
  const [fromCity, setFromCity] = useState("New Delhi");
  const [toCity, setToCity] = useState("Jaipur");
  const [weight, setWeight] = useState(500);
  const [type, setType] = useState("Standard");
  const [matches, setMatches] = useState(null);

  const handleSearch = () => {
    // Now searching through LIVE database results!
    const results = availableTrucks.filter(truck => 
      truck.route.some(r => r.toLowerCase().includes(fromCity.toLowerCase())) &&
      truck.route.some(r => r.toLowerCase().includes(toCity.toLowerCase())) &&
      truck.capacity >= weight &&
      (type === "Standard" || truck.type === type)
    );
    setMatches(results);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <h2 className="text-3xl font-black text-green-800 mb-6 flex items-center"><Package className="mr-3 w-8 h-8"/> Find LTL Cargo Space</h2>
      
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Origin City</label>
            <input type="text" className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none" value={fromCity} onChange={e => setFromCity(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Destination City</label>
            <input type="text" className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none" value={toCity} onChange={e => setToCity(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Weight (kg)</label>
            <input type="number" className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none" value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Cargo Type</label>
            <select className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none" value={type} onChange={e => setType(e.target.value)}>
              <option value="Standard">Standard</option>
              <option value="Perishable">Perishable (Fast Track)</option>
              <option value="Hazardous">Hazardous</option>
            </select>
          </div>
        </div>
        <button onClick={handleSearch} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex justify-center items-center transition">
          <Search className="mr-2" /> Scan Live Marketplace
        </button>
      </div>

      {matches && (
        <div>
          <h3 className="text-xl font-bold mb-4 text-gray-800">Available Fleet Matches ({matches.length})</h3>
          {matches.length === 0 ? (
            <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200">No trucks currently matching your route and capacity. Try expanding your search.</div>
          ) : (
            <div className="space-y-4">
              {matches.map(truck => (
                <div key={truck.id} className="bg-white p-5 rounded-xl shadow-sm border border-green-200 flex justify-between items-center hover:shadow-md transition">
                  <div>
                    <h4 className="font-black text-lg text-gray-800">{truck.carrier}</h4>
                    <p className="text-sm text-gray-600"><b>Route:</b> {truck.route.join(" → ")}</p>
                    <p className="text-sm text-gray-600 mt-1 flex items-center">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold mr-2">{truck.type}</span>
                      Available Space: <span className="font-bold ml-1 text-green-600">{truck.capacity} kg</span>
                    </p>
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition">
                    Book Space
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// MODULE 2: CARRIER VIEW 
// ==========================================
function ListFleetView({ refreshTrucks }) {
  const [carrier, setCarrier] = useState("UU-CSC Logistics");
  const [route, setRoute] = useState("Chandigarh, New Delhi, Agra");
  const [capacity, setCapacity] = useState(2500);
  const [type, setType] = useState("Standard");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePostTruck = async () => {
    setLoading(true);
    const newTruck = {
      carrier: carrier,
      route: route.split(',').map(s => s.trim()),
      capacity: Number(capacity),
      type: type
    };

    try {
      // Send LIVE to the SQLite Database
      await fetch('http://localhost:8000/api/trucks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTruck)
      });
      
      await refreshTrucks(); // Refresh the global list
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      alert("Failed to save to database!");
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto animate-in fade-in duration-500">
      <h2 className="text-3xl font-black text-blue-800 mb-6 flex items-center"><Truck className="mr-3 w-8 h-8"/> Post Available Fleet Space</h2>
      <p className="text-gray-600 mb-8">Reduce empty miles. List your truck's route and available capacity to accept LTL shipments.</p>

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Transport Company Name</label>
            <input type="text" className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" value={carrier} onChange={e => setCarrier(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Planned Route (Comma separated cities)</label>
            <input type="text" className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" value={route} onChange={e => setRoute(e.target.value)} placeholder="e.g. New Delhi, Agra, Kanpur" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Available Capacity (kg)</label>
              <input type="number" className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" value={capacity} onChange={e => setCapacity(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Cargo Type</label>
              <select className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" value={type} onChange={e => setType(e.target.value)}>
                <option value="Standard">Standard Freight</option>
                <option value="Perishable">Refrigerated (Perishable)</option>
                <option value="Hazardous">Certified Hazardous</option>
              </select>
            </div>
          </div>
        </div>

        {success ? (
          <div className="w-full bg-green-100 text-green-800 font-bold py-3 rounded-lg flex justify-center items-center">
            <CheckCircle className="mr-2" /> Saved to Live Database!
          </div>
        ) : (
          <button onClick={handlePostTruck} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex justify-center items-center transition">
            {loading ? "Saving..." : <><PlusCircle className="mr-2" /> Post to Marketplace</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ==========================================
// MODULE 3: YOUR EXISTING AI OPTIMIZER
// ==========================================
function AIOptimizerView() {
  const [locations, setLocations] = useState("New Delhi, India\nAgra, India\nJaipur, India\nChandigarh, India");
  const [cargoWeight, setCargoWeight] = useState(800); 
  const [cargoType, setCargoType] = useState("Standard");
  const [maxDeliveryHours, setMaxDeliveryHours] = useState(72);
  const [results, setResults] = useState(null);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "" // Paste your actual key here for the hackathon
  });

  const containerStyle = {
    width: '100%',
    height: '100%'
  };

  const handleOptimize = async () => {
    setLoading(true);
    const locationArray = locations.split('\n').filter(loc => loc.trim() !== "");

    try {
      const response = await fetch('http://localhost:8000/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          locations: locationArray, 
          cargo_weight_kg: Number(cargoWeight), 
          cargo_type: cargoType,
          max_delivery_hours: Number(maxDeliveryHours)
        })
      });
      
      const data = await response.json();
      if (data.status === "success") {
        setResults(data);
        setMapCenter(data.coordinates[0]);

        const isFlight = data.vehicle_recommended?.includes("Air");
        const isRail = data.vehicle_recommended?.includes("Rail");

        if (isFlight) {
          // FLIGHT: Clear road directions, we will draw a flight path!
          setDirectionsResponse(null);
        } else if (window.google) {
          // TRUCK & TRAIN: Let Google snap to the roads/rails
          const directionsService = new window.google.maps.DirectionsService();
          
          directionsService.route({
            origin: data.valid_locations[0],
            destination: data.valid_locations[data.valid_locations.length - 1],
            waypoints: data.valid_locations.slice(1, -1).map(city => ({ location: city, stopover: true })),
            // Use TRANSIT for trains, DRIVING for trucks
            travelMode: isRail ? window.google.maps.TravelMode.TRANSIT : window.google.maps.TravelMode.DRIVING,
          }, (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK) {
              setDirectionsResponse(result);
            } else {
              // Fallback to driving if there is no direct train route available
              console.warn("Transit failed, falling back to driving.");
              directionsService.route({...arguments[0], travelMode: window.google.maps.TravelMode.DRIVING}, (res, stat) => {
                if (stat === window.google.maps.DirectionsStatus.OK) setDirectionsResponse(res);
              });
            }
          });
        }
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert("Backend connection failed!");
    }
    setLoading(false);
  };

  const getRoutePath = () => {
    if (results && results.road_geometry) return results.road_geometry;
    return [];
  };

  return (
    <div className="flex h-full bg-gray-50 font-sans text-gray-800">
      <div className="w-1/3 p-6 bg-white shadow-xl z-10 flex flex-col overflow-y-auto border-r border-gray-200">
        <h1 className="text-2xl font-black text-green-700 flex items-center mb-6 tracking-tight">
          <Leaf className="mr-2" /> AI Route Engine
        </h1>

        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
            <MapPin className="mr-1 w-4 h-4 text-green-600" /> Stop List (Addresses)
          </label>
          <textarea className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm bg-gray-50" rows="4" value={locations} onChange={(e) => setLocations(e.target.value)} />
        </div>

        <div className="flex gap-4 mb-6">
          <div className="w-1/3">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
              <Weight className="mr-1 w-4 h-4 text-green-600" /> Weight (kg)
            </label>
            <input type="number" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-gray-50" value={cargoWeight} onChange={(e) => setCargoWeight(e.target.value)} />
          </div>
          <div className="w-1/2">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
              <Package className="mr-1 w-4 h-4 text-green-600" /> Cargo Type
            </label>
            <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-gray-50" value={cargoType} onChange={(e) => setCargoType(e.target.value)}>
              <option value="Standard">Standard</option>
              <option value="Perishable">Perishable</option>
              <option value="Hazardous">Hazardous</option>
            </select>
          </div>
          <div className="w-1/3">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
              ⏱️ Time Limit (Hrs)
            </label>
            <input type="number" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-gray-50" value={maxDeliveryHours} onChange={(e) => setMaxDeliveryHours(e.target.value)} />
          </div>
        </div>

        <button onClick={handleOptimize} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex justify-center items-center active:scale-95">
          {loading ? "Crunching Logistics..." : <><RouteIcon className="mr-2" /> Auto-Dispatch Route</>}
        </button>

        {results && results.status === "success" && (
          <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm mb-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Trip Overview</h3>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600 flex items-center"><Info className="w-4 h-4 mr-1"/> AI Transport Match:</span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">{results.vehicle_recommended}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Capacity Used:</span>
                <span className={`font-bold ${results.capacity_utilization_percent < 50 ? 'text-red-500' : 'text-green-600'}`}>{results.capacity_utilization_percent}%</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Carbon Footprint:</span>
                <span className="font-bold text-green-600">{results.co2_emissions_kg} kg CO₂</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 flex items-center"><IndianRupee className="w-4 h-4 mr-1"/> Est. Fuel Cost:</span>
                <span className="font-bold text-gray-800">₹{results.trip_cost_inr}</span>
              </div>
            </div>
            
            {/* Keeping the mock pooling logic for the AI engine demo exactly as you had it */}
            {results.pooling_opportunities && results.pooling_opportunities.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm mb-4">
                <h3 className="text-sm font-bold text-amber-800 flex items-center mb-2">
                  <Package className="w-4 h-4 mr-1"/> LTL Pooling Opportunity Found!
                </h3>
                <p className="text-xs text-amber-700 mb-2">You have empty space. Pool with these shipments to increase margin:</p>
                {results.pooling_opportunities.map((pool, idx) => (
                  <div key={idx} className="bg-white p-2 rounded border border-amber-100 text-sm flex justify-between items-center mt-1">
                    <span><b>{pool.city}:</b> {pool.item} ({pool.weight}kg)</span>
                    <span className="text-green-600 font-bold">+₹{pool.revenue_inr}</span>
                  </div>
                ))}
              </div>
            )}

            {results.backhaul_opportunity && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
                <h3 className="text-sm font-bold text-emerald-800 flex items-center mb-2">
                  <RefreshCw className="w-4 h-4 mr-1"/> Empty-Mile Prevention (Backhaul)
                </h3>
                <p className="text-xs text-emerald-700 mb-2">Don't drive back empty! Accept this return cargo:</p>
                <div className="bg-white p-2 rounded border border-emerald-100 text-sm">
                  <div className="flex justify-between items-center">
                    <span><b>{results.backhaul_opportunity.to_city}</b> bound {results.backhaul_opportunity.item} ({results.backhaul_opportunity.weight}kg)</span>
                    <span className="text-green-600 font-bold">+₹{results.backhaul_opportunity.revenue_inr}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="w-2/3 relative bg-gray-200 flex items-center justify-center h-full min-h-[500px]">
        {!isLoaded ? (
          <div className="text-gray-500 font-bold">Loading Google Maps...</div>
        ) : !results ? (
          <div className="text-gray-500 font-bold text-xl">
            📍 Enter your locations and click Auto-Dispatch!
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={{ lat: mapCenter[0], lng: mapCenter[1] }}
            zoom={5}
          >
            {/* SCENARIO A: Truck or Train (Google handles everything) */}
            {directionsResponse && !results.vehicle_recommended?.includes("Air") && (
              <DirectionsRenderer directions={directionsResponse} />
            )}

            {/* SCENARIO B: Flight Path (We draw a curved dashed line) */}
            {results && results.vehicle_recommended?.includes("Air") && (
              <>
                {/* Draw the Airports */}
                {results.coordinates.map((coord, idx) => (
                  <Marker 
                    key={idx} 
                    position={{ lat: coord[0], lng: coord[1] }} 
                    label={`${idx + 1}`}
                  />
                ))}
                
                {/* Draw the curved flight path */}
                <Polyline 
                  path={results.coordinates.map(coord => ({ lat: coord[0], lng: coord[1] }))} 
                  options={{ 
                    strokeColor: '#3b82f6', // Airline Blue
                    strokeOpacity: 0,
                    icons: [{
                      icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 4 },
                      offset: '0',
                      repeat: '30px' // Dashed line effect
                    }],
                    geodesic: true // Makes the line curve beautifully over the globe!
                  }} 
                />
              </>
            )}
          </GoogleMap>
        )}
      </div>
    </div>
  );
}

// ==========================================
// MAIN APP SHELL (Navigation & LIVE State)
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState('optimizer');
  
  // Start empty, we will fetch from DB!
  const [availableTrucks, setAvailableTrucks] = useState([]);

  // FETCH LIVE DATA ON LOAD
  const fetchTrucks = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/trucks');
      const data = await response.json();
      if (data.status === "success") {
        setAvailableTrucks(data.trucks);
      }
    } catch (error) {
      console.error("Failed to fetch trucks:", error);
    }
  };

  useEffect(() => {
    fetchTrucks();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* TOP NAVIGATION BAR */}
      <nav className="bg-green-900 text-white shadow-lg p-4 flex justify-between items-center z-20">
        <div className="flex items-center space-x-3">
          <Leaf className="w-7 h-7 text-green-400" />
          <span className="text-2xl font-black tracking-tight">EcoRoute Network</span>
        </div>
        
        <div className="flex space-x-3">
          <button 
            onClick={() => setActiveTab('ship')}
            className={`px-5 py-2.5 rounded-lg font-bold flex items-center transition-all ${activeTab === 'ship' ? 'bg-green-700 shadow-inner' : 'hover:bg-green-800'}`}
          >
            <Package className="w-5 h-5 mr-2"/> Ship Cargo
          </button>
          
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-5 py-2.5 rounded-lg font-bold flex items-center transition-all ${activeTab === 'list' ? 'bg-green-700 shadow-inner' : 'hover:bg-green-800'}`}
          >
            <Truck className="w-5 h-5 mr-2"/> List Fleet
          </button>
          
          <button 
            onClick={() => setActiveTab('optimizer')}
            className={`px-5 py-2.5 rounded-lg font-bold flex items-center transition-all ${activeTab === 'optimizer' ? 'bg-green-700 shadow-inner' : 'hover:bg-green-800'}`}
          >
            <RouteIcon className="w-5 h-5 mr-2"/> AI Engine
          </button>
        </div>
      </nav>

      {/* DYNAMIC WORKSPACE */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'ship' && <ShipCargoView availableTrucks={availableTrucks} />}
        {activeTab === 'list' && <ListFleetView refreshTrucks={fetchTrucks} />}
        {activeTab === 'optimizer' && <AIOptimizerView />}
      </main>

    </div>
  );
}