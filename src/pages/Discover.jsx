import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = "AIzaSyCoPzRJLAmma54BBOyF4AhZ2ZIqGvak8CA";
const DEFAULT_COORDS = { lat: 9.3977, lng: 76.8861 }; 
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
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
  const [loading, setLoading] = useState(false); // Start with false for faster initial render
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

  // Memoize the loader options to prevent re-creation
  const loaderOptions = useMemo(() => ({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places']
  }), []);

  const { isLoaded, loadError } = useJsApiLoader(loaderOptions);

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

  // Optimized search with caching
  const searchNearbyPlaces = useCallback(async (lat, lng, type = null) => {
    try {
      if (!window.google || !window.google.maps) {
        throw new Error('Google Maps not loaded');
      }

      // Create cache key
      const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}_${type || 'all'}`;
      
      // Check cache first
      if (searchCacheRef.current.has(cacheKey)) {
        const cached = searchCacheRef.current.get(cacheKey);
        if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
          return cached.data;
        }
      }

      const service = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );

      const searchPromises = [];

      if (type && type !== 'all') {
        const request = {
          location: new window.google.maps.LatLng(lat, lng),
          radius: 5000,
          type: type
        };
        
        searchPromises.push(
          new Promise((resolve) => {
            service.nearbySearch(request, (results, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                resolve(results.map(place => ({
                  ...place,
                  serviceType: type
                })));
              } else {
                console.log(`Places API search failed for ${type}:`, status);
                resolve([]);
              }
            });
          })
        );
      } else {
        // Search all types in parallel
        const promises = PET_SERVICE_TYPES.map(({ type: serviceType }) => {
          const request = {
            location: new window.google.maps.LatLng(lat, lng),
            radius: 5000,
            type: serviceType
          };
          
          return new Promise((resolve) => {
              service.nearbySearch(request, (results, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                  resolve(results.map(place => ({
                    ...place,
                    serviceType: serviceType
                  })));
                } else {
                  console.log(`Places API search failed for ${serviceType}:`, status);
                  resolve([]);
                }
              });
        });
        });
        
        searchPromises.push(...promises);
      }

      const results = await Promise.all(searchPromises);
      const flatResults = results.flat();
      
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

  // Debounced search places by text query
  const debouncedSearchPlaces = useMemo(
    () => debounce(async (query) => {
    try {
      if (!window.google || !window.google.maps || !query.trim()) {
        return [];
      }

      const service = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );

      const request = { query: query };

      return new Promise((resolve) => {
        service.textSearch(request, (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            resolve(results);
          } else {
            if (status !== 'ZERO_RESULTS') {
              console.log('Text search failed:', status);
            }
            resolve([]);
          }
        });
      });
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
          
          setUserLocation(DEFAULT_COORDS);
          setError(errorMessage);
          
          if (isLoaded) {
            const places = await searchNearbyPlaces(DEFAULT_COORDS.lat, DEFAULT_COORDS.lng, selectedType);
            setLocations(places);
          }
          setLoading(false);
          return;
        }

        if (position) {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          
          // Save to cache
          saveLocationToCache(coords, position.coords.accuracy);
          
          console.log('Location obtained:', coords.accuracy, 'meters accuracy');
          setUserLocation(coords);
          setSearchQuery('My Current Location');
          
          if (isLoaded) {
            const places = await searchNearbyPlaces(coords.lat, coords.lng, selectedType);
            setLocations(places);
          }
        }
        
      } catch (error) {
        console.error('Location initialization failed:', error);
        setUserLocation(DEFAULT_COORDS);
        setError('Unable to get your location. Using default location.');
        
        if (isLoaded) {
          try {
            const places = await searchNearbyPlaces(DEFAULT_COORDS.lat, DEFAULT_COORDS.lng, selectedType);
            setLocations(places);
          } catch (placesError) {
            console.error('Error loading default location places:', placesError);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    if (isLoaded) {
      initializeLocation();
    }
  }, [isLoaded, selectedType, loadCachedLocation, saveLocationToCache, searchNearbyPlaces, getLocationAccurate]);

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
      const location = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      };
      
      setUserLocation(location);
      setSearchQuery(place.name);
      setShowSearchResults(false);
      setSearchResults([]);
      setLoading(true);
      
      const places = await searchNearbyPlaces(location.lat, location.lng, selectedType);
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
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        
        // Save to cache
        saveLocationToCache(coords, position.coords.accuracy);
        
        console.log('Location obtained:', coords.accuracy, 'meters accuracy');
        setUserLocation(coords);
        setSearchQuery('My Current Location');
        
          const places = await searchNearbyPlaces(coords.lat, coords.lng, selectedType);
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
    
    if (userLocation) {
      try {
        const places = await searchNearbyPlaces(userLocation.lat, userLocation.lng, type);
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
    if (!userLocation) return;
    try {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${loc.geometry.location.lat()},${loc.geometry.location.lng()}`;
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

  // Memoized map options for better performance
  const mapOptions = useMemo(() => ({
    styles: [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }]
      }
    ],
    zoomControl: true,
    mapTypeControl: false,
    scaleControl: true,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: true
  }), []);

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center text-red-500 p-8">
          <div className="text-6xl mb-4">🗺️</div>
          <h2 className="text-2xl font-bold mb-2">Failed to load Google Maps</h2>
          <p className="text-gray-600">Please check your internet connection and try again.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center text-gray-500 p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">Loading Maps...</h2>
          <p className="text-gray-600">Preparing your location services</p>
        </div>
      </div>
    );
  }

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
              Find trusted veterinary clinics, pet stores, grooming services, and boarding facilities near you with precise location accuracy
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
                                lat: () => userLocation?.lat || DEFAULT_COORDS.lat,
                                lng: () => userLocation?.lng || DEFAULT_COORDS.lng
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
          <div className="h-[600px]">
            {userLocation && (
              <GoogleMap
                key="discover-map"
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={userLocation}
                zoom={DEFAULT_ZOOM}
                onLoad={map => (mapRef.current = map)}
                options={mapOptions}
              >
                {/* User marker */}
                <Marker
                  position={userLocation}
                  icon={{
                    url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                    scaledSize: new window.google.maps.Size(40, 40)
                  }}
                  title="You are here"
                />
                {/* Service locations */}
                {locations.map((loc) => {
                  const typeInfo = getServiceTypeInfo(loc.serviceType);
                  return (
                    <Marker
                      key={loc.place_id}
                      position={{
                        lat: loc.geometry.location.lat(),
                        lng: loc.geometry.location.lng()
                      }}
                      onClick={() => setSelected(loc)}
                      icon={{
                        url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                        scaledSize: new window.google.maps.Size(40, 40)
                      }}
                      title={loc.name}
                    />
                  );
                })}
                {/* InfoWindow for selected location */}
                {selected && (
                  <InfoWindow
                    position={{
                      lat: selected.geometry.location.lat(),
                      lng: selected.geometry.location.lng()
                    }}
                    onCloseClick={() => setSelected(null)}
                  >
                    <div className="space-y-3 max-w-xs">
                      <div className="font-bold text-lg text-gray-900">{selected.name}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="text-lg">{getServiceTypeInfo(selected.serviceType).icon}</span>
                        <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                          {getServiceTypeInfo(selected.serviceType).label}
                        </span>
                      </div>
                      {selected.vicinity && (
                        <div className="text-sm text-gray-500 flex items-start gap-2">
                          <span className="text-gray-400 mt-0.5">📍</span>
                          {selected.vicinity}
                        </div>
                      )}
                      {selected.rating && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            <span className="text-yellow-500 mr-1">⭐</span>
                            <span className="font-medium">{selected.rating}</span>
                          </div>
                          {selected.user_ratings_total && (
                            <span className="text-gray-500 text-sm">
                              ({selected.user_ratings_total} reviews)
                            </span>
                          )}
                        </div>
                      )}
                      {selected.opening_hours && (
                        <div className={`text-sm font-medium ${
                          selected.opening_hours.open_now ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {selected.opening_hours.open_now ? '🟢 Open Now' : '🔴 Closed'}
                        </div>
                      )}
                      <button
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                        onClick={() => handleNavigate(selected)}
                      >
                        🗺️ Get Directions
                      </button>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            )}
          </div>
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
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">No pet services found</h3>
              <p className="text-gray-600 mb-8 text-lg">
                Try expanding your search area or check different service types to find nearby pet services.
              </p>
              <button
                onClick={useCurrentLocation}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Use Current Location
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Discover;