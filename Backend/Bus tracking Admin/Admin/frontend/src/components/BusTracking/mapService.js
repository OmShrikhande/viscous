import { filterValidCoordinates, convertToOrsFormat, simplifyRoutePoints } from './geoUtils';
import axios from 'axios';

// OpenRouteService API key
const ORS_API_KEY = "5b3ce3597851110001cf624849f7d76714eb412994780d06dcd7c932";

// Function to fetch route between coordinates using OpenRouteService
export const fetchRoute = async (coordinates) => {
  try {
    console.log(`Fetching route with ${coordinates.length} points`);

    // Validate coordinates and filter out invalid ones
    const validCoordinates = filterValidCoordinates(coordinates);

    if (validCoordinates.length < 2) {
      console.error('Not enough valid coordinates for route calculation');
      return null;
    }

    // Convert to [lng, lat] for OpenRouteService
    const orsCoordinates = convertToOrsFormat(validCoordinates);

    console.log('OpenRouteService coordinates:', orsCoordinates);

    // If we have too many points, simplify by taking fewer points
    // This helps with API limits and makes the route more reliable
    const simplifiedCoordinates = simplifyRoutePoints(orsCoordinates);

    // Make the API request with simplified coordinates
    console.log('Making OpenRouteService API request...');
    const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        coordinates: simplifiedCoordinates,
        // Use minimal parameters to avoid errors
        preference: "fastest"
      })
    });

    // Handle API response
    if (!response.ok) {
      try {
        // Try to parse the error as JSON first
        const errorData = await response.json();
        console.error(`OpenRouteService API error (${response.status}):`, errorData);
        
        // Extract the specific error message if available
        let errorMessage = `OpenRouteService API error: ${response.status}`;
        if (errorData && errorData.error && errorData.error.message) {
          errorMessage += ` - ${errorData.error.message}`;
        }
        
        throw new Error(errorMessage);
      } catch (jsonError) {
        // If it's not JSON, get the raw text
        const errorText = await response.text();
        console.error(`OpenRouteService API error (${response.status}):`, errorText);
        throw new Error(`OpenRouteService API error: ${response.status} ${response.statusText}`);
      }
    }

    const routeData = await response.json();
    
    if (!routeData || !routeData.features || routeData.features.length === 0) {
      console.error('No valid route data returned from OpenRouteService');
      return null;
    }

    console.log('Route fetched successfully');
    return routeData;
  } catch (error) {
    console.error('Error fetching route:', error.message);
    return null;
  }
};

// Function to fetch bus stops from the API
export const fetchBusStops = async (setErrorMessage, setBusStops) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const response = await axios.get('http://localhost:3001/api/bus-stops', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data.success && response.data.stops) {
      console.log(`Fetched ${response.data.stops.length} bus stops`);
      setBusStops(response.data.stops);
    }
  } catch (error) {
    console.error('Error fetching bus stops:', error);
    setErrorMessage('Failed to fetch bus stops');
  }
};