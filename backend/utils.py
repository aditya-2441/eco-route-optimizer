import time
import ssl
import requests
from geopy.geocoders import Nominatim
import os
import json
from pathlib import Path
from google import genai
from dotenv import load_dotenv

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

api_key = os.environ.get("AIzaSyDv3-HI8XM32xDC_mkJfHyNCrhx4d5hqXs")
# --- HACKATHON BYPASS ---
# If the .env file STILL fails, delete the '#' on the next line and paste your key directly:
# api_key = "AIzaSy_YOUR_ACTUAL_KEY_HERE..."
# ------------------------

if not api_key:
    print(f"🚨 ERROR: Still cannot find GOOGLE_API_KEY in {env_path}")
else:
    print("✅ SUCCESS: Found GOOGLE_API_KEY!")

# Initialize the new SDK client
try:
    client = genai.Client(api_key=api_key)
except Exception as e:
    print(f"⚠️ Warning: Could not initialize AI client: {e}")
    client = None


# MAC SSL BYPASS
ssl._create_default_https_context = ssl._create_unverified_context
geolocator = Nominatim(user_agent="aditya_uu_csc_eco_route", timeout=15)

def calculate_co2(distance_km: float, vehicle_type: str = "diesel_truck") -> float:
    factors = {"electric_van": 0.05, "diesel_van": 0.15, "diesel_truck": 0.35}
    return round(distance_km * factors.get(vehicle_type, 0.2), 2)

def get_coordinates(location_name: str):
    # --- HACKATHON DEMO FALLBACK ---
    # Bypasses IP blocks to guarantee the live demo works flawlessly
    demo_cities = {
        "new delhi, india": (28.6139, 77.2090),
        "agra, india": (27.1767, 78.0081),
        "jaipur, india": (26.9124, 75.7873),
        "chandigarh, india": (30.7333, 76.7794)
    }
    
    clean_name = location_name.strip().lower()
    
    # 1. Check our guaranteed demo dictionary first
    if clean_name in demo_cities:
        print(f"✅ Using guaranteed demo coordinates for: {location_name}")
        return demo_cities[clean_name]
        
    # 2. If it's a new city, try the live API
    try:
        print(f"📡 Asking OpenStreetMap for: {location_name}")
        location = geolocator.geocode(location_name)
        if location:
            return (location.latitude, location.longitude)
        return None
    except Exception as e:
        print(f"❌ Geocoding failed for {location_name}: {e}")
        return None

def generate_real_distance_matrix(coords: list):
    """Uses OSRM Table API to get real driving distances."""
    coord_str = ";".join([f"{c[1]},{c[0]}" for c in coords])
    url = f"http://router.project-osrm.org/table/v1/driving/{coord_str}?annotations=distance"
    
    response = requests.get(url).json()
    if response.get("code") != "Ok":
        return None
    
    # OSRM returns distances in meters, convert to integer km for OR-Tools
    matrix = [[int(d / 1000) for d in row] for row in response["distances"]]
    return matrix

def get_route_geometry(coords: list, order: list):
    """Fetches real road path geometry for the optimized sequence."""
    ordered_coords = [coords[i] for i in order]
    coord_str = ";".join([f"{c[1]},{c[0]}" for c in ordered_coords])
    url = f"http://router.project-osrm.org/route/v1/driving/{coord_str}?overview=full&geometries=geojson"
    
    response = requests.get(url).json()
    if response.get("code") == "Ok":
        # Flip (lon, lat) to (lat, lon) for Leaflet
        return [[p[1], p[0]] for p in response["routes"][0]["geometry"]["coordinates"]]
    return []

# --- ADVANCED LOGISTICS ENGINE ---

VEHICLE_DB = {
    "electric_van": {"max_weight": 1000, "cost_per_km": 15, "co2_factor": 0.05, "name": "EV Van (Eco)"},
    "diesel_van": {"max_weight": 3500, "cost_per_km": 25, "co2_factor": 0.15, "name": "Delivery Van"},
    "diesel_truck": {"max_weight": 15000, "cost_per_km": 40, "co2_factor": 0.35, "name": "Heavy Freight Truck"}
}

# Mock databases for Hackathon Wow-Factor
PENDING_LTL_CARGO = {
    "new delhi, india": {"item": "Electronics", "weight": 500, "revenue": 4500},
    "jaipur, india": {"item": "Textiles", "weight": 800, "revenue": 6000},
    "agra, india": {"item": "Leather Goods", "weight": 300, "revenue": 2500}
}

BACKHAUL_CARGO = {
    "chandigarh, india": {"item": "Machinery Parts", "weight": 4000, "destination": "New Delhi", "revenue": 15000},
    "jaipur, india": {"item": "Handicrafts", "weight": 2000, "destination": "New Delhi", "revenue": 8500}
}

def select_transport_mode_with_ai(total_distance_km: float, cargo_weight_kg: float, max_delivery_hours: int):
    """
    Uses the NEW Gemini SDK to dynamically calculate and select the best transport mode.
    """
    prompt = f"""
    You are an enterprise logistics AI. 
    A user needs to ship cargo with the following constraints:
    - Distance: {total_distance_km} km
    - Weight: {cargo_weight_kg} kg
    - Time Limit: {max_delivery_hours} hours

    Based on physics, standard transport speeds, and minimizing carbon footprints, 
    select the absolute best mode of transport (e.g., Air Cargo, Freight Rail, Electric Van, or Standard Truck).
    
    You MUST respond with ONLY a valid JSON object matching this exact format. Do not use markdown blocks:
    {{
        "name": "Vehicle Name",
        "speed_kmh": 80,
        "co2_factor": 0.120,
        "cost_per_km": 40,
        "max_weight": 24000
    }}
    """
    
    try:
        if not client:
            raise ValueError("No API Key found.")
            
        # New SDK syntax for generating content
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        
        clean_text = response.text.strip().replace("```json", "").replace("```", "")
        v_details = json.loads(clean_text)
        return "ai_selected_vehicle", v_details
        
    except Exception as e:
        print(f"⚠️ AI Routing Failed (Using Fallback): {e}")
        # Fallback to your original logic
        if cargo_weight_kg <= VEHICLE_DB["electric_van"]["max_weight"]:
            return "electric_van", VEHICLE_DB["electric_van"]
        elif cargo_weight_kg <= VEHICLE_DB["diesel_van"]["max_weight"]:
            return "diesel_van", VEHICLE_DB["diesel_van"]
        else:
            return "diesel_truck", VEHICLE_DB["diesel_truck"]

def analyze_cargo_opportunities(valid_locations, optimized_indices, vehicle_capacity, current_weight):
    """Scans the route for empty space and suggests pooling and return cargo."""
    pooling_suggestions = []
    available_space = vehicle_capacity - current_weight

    # 1. Check for Pooling (LTL) along the route
    for idx in optimized_indices:
        city = valid_locations[idx].lower()
        if city in PENDING_LTL_CARGO:
            extra_cargo = PENDING_LTL_CARGO[city]
            if extra_cargo["weight"] <= available_space:
                pooling_suggestions.append({
                    "city": valid_locations[idx],
                    "item": extra_cargo["item"],
                    "weight": extra_cargo["weight"],
                    "revenue_inr": extra_cargo["revenue"]
                })
                available_space -= extra_cargo["weight"]

    # 2. Check for Backhaul from the final dropoff
    last_city = valid_locations[optimized_indices[-1]].lower()
    backhaul = None
    if last_city in BACKHAUL_CARGO:
        b_cargo = BACKHAUL_CARGO[last_city]
        if b_cargo["weight"] <= vehicle_capacity:
            backhaul = {
                "from_city": valid_locations[optimized_indices[-1]],
                "to_city": b_cargo["destination"],
                "item": b_cargo["item"],
                "weight": b_cargo["weight"],
                "revenue_inr": b_cargo["revenue"]
            }

    return pooling_suggestions, backhaul