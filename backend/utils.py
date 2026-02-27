import time
import ssl
import requests
from geopy.geocoders import Nominatim

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