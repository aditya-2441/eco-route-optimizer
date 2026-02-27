# backend/main.py
import time
import sqlite3
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

from optimizer import optimize_routes
from utils import (
    calculate_co2, 
    generate_real_distance_matrix, 
    get_coordinates, 
    get_route_geometry,
    select_transport_mode_with_ai,           
    analyze_cargo_opportunities    
)

app = FastAPI(title="EcoRoute API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. DATABASE SETUP ---
def init_db():
    conn = sqlite3.connect('eco_route.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS trucks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            carrier TEXT,
            route TEXT,
            capacity INTEGER,
            type TEXT
        )
    ''')
    c.execute("SELECT COUNT(*) FROM trucks")
    if c.fetchone()[0] == 0:
        c.execute("INSERT INTO trucks (carrier, route, capacity, type) VALUES (?, ?, ?, ?)",
                  ("GreenLine Logistics", json.dumps(["New Delhi", "Jaipur"]), 2000, "Standard"))
        c.execute("INSERT INTO trucks (carrier, route, capacity, type) VALUES (?, ?, ?, ?)",
                  ("FreshFleet Express", json.dumps(["Agra", "New Delhi", "Chandigarh"]), 800, "Perishable"))
    conn.commit()
    conn.close()

init_db()

# --- 2. DATA MODELS ---
class LocationRequest(BaseModel):
    locations: List[str]
    cargo_weight_kg: float
    cargo_type: str = "Standard"
    max_delivery_hours: int = 72  # Default to 3 days

class TruckRequest(BaseModel):
    carrier: str
    route: List[str]
    capacity: int
    type: str

# --- 3. FREIGHT MARKETPLACE ENDPOINTS ---
@app.get("/api/trucks")
def get_trucks():
    conn = sqlite3.connect('eco_route.db')
    c = conn.cursor()
    c.execute("SELECT id, carrier, route, capacity, type FROM trucks ORDER BY id DESC")
    rows = c.fetchall()
    conn.close()
    
    trucks = []
    for row in rows:
        trucks.append({
            "id": row[0],
            "carrier": row[1],
            "route": json.loads(row[2]),
            "capacity": row[3],
            "type": row[4]
        })
    return {"status": "success", "trucks": trucks}

@app.post("/api/trucks")
def add_truck(truck: TruckRequest):
    conn = sqlite3.connect('eco_route.db')
    c = conn.cursor()
    c.execute("INSERT INTO trucks (carrier, route, capacity, type) VALUES (?, ?, ?, ?)",
              (truck.carrier, json.dumps(truck.route), truck.capacity, truck.type))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Truck added to database"}

# --- 4. AI ROUTING ENGINE ENDPOINTS ---
@app.get("/")
def read_root():
    return {"message": "Eco Route API is running!"}

# Don't forget to import select_transport_mode_with_ai from utils at the top!

@app.post("/api/optimize")
def get_optimized_route(request: LocationRequest):
    coords = []
    valid_locs = []
    
    for loc in request.locations:
        c = get_coordinates(loc)
        if c:
            coords.append(c)
            valid_locs.append(loc)
        time.sleep(1) 

    if len(valid_locs) < 2:
        return {"status": "error", "message": "Insufficient valid locations found."}

    # 1. Estimate straight-line distance for the AI prompt
    # Multiplying by a rough estimate (e.g., 300km per stop) for the heuristic
    estimated_distance = len(valid_locs) * 300 

    # 2. Ask the LLM to pick the transport mode
    estimated_distance = len(valid_locs) * 300 
    v_id, v_details = select_transport_mode_with_ai(
        estimated_distance, 
        request.cargo_weight_kg, 
        request.max_delivery_hours
    )

    # 3. Generate matrix and solve the route
    matrix = generate_real_distance_matrix(coords)
    result = optimize_routes(matrix)
    
    if result["status"] == "success":
        distance = round(result["total_distance_km"], 2)
        
        # 2. Pass the AI's chosen vehicle into the geometry function!
        geometry = get_route_geometry(
            coords, 
            result["optimized_route_indices"], 
            v_details["name"]
        )
        
        # 4. Your existing analysis logic works perfectly with the AI's output!
        pooling, backhaul = analyze_cargo_opportunities(
            valid_locs, 
            result["optimized_route_indices"], 
            v_details["max_weight"], 
            request.cargo_weight_kg
        )
        
        trip_cost = distance * v_details["cost_per_km"]
        co2_emissions = round(distance * v_details["co2_factor"], 2)
        
        result.update({
            "total_distance_km": distance,
            "co2_emissions_kg": co2_emissions,
            "coordinates": coords,
            "valid_locations": valid_locs,
            "road_geometry": geometry,
            "vehicle_recommended": v_details["name"],  # The AI's dynamically generated name
            "trip_cost_inr": trip_cost,
            "pooling_opportunities": pooling,
            "backhaul_opportunity": backhaul,
            "capacity_utilization_percent": round((request.cargo_weight_kg / v_details["max_weight"]) * 100, 1)
        })
        
    return result