import time# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

# We need to add get_coordinates and get_route_geometry to this import line
from optimizer import optimize_routes
from utils import (
    calculate_co2, 
    generate_real_distance_matrix, 
    get_coordinates, 
    get_route_geometry
)

app = FastAPI(title="EcoRoute API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LocationRequest(BaseModel):
    locations: List[str]
    vehicle_type: str = "diesel_truck"

@app.get("/")
def read_root():
    return {"message": "Eco Route API is running!"}

@app.post("/api/optimize")
def get_optimized_route(request: LocationRequest):
    coords = []
    valid_locs = []
    
    # Now that get_coordinates is imported, this loop will work!
    for loc in request.locations:
        c = get_coordinates(loc)
        if c:
            coords.append(c)
            valid_locs.append(loc)
        time.sleep(1) 

    if len(valid_locs) < 2:
        return {"status": "error", "message": "Insufficient valid locations found."}

    # 1. Get real road distances
    matrix = generate_real_distance_matrix(coords)
    
    # 2. Run the AI Optimization
    result = optimize_routes(matrix)
    
    if result["status"] == "success":
        # 3. Get actual roadway geometry for the optimized order
        geometry = get_route_geometry(coords, result["optimized_route_indices"])
        
        # 4. Calculate CO2 and package the response
        result.update({
            "total_distance_km": round(result["total_distance_km"], 2),
            "co2_emissions_kg": calculate_co2(result["total_distance_km"], request.vehicle_type),
            "coordinates": coords,
            "valid_locations": valid_locs,
            "road_geometry": geometry
        })
        
    return result