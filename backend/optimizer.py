# backend/optimizer.py
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

def create_data_model(distance_matrix):
    """Stores the data for the routing problem."""
    data = {}
    data['distance_matrix'] = distance_matrix
    data['num_vehicles'] = 1  # Using 1 vehicle for MVP
    data['depot'] = 0         # The starting point (index 0)
    return data

def optimize_routes(distance_matrix):
    """Entry point for the OR-Tools solver."""
    data = create_data_model(distance_matrix)
    
    # Create the routing index manager.
    manager = pywrapcp.RoutingIndexManager(
        len(data['distance_matrix']),
        data['num_vehicles'], 
        data['depot']
    )
    
    # Create Routing Model.
    routing = pywrapcp.RoutingModel(manager)

    # Create and register a transit callback (returns distance between nodes).
    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return data['distance_matrix'][from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)

    # Define cost of each arc (we want to minimize distance).
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Set search parameters to find the cheapest path.
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)

    # Solve the problem!
    solution = routing.SolveWithParameters(search_parameters)

    # Extract the results to send back to the React frontend
    if solution:
        index = routing.Start(0)
        route = []
        route_distance = 0
        
        while not routing.IsEnd(index):
            node_index = manager.IndexToNode(index)
            route.append(node_index)
            previous_index = index
            index = solution.Value(routing.NextVar(index))
            route_distance += routing.GetArcCostForVehicle(previous_index, index, 0)
            
        # Add the final return to the depot
        route.append(manager.IndexToNode(index)) 
        
        return {
            "status": "success",
            "optimized_route_indices": route,
            "total_distance_km": route_distance
        }
    else:
        return {"status": "error", "message": "No solution found."}