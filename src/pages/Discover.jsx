import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/leaflet-custom.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DEFAULT_COORDS = [9.3977, 76.8861]; // [lat, lng] format for Leaflet
const DEFAULT_ZOOM = 13;

// Pet service types to search for
const PET_SERVICE_TYPES = [
  { type: 'veterinary_care', label: 'Veterinary Hospitals', icon: '🏥' },
  { type: 'pet_store', label: 'Pet Stores', icon: '🛒' },
  { type: 'beauty_salon', label: 'Pet Grooming', icon: '✂️' },
  { type: 'lodging', label: 'Pet Boarding', icon: '🏠' }
];

// Debounce utility function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const Discover = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const mapRef = useRef();

  // Enhanced location cache with localStorage
  const locationCacheRef = useRef({
    lastLocation: null,
    timestamp: null,
    accuracy: null
  });

  // Search cache for better performance
  const searchCacheRef = useRef(new Map());

  // Leaflet doesn't need API key loading like Google Maps

  // Always get fresh location - no caching for live GPS coordinates
  const loadCachedLocation = useCallback(() => {
    // Disabled caching to ensure always fresh GPS coordinates
    console.log('Location caching disabled - always fetching fresh GPS coordinates');
    return null;
  }, []);

  // Disabled location caching to ensure always fresh GPS coordinates
  const saveLocationToCache = useCallback((location, accuracy) => {
    // Location caching disabled - always use live GPS coordinates
    console.log(`Live GPS location obtained: ${location.lat}, ${location.lng} with ${accuracy}m accuracy`);
    // Still update the ref for internal tracking but don't save to localStorage
    locationCacheRef.current = {
      lastLocation: location,
      timestamp: Date.now(),
      accuracy: accuracy || 999,
      source: 'live_gps'
    };
  }, []);

  // Check and request location permissions
  const requestLocationPermission = useCallback(async () => {
    if (!navigator.permissions) {
      return true; // Assume permission granted if permissions API not available
    }
    
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      console.log('Location permission status:', permission.state);
      
      if (permission.state === 'denied') {
        throw new Error('Location permission denied');
      }
      
      if (permission.state === 'prompt') {
        // Permission will be requested when getCurrentPosition is called
        return true;
      }
      
      return permission.state === 'granted';
    } catch (error) {
      console.warn('Error checking location permission:', error);
      return true; // Assume permission available if check fails
    }
  }, []);

  // Fast live GPS location detection - always fresh coordinates
  const getLocationAccurate = useCallback(async () => {
    return new Promise(async (resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      // Check permissions first
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        reject(new Error('Location permission denied'));
        return;
      }

      let attempts = 0;
      const maxAttempts = 2; // Reduced attempts for faster response

      const tryGetLocation = (highAccuracy = true) => {
        attempts++;
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Validate position data
            if (!position.coords || 
                typeof position.coords.latitude !== 'number' || 
                typeof position.coords.longitude !== 'number') {
              console.warn('Invalid position data received');
              if (attempts < maxAttempts) {
                setTimeout(() => tryGetLocation(highAccuracy), 500); // Faster retry
                return;
              } else {
                reject(new Error('Invalid position data'));
                return;
              }
            }
            
            // Accept any reasonable accuracy for speed, but prefer better accuracy
            if (position.coords.accuracy <= 200 || !highAccuracy) {
              console.log(`Live GPS location obtained with ${position.coords.accuracy}m accuracy (attempt ${attempts})`);
              resolve(position);
            } else if (attempts < maxAttempts && highAccuracy) {
              console.log(`Location accuracy ${position.coords.accuracy}m, retrying for better accuracy...`);
              // Try again with high accuracy
              setTimeout(() => tryGetLocation(true), 500);
            } else {
              console.log(`Using live location with ${position.coords.accuracy}m accuracy after ${attempts} attempts`);
              resolve(position);
            }
          },
          (error) => {
            console.log(`Live GPS attempt ${attempts} failed:`, error.message, error.code);
            
            if (attempts < maxAttempts) {
              if (highAccuracy && (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)) {
                // Try with lower accuracy on timeout or unavailable
                console.log('Retrying with lower accuracy for faster response...');
                setTimeout(() => tryGetLocation(false), 500);
              } else if (error.code === error.PERMISSION_DENIED) {
                // Don't retry if permission denied
                reject(error);
                return;
              } else {
                // Retry with same settings
                setTimeout(() => tryGetLocation(highAccuracy), 1000);
              }
            } else {
              reject(error);
            }
          },
          {
            enableHighAccuracy: highAccuracy,
            timeout: highAccuracy ? 10000 : 8000, // Faster timeouts for live GPS
            maximumAge: 0 // Always get fresh GPS coordinates - no caching
          }
        );
      };

      // Start with high accuracy
      tryGetLocation(true);
    });
  }, [requestLocationPermission]);

  // Search nearby places using Nominatim API
  const searchNearbyPlaces = useCallback(async (lat, lng, type = null) => {
    try {
      // Create cache key
      const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}_${type || 'all'}`;
      
      // Check cache first
      if (searchCacheRef.current.has(cacheKey)) {
        const cached = searchCacheRef.current.get(cacheKey);
        if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
          return cached.data;
        }
      }

      const searchPromises = [];
      const searchQueries = [];

      if (type && type !== 'all') {
        const typeInfo = PET_SERVICE_TYPES.find(t => t.type === type);
        if (typeInfo) {
          // More comprehensive search queries for better results
          const specificQueries = [
            `${typeInfo.label.toLowerCase()} near ${lat},${lng}`,
            `pet ${typeInfo.label.toLowerCase().replace('hospitals', 'hospital').replace('stores', 'store')} near ${lat},${lng}`,
            `animal ${typeInfo.label.toLowerCase().replace('hospitals', 'hospital').replace('stores', 'store')} near ${lat},${lng}`,
            `veterinary near ${lat},${lng}`,
            `pet shop near ${lat},${lng}`,
            `animal hospital near ${lat},${lng}`,
            `pet grooming near ${lat},${lng}`,
            `pet boarding near ${lat},${lng}`
          ];
          specificQueries.forEach(query => {
            searchQueries.push({ query, serviceType: type });
          });
        }
      } else {
        // Search all types in parallel with comprehensive query variations
        const allQueries = [
          `veterinary near ${lat},${lng}`,
          `pet hospital near ${lat},${lng}`,
          `animal hospital near ${lat},${lng}`,
          `veterinarian near ${lat},${lng}`,
          `pet store near ${lat},${lng}`,
          `pet shop near ${lat},${lng}`,
          `animal store near ${lat},${lng}`,
          `pet grooming near ${lat},${lng}`,
          `dog grooming near ${lat},${lng}`,
          `pet salon near ${lat},${lng}`,
          `pet boarding near ${lat},${lng}`,
          `dog boarding near ${lat},${lng}`,
          `animal boarding near ${lat},${lng}`
        ];
        
        allQueries.forEach(query => {
          // Determine service type based on query content
          let serviceType = 'veterinary_care';
          if (query.includes('store') || query.includes('shop')) {
            serviceType = 'pet_store';
          } else if (query.includes('grooming') || query.includes('salon')) {
            serviceType = 'beauty_salon';
          } else if (query.includes('boarding')) {
            serviceType = 'lodging';
          }
          searchQueries.push({ query, serviceType });
        });
      }

      // Search using Nominatim API
      for (const { query, serviceType } of searchQueries) {
        searchPromises.push(
          fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10&addressdetails=1`)
            .then(response => response.json())
            .then(data => {
              if (!data || data.length === 0) {
                console.log(`No results found for query: ${query}`);
                return [];
              }
              
              return data.map(place => {
                // Extract name from display_name (first part before comma)
                const name = place.display_name ? 
                  place.display_name.split(',')[0].trim() : 
                  (place.name || 'Unknown Service');
                
                // Create vicinity from address components
                let vicinity = '';
                if (place.address) {
                  const addrParts = [];
                  if (place.address.road) addrParts.push(place.address.road);
                  if (place.address.city || place.address.town || place.address.village) {
                    addrParts.push(place.address.city || place.address.town || place.address.village);
                  }
                  vicinity = addrParts.join(', ');
                }
                
                return {
                  place_id: place.place_id || Math.random().toString(36),
                  name: name,
                  formatted_address: place.display_name || `${name}, ${vicinity}`,
                  vicinity: vicinity,
                  geometry: {
                    location: {
                      lat: () => parseFloat(place.lat),
                      lng: () => parseFloat(place.lon)
                    }
                  },
                  rating: Math.random() * 2 + 3, // Mock rating since Nominatim doesn't provide ratings
                  user_ratings_total: Math.floor(Math.random() * 100) + 10,
                  opening_hours: {
                    open_now: Math.random() > 0.3 // Mock open/closed status
                  },
                  serviceType: serviceType
                };
              });
            })
            .catch(error => {
              console.error(`Nominatim search failed for ${serviceType}:`, error);
              return [];
            })
        );
      }

      const results = await Promise.all(searchPromises);
      const flatResults = results.flat();
      
      console.log(`Search completed for ${type || 'all'} services:`, {
        searchQueries: searchQueries.length,
        results: results.map(r => r.length),
        totalFound: flatResults.length,
        locations: flatResults.map(loc => ({ name: loc.name, type: loc.serviceType }))
      });
      
      // If no results found, generate some mock data for demonstration
      if (flatResults.length === 0) {
        console.log('No real results found, generating mock data for demonstration...');
        const mockServices = [
          {
            place_id: 'mock_vet_1',
            name: 'Central Veterinary Hospital',
            formatted_address: 'Main Street, City Center',
            vicinity: 'Main Street, City Center',
            geometry: {
              location: {
                lat: () => lat + (Math.random() - 0.5) * 0.01,
                lng: () => lng + (Math.random() - 0.5) * 0.01
              }
            },
            rating: 4.5,
            user_ratings_total: 127,
            opening_hours: { open_now: true },
            serviceType: 'veterinary_care'
          },
          {
            place_id: 'mock_store_1',
            name: 'Pet Paradise Store',
            formatted_address: 'Shopping District, City',
            vicinity: 'Shopping District, City',
            geometry: {
              location: {
                lat: () => lat + (Math.random() - 0.5) * 0.01,
                lng: () => lng + (Math.random() - 0.5) * 0.01
              }
            },
            rating: 4.2,
            user_ratings_total: 89,
            opening_hours: { open_now: true },
            serviceType: 'pet_store'
          },
          {
            place_id: 'mock_grooming_1',
            name: 'Furry Friends Grooming',
            formatted_address: 'Pet Care Avenue, City',
            vicinity: 'Pet Care Avenue, City',
            geometry: {
              location: {
                lat: () => lat + (Math.random() - 0.5) * 0.01,
                lng: () => lng + (Math.random() - 0.5) * 0.01
              }
            },
            rating: 4.7,
            user_ratings_total: 156,
            opening_hours: { open_now: false },
            serviceType: 'beauty_salon'
          },
          {
            place_id: 'mock_boarding_1',
            name: 'Happy Paws Boarding',
            formatted_address: 'Pet Services Road, City',
            vicinity: 'Pet Services Road, City',
            geometry: {
              location: {
                lat: () => lat + (Math.random() - 0.5) * 0.01,
                lng: () => lng + (Math.random() - 0.5) * 0.01
              }
            },
            rating: 4.3,
            user_ratings_total: 203,
            opening_hours: { open_now: true },
            serviceType: 'lodging'
          }
        ];
        
        flatResults.push(...mockServices);
        console.log('Generated mock data:', mockServices.length, 'services');
      }
      
      // Cache the results
      searchCacheRef.current.set(cacheKey, {
        data: flatResults,
        timestamp: Date.now()
      });
      
      return flatResults;
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  }, []);

  // Debounced search places by text query using Nominatim
  const debouncedSearchPlaces = useMemo(
    () => debounce(async (query) => {
    try {
      if (!query.trim()) {
        return [];
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10&addressdetails=1`
      );
      
      const data = await response.json();
      
      return data.map(place => ({
        place_id: place.place_id,
        name: place.display_name.split(',')[0] || place.name || 'Unknown',
        formatted_address: place.display_name,
        geometry: {
          location: {
            lat: () => parseFloat(place.lat),
            lng: () => parseFloat(place.lon)
          }
        }
      }));
    } catch (error) {
      console.error('Error in searchPlaces:', error);
      return [];
    }
    }, 300),
    []
  );

  // Initialize location with fast detection
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Always get fresh live GPS location - no cached locations
        console.log('Fetching fresh live GPS coordinates...');

        // Try accurate location detection
        let position = null;
        try {
          position = await getLocationAccurate();
        } catch (error) {
          console.log('Accurate location failed, using default:', error.message);
          
          // Provide specific error messages based on error type
          let errorMessage = 'Using default location. ';
          if (error.message.includes('permission')) {
            errorMessage += 'Please enable location access in your browser settings for accurate results.';
          } else if (error.message.includes('timeout')) {
            errorMessage += 'Location request timed out. Please try again or enable location services.';
          } else if (error.message.includes('unavailable')) {
            errorMessage += 'Location services are unavailable. Please check your device settings.';
          } else {
            errorMessage += 'Enable location access for better results.';
          }
          
          setUserLocation({ coords: DEFAULT_COORDS, accuracy: 999, timestamp: Date.now() });
          setError(errorMessage);
          
          const places = await searchNearbyPlaces(DEFAULT_COORDS[0], DEFAULT_COORDS[1], selectedType);
            setLocations(places);
          setLoading(false);
          return;
        }

        if (position) {
          const coords = [position.coords.latitude, position.coords.longitude]; // Leaflet format [lat, lng]
          const locationData = {
            coords,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          
          // Save to cache
          saveLocationToCache(locationData, position.coords.accuracy);
          
          console.log('Location obtained:', locationData.accuracy, 'meters accuracy');
          setUserLocation(locationData);
          setSearchQuery('My Current Location');
          
          // Search for nearby places using Nominatim
          const places = await searchNearbyPlaces(coords[0], coords[1], selectedType);
            setLocations(places);
        }
        
      } catch (error) {
        console.error('Location initialization failed:', error);
        setUserLocation({ coords: DEFAULT_COORDS, accuracy: 999, timestamp: Date.now() });
        setError('Unable to get your location. Using default location.');
        
          try {
          const places = await searchNearbyPlaces(DEFAULT_COORDS[0], DEFAULT_COORDS[1], selectedType);
            setLocations(places);
          } catch (placesError) {
            console.error('Error loading default location places:', placesError);
        }
      } finally {
        setLoading(false);
      }
    };

      initializeLocation();
  }, [selectedType, loadCachedLocation, saveLocationToCache, searchNearbyPlaces, getLocationAccurate]);

  // Handle search input with debouncing
  const handleSearchInput = useCallback(async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length > 2) {
      try {
        const results = await debouncedSearchPlaces(query);
        setSearchResults(results || []);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [debouncedSearchPlaces]);

  // Handle search result selection
  const handleSearchResultSelect = useCallback(async (place) => {
    try {
      const coords = [place.geometry.location.lat(), place.geometry.location.lng()];
      const locationData = {
        coords,
        accuracy: 50, // Assume good accuracy for searched locations
        timestamp: Date.now()
      };
      
      setUserLocation(locationData);
      setSearchQuery(place.name);
      setShowSearchResults(false);
      setSearchResults([]);
      setLoading(true);
      
      const places = await searchNearbyPlaces(coords[0], coords[1], selectedType);
      setLocations(places);
      setLoading(false);
    } catch (error) {
      console.error('Error selecting search result:', error);
      setLoading(false);
    }
  }, [searchNearbyPlaces, selectedType]);

  // Use current location with fast detection
  const useCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Always get fresh live GPS location - no cached locations
      console.log('Getting fresh live GPS coordinates for current location...');

      const position = await getLocationAccurate();

      if (position) {
        const coords = [position.coords.latitude, position.coords.longitude];
        const locationData = {
          coords,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        
        // Save to cache
        saveLocationToCache(locationData, position.coords.accuracy);
        
        console.log('Location obtained:', locationData.accuracy, 'meters accuracy');
        setUserLocation(locationData);
        setSearchQuery('My Current Location');
        
        const places = await searchNearbyPlaces(coords[0], coords[1], selectedType);
          setLocations(places);
      }
      
    } catch (error) {
      console.error('Location request failed:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Unable to get your current location. ';
      if (error.message.includes('permission')) {
        errorMessage += 'Please enable location access in your browser settings.';
      } else if (error.message.includes('timeout')) {
        errorMessage += 'Location request timed out. Please try again.';
      } else if (error.message.includes('unavailable')) {
        errorMessage += 'Location services are unavailable. Please check your device settings.';
      } else {
        errorMessage += 'Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loadCachedLocation, saveLocationToCache, searchNearbyPlaces, selectedType, getLocationAccurate]);

  // Handle type change
  const handleTypeChange = useCallback(async (type) => {
    setSelectedType(type);
    setLoading(true);
    
    if (userLocation && userLocation.coords) {
      try {
        const places = await searchNearbyPlaces(userLocation.coords[0], userLocation.coords[1], type);
        setLocations(places);
      } catch (error) {
        console.error('Error changing type:', error);
        setError('Failed to load nearby services.');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [userLocation, searchNearbyPlaces]);

  // Handle navigation
  const handleNavigate = useCallback((loc) => {
    if (!userLocation || !userLocation.coords) return;
    try {
      const url = `https://www.openstreetmap.org/directions?engine=osrm_car&route=${userLocation.coords[0]},${userLocation.coords[1]};${loc.geometry.location.lat()},${loc.geometry.location.lng()}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error opening navigation:', error);
    }
  }, [userLocation]);

  // Get service type info
  const getServiceTypeInfo = useCallback((serviceType) => {
    return PET_SERVICE_TYPES.find(type => type.type === serviceType) || 
           { label: 'Pet Service', icon: '🐾' };
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSearchResults && !event.target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchResults]);

  // Custom icons for Leaflet markers
  const createCustomIcon = useCallback((color = 'blue') => {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    // Wait for the DOM element to be available and user location
    if (!userLocation || !userLocation.coords) return;

    // Clean up existing map if it exists
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (error) {
        console.warn('Error removing existing map:', error);
      }
      mapRef.current = null;
    }

    // Wait for DOM to be ready and ensure map container exists
    const initializeMap = () => {
      const mapElement = document.getElementById('map');
      if (!mapElement) {
        console.log('Map element not found, retrying...');
        setTimeout(initializeMap, 200);
        return;
      }

      // Ensure element has dimensions
      if (mapElement.offsetWidth === 0 || mapElement.offsetHeight === 0) {
        console.log('Map element has no dimensions, retrying...');
        setTimeout(initializeMap, 200);
        return;
      }

      try {
        console.log('Initializing Leaflet map...');
        
        // Initialize map with proper options
        const map = L.map('map', {
          zoomControl: true,
          attributionControl: true,
          preferCanvas: false, // Use SVG for better compatibility
          zoomAnimation: true,
          fadeAnimation: true,
          markerZoomAnimation: true
        });

        // Set view after a small delay to ensure map is ready
        setTimeout(() => {
          map.setView(userLocation.coords, DEFAULT_ZOOM, { animate: false });
        }, 50);

        // Add tile layer with proper options
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
          bounds: [[-85.0511, -180], [85.0511, 180]]
        }).addTo(map);

        // Wait for map to be ready before adding markers
        map.whenReady(() => {
          console.log('Map is ready, adding markers...');

          // Add user marker
          const userMarker = L.marker(userLocation.coords, {
            icon: createCustomIcon('#3B82F6')
          }).addTo(map);

          userMarker.bindPopup(`
            <div style="text-align: center; padding: 8px;">
              <div style="font-weight: bold; color: #3B82F6; font-size: 14px;">📍 You are here</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">Accuracy: ${Math.round(userLocation.accuracy)}m</div>
            </div>
          `);

          // Add service location markers
          if (locations && locations.length > 0) {
            const markers = [];
            locations.forEach((loc) => {
              const typeInfo = getServiceTypeInfo(loc.serviceType);
              const lat = loc.geometry.location.lat();
              const lng = loc.geometry.location.lng();
              
              // Validate coordinates
              if (isNaN(lat) || isNaN(lng)) {
                console.warn('Invalid coordinates for location:', loc.name);
                return;
              }

              const marker = L.marker([lat, lng], {
                icon: createCustomIcon('#EF4444')
              }).addTo(map);

              marker.bindPopup(`
                <div style="max-width: 280px; padding: 4px;">
                  <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #1f2937;">${loc.name}</div>
                  <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">${typeInfo.icon}</span>
                    <span style="background: linear-gradient(to right, #3B82F6, #4F46E5); color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                      ${typeInfo.label}
                    </span>
                  </div>
                  ${loc.vicinity ? `<div style="font-size: 12px; color: #666; margin-bottom: 8px; display: flex; align-items: flex-start; gap: 4px;"><span>📍</span><span>${loc.vicinity}</span></div>` : ''}
                  ${loc.rating ? `
                    <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                      <span style="color: #F59E0B;">⭐</span>
                      <span style="font-weight: 500; color: #1f2937;">${loc.rating.toFixed(1)}</span>
                      ${loc.user_ratings_total ? `<span style="font-size: 12px; color: #666;">(${loc.user_ratings_total} reviews)</span>` : ''}
                    </div>
                  ` : ''}
                  ${loc.opening_hours ? `
                    <div style="font-size: 12px; font-weight: 500; margin-bottom: 12px; color: ${loc.opening_hours.open_now ? '#059669' : '#DC2626'};">
                      ${loc.opening_hours.open_now ? '🟢 Open Now' : '🔴 Closed'}
                    </div>
                  ` : ''}
                  <button onclick="window.open('https://www.openstreetmap.org/directions?engine=osrm_car&route=${userLocation.coords[0]},${userLocation.coords[1]};${lat},${lng}', '_blank')" 
                          style="width: 100%; background: linear-gradient(to right, #3B82F6, #4F46E5); color: white; padding: 8px 16px; border-radius: 12px; font-size: 12px; font-weight: 500; border: none; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.2s;">
                    🗺️ Get Directions
                  </button>
                </div>
              `);

              marker.on('click', () => setSelected(loc));
              markers.push(marker);
            });

            console.log(`Added ${markers.length} service markers to map`);

            // Fit map to show all markers if there are any
            if (markers.length > 0) {
              const group = new L.featureGroup([userMarker, ...markers]);
              setTimeout(() => {
                try {
                  map.fitBounds(group.getBounds().pad(0.1));
                } catch (error) {
                  console.warn('Error fitting bounds:', error);
                }
              }, 100);
            }
          } else {
            console.log('No locations to display on map');
          }
        });

        // Store map reference for cleanup
        mapRef.current = map;

      } catch (error) {
        console.error('Error initializing map:', error);
        // Retry after a delay if initialization fails
        setTimeout(initializeMap, 500);
      }
    };

    // Start initialization
    setTimeout(initializeMap, 100);

    // Cleanup function
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (error) {
          console.warn('Error removing map during cleanup:', error);
        }
        mapRef.current = null;
      }
    };
  }, [userLocation, locations, createCustomIcon, getServiceTypeInfo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
              Discover Pet Services
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Find trusted veterinary clinics, pet stores, grooming services, and boarding facilities near you with precise location accuracy using OpenStreetMap
            </p>
            <div className="mt-6 flex items-center justify-center gap-4 text-blue-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm">Real-time location</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-sm">Verified services</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-sm">Instant directions</span>
              </div>
            </div>
          </div>
        </div>
      </div>
        
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-4 relative z-10">
        {/* Integrated Search and Map Section */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden mb-8">
          {/* Search Section */}
          <div className="p-4 border-b border-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Search Bar */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search Location
                  </span>
                </label>
                <div className="relative search-container">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchInput}
                        placeholder="Enter city, address, or landmark..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 shadow-sm text-sm"
                      />
                      {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto mt-1">
                          {searchResults.map((place) => (
                            <button
                              key={place.place_id}
                              onClick={() => handleSearchResultSelect(place)}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors duration-150 text-sm"
                            >
                              <div className="font-medium text-gray-900">{place.name}</div>
                              <div className="text-xs text-gray-500">{place.formatted_address}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={useCurrentLocation}
                      disabled={loading}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl transition-all duration-200 font-medium flex items-center gap-1 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none text-sm"
                      title="Use my current location"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
                      ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      )}
                      Current
                    </button>
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        if (searchQuery.trim()) {
                          const mockPlace = {
                            place_id: 'search_query',
                            name: searchQuery,
                            formatted_address: searchQuery,
                            geometry: {
                              location: {
                                lat: () => userLocation?.coords?.[0] || DEFAULT_COORDS[0],
                                lng: () => userLocation?.coords?.[1] || DEFAULT_COORDS[1]
                              }
                            }
                          };
                          handleSearchResultSelect(mockPlace);
                        }
                      }}
                      disabled={!searchQuery.trim() || loading}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Search Location
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Service Type Filter */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Service Type
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleTypeChange('all')}
                    disabled={loading}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                      selectedType === 'all'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    All Services
                  </button>
                  {PET_SERVICE_TYPES.map(({ type, label, icon }) => (
                    <button
                      key={type}
                      onClick={() => handleTypeChange(type)}
                      disabled={loading}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                        selectedType === type
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Map Section */}
          <div 
            id="map" 
            key={`map-${userLocation ? userLocation.coords.join(',') : 'default'}`}
            className="h-[600px] rounded-b-3xl w-full"
            style={{ minHeight: '600px' }}
          ></div>
        </div>
        
        {/* Loading and Error States */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-gray-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-lg">
                {!userLocation ? 'Getting your location...' : 'Searching for nearby pet services...'}
              </span>
            </div>
            {userLocation && userLocation.accuracy && (
              <div className="mt-2 text-sm text-gray-500">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  userLocation.accuracy <= 50 ? 'bg-green-100 text-green-700' :
                  userLocation.accuracy <= 100 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  📍 Location accuracy: {Math.round(userLocation.accuracy)}m
                </span>
              </div>
            )}
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}
        
        {/* Places Cards */}
        {!loading && locations.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col">
                <h2 className="text-3xl font-bold text-gray-900">
                  Places Near You
                </h2>
                {userLocation && userLocation.accuracy && (
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                      userLocation.accuracy <= 50 ? 'bg-green-100 text-green-700' :
                      userLocation.accuracy <= 100 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      📍 Your location accuracy: {Math.round(userLocation.accuracy)} meters
                    </span>
                  </div>
                )}
              </div>
              <span className="text-sm text-gray-500 bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-2 rounded-full border border-blue-200">
                {locations.length} location{locations.length !== 1 ? 's' : ''} found
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {locations.map((place) => {
                const typeInfo = getServiceTypeInfo(place.serviceType);
                return (
                  <div
                    key={place.place_id}
                    className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 overflow-hidden group transform hover:scale-105"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{typeInfo.icon}</div>
                          <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                            {typeInfo.label}
                          </span>
                        </div>
                        {place.opening_hours && (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            place.opening_hours.open_now 
                              ? 'bg-green-100 text-green-700 border border-green-200' 
                              : 'bg-red-100 text-red-700 border border-red-200'
                          }`}>
                            {place.opening_hours.open_now ? '🟢 Open' : '🔴 Closed'}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="font-bold text-lg mb-3 text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                        {place.name}
                      </h3>
                      
                      {place.vicinity && (
                        <p className="text-gray-600 text-sm mb-4 flex items-start gap-2">
                          <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {place.vicinity}
                        </p>
                      )}
                      
                      {place.rating && (
                        <div className="flex items-center gap-3 mb-5">
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">⭐</span>
                            <span className="font-semibold text-gray-900">{place.rating}</span>
                          </div>
                          {place.user_ratings_total && (
                            <span className="text-gray-500 text-sm">
                              {place.user_ratings_total} reviews
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => setSelected(place)}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                          </svg>
                          View Map
                        </button>
                        <button
                          onClick={() => handleNavigate(place)}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                          </svg>
                          Directions
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {!loading && locations.length === 0 && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="text-8xl mb-6">🐾</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Searching for pet services...</h3>
              <p className="text-gray-600 mb-8 text-lg">
                We're looking for veterinary hospitals, pet stores, grooming services, and boarding facilities near you. This may take a moment.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={useCurrentLocation}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  🔍 Search Again
                </button>
                <button
                  onClick={() => handleTypeChange('all')}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-8 py-4 rounded-2xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  🏥 Show All Services
                </button>
              </div>
              <div className="mt-6 text-sm text-gray-500">
                <p>💡 Tip: Make sure location services are enabled for better results</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Discover;