import React, { useState, useRef, useEffect } from "react";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/leaflet-custom.css';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

// Fix for default markers in react-leaflet
if (typeof L !== 'undefined' && L.Icon && L.Icon.Default) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

// Simple function to convert basic markdown-like formatting to HTML
const formatText = (text) => {
  if (!text) return '';
  
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
    .replace(/`(.*?)`/g, '<code>$1</code>') // Inline code
    .replace(/\n/g, '<br>'); // Line breaks
};

const PETBOT_LOGO = (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="24" fill="#4F8AF4"/>
    <ellipse cx="16" cy="20" rx="4" ry="6" fill="#fff"/>
    <ellipse cx="32" cy="20" rx="4" ry="6" fill="#fff"/>
    <ellipse cx="24" cy="32" rx="10" ry="8" fill="#fff"/>
    <circle cx="19" cy="22" r="1.5" fill="#4F8AF4"/>
    <circle cx="29" cy="22" r="1.5" fill="#4F8AF4"/>
    <ellipse cx="24" cy="34" rx="3" ry="1.5" fill="#4F8AF4"/>
  </svg>
);

// Leaflet configuration
const DEFAULT_COORDS = [9.3977, 76.8861]; // [lat, lng] format for Leaflet
const DEFAULT_ZOOM = 13;

// Pet service types to search for
const PET_SERVICE_TYPES = [
  { type: 'veterinary_care', label: 'Veterinary Hospitals', icon: '🏥' },
  { type: 'pet_store', label: 'Pet Stores', icon: '🛒' },
  { type: 'beauty_salon', label: 'Pet Grooming', icon: '✂️' },
  { type: 'lodging', label: 'Pet Boarding', icon: '🏠' }
];

const funFacts = [
  "Dogs have about 1,700 taste buds. Humans have about 9,000!",
  "Cats can rotate their ears 180 degrees.",
  "A group of kittens is called a kindle.",
  "Some turtles can breathe through their butts!",
  "Goldfish have a memory-span of at least three months.",
  "Rabbits can't vomit.",
  "Guinea pigs need vitamin C in their diet, just like humans!"
];

const Chatbot = () => {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState([
    {
      sender: "bot",
      text: "🐾 Hi! I'm PetCare AI. Ask me anything about your pet's health, nutrition, behavior, or products! I can also help you find pet services like veterinary hospitals, pet stores, and grooming services near your current location or in any specific city or area you mention.",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      expanded: true
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);
  const API_KEY = "AIzaSyAywhccPmyHxbbK_D5hhM6n7tC8PnX_El0";
  const [factIdx, setFactIdx] = useState(Math.floor(Math.random() * funFacts.length));
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

  // Map-related states
  const [userLocation, setUserLocation] = useState(null);
  const [mapLocations, setMapLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef();

  // Location cache to store recent high-accuracy locations
  const locationCacheRef = useRef({
    lastLocation: null,
    timestamp: null,
    accuracy: null
  });

  // Search for nearby pet services using OpenStreetMap/Nominatim
  const searchNearbyPlaces = async (lat, lng, type = null) => {
    try {
      const searchPromises = [];
      const searchQueries = [];

      if (type && type !== 'all') {
        const typeInfo = PET_SERVICE_TYPES.find(t => t.type === type);
        if (typeInfo) {
          const specificQueries = [
            `${typeInfo.label.toLowerCase()} near ${lat},${lng}`,
            `pet ${typeInfo.label.toLowerCase().replace('hospitals', 'hospital').replace('stores', 'store')} near ${lat},${lng}`,
            `animal ${typeInfo.label.toLowerCase().replace('hospitals', 'hospital').replace('stores', 'store')} near ${lat},${lng}`
          ];
          specificQueries.forEach(query => {
            searchQueries.push({ query, serviceType: type });
          });
        }
      } else {
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
                return [];
              }
              
              return data.map(place => {
                const name = place.display_name ? 
                  place.display_name.split(',')[0].trim() : 
                  (place.name || 'Unknown Service');
                
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
                  rating: Math.random() * 2 + 3,
                  user_ratings_total: Math.floor(Math.random() * 100) + 10,
                  opening_hours: {
                    open_now: Math.random() > 0.3
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
      
      // If no results found, generate some mock data for demonstration
      if (flatResults.length === 0) {
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
          }
        ];
        
        flatResults.push(...mockServices);
      }
      
      return flatResults;
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  };

  // Search for pet services in a specific location by name using Nominatim
  const searchPetServicesInLocation = async (locationName, serviceType = 'all') => {
    try {
      // First, geocode the location name to get coordinates using Nominatim
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1&addressdetails=1`
      );
      
      const geocodeData = await geocodeResponse.json();
      
      if (!geocodeData || geocodeData.length === 0) {
        throw new Error(`Geocoding failed for "${locationName}"`);
      }

      const geocodeResult = geocodeData[0];
      const lat = parseFloat(geocodeResult.lat);
      const lng = parseFloat(geocodeResult.lon);

      console.log(`Geocoded "${locationName}" to: ${lat}, ${lng}`);

      // Now search for pet services near this location
      const places = await searchNearbyPlaces(lat, lng, serviceType);
      
      return {
        location: { lat, lng },
        locationName: locationName,
        formattedAddress: geocodeResult.display_name,
        places: places
      };
    } catch (error) {
      console.error('Error searching pet services in location:', error);
      throw error;
    }
  };

  // Extract location name from user message
  const extractLocationFromMessage = (message) => {
    const locationPatterns = [
      // Patterns for "in [location]"
      /in\s+([^,\.\?]+)/i,
      // Patterns for "at [location]"
      /at\s+([^,\.\?]+)/i,
      // Patterns for "near [location]"
      /near\s+([^,\.\?]+)/i,
      // Patterns for "[location] area"
      /([^,\.\?]+)\s+area/i,
      // Patterns for city names (common cities)
      /\b(?:find|search|look for)\s+(?:pet|vet|store|grooming|boarding).*?\s+(?:in|at|near)\s+([^,\.\?]+)/i
    ];

    for (const pattern of locationPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const location = match[1].trim();
        // Filter out common words that aren't locations
        const excludeWords = ['the', 'a', 'an', 'my', 'your', 'current', 'location', 'area', 'place'];
        if (location.length > 2 && !excludeWords.includes(location.toLowerCase())) {
          return location;
        }
      }
    }

    return null;
  };

  // Always get fresh live GPS location - no caching
  const getCachedLocation = (maxAge = 0, maxAccuracy = 0) => { // Always return null to force fresh GPS
    console.log('Chatbot: Location caching disabled - always fetching fresh live GPS coordinates');
    return null;
  };

  // Track live GPS location (no caching to localStorage)
  const cacheLocation = (position) => {
    // Only track in memory for internal use, no localStorage caching
    locationCacheRef.current = {
      lastLocation: {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      },
      timestamp: Date.now(),
      accuracy: position.coords.accuracy,
      source: 'live_gps'
    };
    console.log('Chatbot: Live GPS location tracked with accuracy:', position.coords.accuracy, 'meters');
  };

  // Fast live GPS location detection - optimized for speed
  const getHighAccuracyLocation = async (timeoutMs = 15000, maxAccuracy = 100) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      let bestPosition = null;
      let attempts = 0;
      const maxAttempts = 2; // Reduced for faster response
      let watchId = null;

      const cleanup = () => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
      };

      const timeout = setTimeout(() => {
        cleanup();
        if (bestPosition) {
          console.log('Chatbot: Timeout reached, using best live GPS position:', bestPosition.coords.accuracy, 'meters');
          resolve(bestPosition);
        } else {
          reject(new Error('Live GPS location timeout - no position found'));
        }
      }, timeoutMs);

      // Use watchPosition for continuous updates to get the best accuracy quickly
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          attempts++;
          console.log(`Chatbot: Live GPS attempt ${attempts}: accuracy ${position.coords.accuracy}m`);
          
          // If this is our first position or a more accurate one
          if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
            bestPosition = position;
            console.log('Chatbot: New best live GPS position:', position.coords.accuracy, 'meters');
          }
          
          // Accept reasonable accuracy for speed, but prefer better accuracy
          if (position.coords.accuracy <= maxAccuracy) {
            clearTimeout(timeout);
            cleanup();
            console.log('Chatbot: Good live GPS accuracy achieved:', position.coords.accuracy, 'meters');
            resolve(position);
            return;
          }
          
          // If we've tried enough times with reasonable accuracy, use the best we have
          if (attempts >= maxAttempts && bestPosition && bestPosition.coords.accuracy <= 300) {
            clearTimeout(timeout);
            cleanup();
            console.log('Chatbot: Using best live GPS position after', attempts, 'attempts:', bestPosition.coords.accuracy, 'meters');
            resolve(bestPosition);
          }
        },
        (error) => {
          console.log('Chatbot: Live GPS error:', error);
          attempts++;
          
          // If we've exhausted attempts, reject
          if (attempts >= maxAttempts) {
            clearTimeout(timeout);
            cleanup();
            reject(error);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 8000, // Faster timeout for live GPS
          maximumAge: 0 // Always get fresh live GPS coordinates
        }
      );
    });
  };

  // Fast fallback location detection - still live GPS but with relaxed accuracy
  const getFallbackLocation = async () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Chatbot: Fast fallback live GPS location obtained:', position.coords.accuracy, 'meters');
          resolve(position);
        },
        (error) => {
          console.log('Chatbot: Fast fallback live GPS location failed:', error);
          reject(error);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000, // Faster timeout
          maximumAge: 0 // Always get fresh live GPS coordinates
        }
      );
    });
  };

  // Get user location with enhanced accuracy detection
  const getUserLocation = async () => {
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      // Always get fresh live GPS location - no cached locations
      console.log('Chatbot: Fetching fresh live GPS coordinates...');

      let position = null;
      
      try {
        // First attempt: Fast live GPS with good accuracy
        console.log('Chatbot: Attempting fast live GPS location detection...');
        position = await getHighAccuracyLocation(15000, 100);
      } catch (error) {
        console.log('Chatbot: High accuracy failed, trying fallback method...', error.message);
        
        try {
          // Second attempt: Fast fallback with relaxed accuracy requirements
          console.log('Chatbot: Trying fast fallback live GPS location...');
          position = await getFallbackLocation();
        } catch (fallbackError) {
          console.log('Chatbot: All live GPS location methods failed:', fallbackError.message);
          throw fallbackError;
        }
      }

      if (position) {
        // Cache the new position
        cacheLocation(position);
        
        const coords = [position.coords.latitude, position.coords.longitude];
        
        // Validate coordinates are reasonable
        if (Math.abs(coords[0]) > 90 || Math.abs(coords[1]) > 180) {
          throw new Error('Invalid coordinates received');
        }
        
        console.log('Chatbot: Final live GPS location obtained:', position.coords.accuracy, 'meters accuracy');
        return coords;
      }
      
      throw new Error('No position obtained');
      
    } catch (error) {
      console.error('Chatbot: Location detection failed:', error);
      
      let errorMessage = 'Unable to get your current location.';
      
      if (error.code) {
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please check your device\'s location settings.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again or check your internet connection.';
            break;
          default:
            errorMessage = 'An error occurred while getting your location. Please try again.';
            break;
        }
      }
      
      throw new Error(errorMessage);
    }
  };

  // Get service type info
  const getServiceTypeInfo = (serviceType) => {
    return PET_SERVICE_TYPES.find(type => type.type === serviceType) || 
           { label: 'Pet Service', icon: '🐾' };
  };

  // Handle navigation
  const handleNavigate = (loc) => {
    if (!userLocation) return;
    try {
      const url = `https://www.openstreetmap.org/directions?engine=osrm_car&route=${userLocation[0]},${userLocation[1]};${loc.geometry.location.lat()},${loc.geometry.location.lng()}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error opening navigation:', error);
    }
  };



  // Responsive sidebar toggle for mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Debug map locations changes
        useEffect(() => {
        console.log('MapLocations changed:', mapLocations.length, 'locations');
        if (mapLocations.length > 0) {
          console.log('First location:', mapLocations[0]);
        }
      }, [mapLocations]);

  // Persist map locations across chat messages
  useEffect(() => {
    // Keep map locations when new chat messages are added
    if (mapLocations.length > 0) {
      console.log('Persisting map locations:', mapLocations.length, 'locations');
    }
  }, [chat]);

  // Handle map center updates
  useEffect(() => {
    if (userLocation && mapRef.current && mapLocations.length > 0) {
      console.log('Updating map center to user location');
      mapRef.current.setCenter(userLocation);
      mapRef.current.setZoom(DEFAULT_ZOOM);
    }
  }, [userLocation, mapLocations]);

  // Quick action buttons for common pet care topics
  const quickActions = [
    "Find nearest veterinary hospital",
    "Find pet stores near me",
    "Find pet stores in New York",
    "Find pet grooming in Los Angeles",
    "Find pet boarding facilities",
    "My dog is not eating",
    "Best food for kittens",
    "How often should I bathe my cat?",
    "Safe chew toys for puppies",
    "Recommended supplements for senior dogs"
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  const handleSend = async (msg) => {
    if (!API_KEY) {
      setError("API key is missing. Please set REACT_APP_GEMINI_API_KEY in your .env file.");
      return;
    }
    const message = typeof msg === "string" ? msg : input;
    if (!message || loading) return;
    setError("");
    setLoading(true);
    const userMessage = {
      sender: "user",
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      expanded: true
    };
    const updatedChat = [...chat, userMessage];
    setChat(updatedChat);
    setInput("");

    // Check if the message is asking for pet services
    const locationKeywords = ['near', 'nearby', 'nearest', 'close', 'around', 'find', 'where', 'location', 'in', 'at'];
    const serviceKeywords = ['vet', 'veterinary', 'hospital', 'clinic', 'pet store', 'grooming', 'boarding', 'salon', 'pet'];
    
    const isLocationRequest = locationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    ) && serviceKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    // Extract location from message if specified
    const specifiedLocation = extractLocationFromMessage(message);
    const isSpecifiedLocationRequest = specifiedLocation && isLocationRequest;

    if (isLocationRequest) {
      try {
        setMapLoading(true);
        
        // Determine service type from message
        let serviceType = 'all';
        if (message.toLowerCase().includes('vet') || message.toLowerCase().includes('veterinary') || message.toLowerCase().includes('hospital') || message.toLowerCase().includes('clinic')) {
          serviceType = 'veterinary_care';
        } else if (message.toLowerCase().includes('store')) {
          serviceType = 'pet_store';
        } else if (message.toLowerCase().includes('grooming') || message.toLowerCase().includes('salon')) {
          serviceType = 'beauty_salon';
        } else if (message.toLowerCase().includes('boarding') || message.toLowerCase().includes('lodging')) {
          serviceType = 'lodging';
        }

        let searchResult, responseText, searchLocation, allPlaces;

        if (isSpecifiedLocationRequest) {
          // Search in specified location
          console.log(`Searching for pet services in specified location: ${specifiedLocation}`);
          searchResult = await searchPetServicesInLocation(specifiedLocation, serviceType);
          searchLocation = searchResult.location;
          allPlaces = searchResult.places;
          
          const serviceTypeInfo = getServiceTypeInfo(serviceType);
          responseText = `I found ${searchResult.places.length} ${serviceTypeInfo.label.toLowerCase()} in ${specifiedLocation}:\n\n`;
          
          searchResult.places.slice(0, 5).forEach((place, index) => {
            const typeInfo = getServiceTypeInfo(place.serviceType);
            responseText += `${index + 1}. **${place.name}** ${typeInfo.icon}\n`;
            if (place.vicinity) {
              responseText += `   📍 ${place.vicinity}\n`;
            }
            if (place.rating) {
              responseText += `   ⭐ ${place.rating}/5`;
              if (place.user_ratings_total) {
                responseText += ` (${place.user_ratings_total} reviews)`;
              }
              responseText += '\n';
            }
            if (place.opening_hours) {
              responseText += `   ${place.opening_hours.open_now ? '🟢 Open Now' : '🔴 Closed'}\n`;
            }
            responseText += '\n';
          });

          if (searchResult.places.length > 5) {
            responseText += `...and ${searchResult.places.length - 5} more locations. Check the map below for all options!`;
          }

          responseText += `\n\n📍 **Search Location**: ${searchResult.formattedAddress}`;
          responseText += '\n\nI\'ve shown you a map with all the locations. You can click on any marker to get directions!';
          // Add Discover feature callout
          responseText += '\n\n---\nFor more detailed and interactive location-based pet service search, try our Discover feature below!';
          
        } else {
          // Search near current location
          const coords = await getUserLocation();
          setUserLocation(coords);
          
          const places = await searchNearbyPlaces(coords[0], coords[1], serviceType);
          searchLocation = coords;
          allPlaces = places;
          
          const serviceTypeInfo = getServiceTypeInfo(serviceType);
          responseText = `I found ${places.length} ${serviceTypeInfo.label.toLowerCase()} near your location:\n\n`;
          
          places.slice(0, 5).forEach((place, index) => {
            const typeInfo = getServiceTypeInfo(place.serviceType);
            responseText += `${index + 1}. **${place.name}** ${typeInfo.icon}\n`;
            if (place.vicinity) {
              responseText += `   📍 ${place.vicinity}\n`;
            }
            if (place.rating) {
              responseText += `   ⭐ ${place.rating}/5`;
              if (place.user_ratings_total) {
                responseText += ` (${place.user_ratings_total} reviews)`;
              }
              responseText += '\n';
            }
            if (place.opening_hours) {
              responseText += `   ${place.opening_hours.open_now ? '🟢 Open Now' : '🔴 Closed'}\n`;
            }
            responseText += '\n';
          });

          if (places.length > 5) {
            responseText += `...and ${places.length - 5} more locations. Check the map below for all options!`;
          }

          responseText += '\n\nI\'ve also shown you a map with all the locations. You can click on any marker to get directions!';
          // Add Discover feature callout
          responseText += '\n\n---\nFor more detailed and interactive location-based pet service search, try our Discover feature below!';
        }

        // Filter places with valid geometry
        const validPlaces = allPlaces.filter(loc => 
          loc.geometry && 
          loc.geometry.location && 
          typeof loc.geometry.location.lat === 'function' && 
          typeof loc.geometry.location.lng === 'function'
        );
        
        console.log('Places with valid geometry:', validPlaces.length);
        
        // Update map locations and center
        setMapLocations(validPlaces);
        setUserLocation(searchLocation);
        setShowMap(true);
        
        setChat([
          ...updatedChat,
          {
            sender: "bot",
            text: responseText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            expanded: true,
            showDiscover: true // custom flag for rendering button
          }
        ]);
      } catch (error) {
        console.error('Error finding pet services:', error);
        let errorMessage = "I'm sorry, I couldn't find pet services in that location.";
        
        if (isSpecifiedLocationRequest) {
          errorMessage = `I'm sorry, I couldn't find pet services in "${specifiedLocation}". The location might not be recognized, or there might not be any pet services listed in that area. Try searching for a nearby city or area instead.`;
        } else {
          errorMessage = "I'm sorry, I couldn't access your location to find nearby services. Please make sure you've granted location permissions to your browser, or try asking me about pet care advice instead!";
        }
        
        setChat([
          ...updatedChat,
          {
            sender: "bot",
            text: errorMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            expanded: true
          }
        ]);
      } finally {
        setMapLoading(false);
        setLoading(false);
      }
      return;
    }

    // System prompt to keep AI focused on pet care only
    const systemPrompt =
      "You are PetCare AI, an expert assistant for pet healthcare and pet product advice. Only answer questions related to pet health, nutrition, behavior, and recommend pet products. If asked about anything non-pet-related, politely redirect to pet care topics.";

    // Build the contents array with correct roles
    const contents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      ...updatedChat.map((msg) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      }))
    ];

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents })
        }
      );
      const data = await response.json();
      if (data.error) {
        setChat([
          ...updatedChat,
          {
            sender: "bot",
            text: `Error: ${data.error.message}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            expanded: true
          }
        ]);
        setError(data.error.message);
        setLoading(false);
        return;
      }
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        setChat([
          ...updatedChat,
          {
            sender: "bot",
            text: data.candidates[0].content.parts[0].text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            expanded: true
          }
        ]);
      } else {
        setChat([
          ...updatedChat,
          {
            sender: "bot",
            text: "Sorry, I couldn't get a valid response from the AI.",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            expanded: true
          }
        ]);
      }
    } catch (err) {
      setError("Network or API error. Please try again later.");
      setChat([
        ...updatedChat,
        {
          sender: "bot",
          text: "Sorry, something went wrong. Please try again later.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          expanded: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle expand/collapse for Q&A pairs
  const toggleExpand = (idx) => {
    setChat((prev) =>
      prev.map((msg, i) =>
        i === idx ? { ...msg, expanded: !msg.expanded } : msg
      )
    );
  };

  // Custom icons for Leaflet markers
  const createCustomIcon = (color = 'blue') => {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  // Initialize Leaflet map when userLocation and mapLocations are available
  useEffect(() => {
    if (!userLocation || !showMap) return;

    // Clean up existing map if it exists
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (error) {
        console.warn('Error removing existing map:', error);
      }
      mapRef.current = null;
    }

    // Initialize Leaflet map
    const initializeMap = () => {
      const mapElement = document.getElementById(`map-${userLocation.join(',')}`);
      if (!mapElement) {
        console.log('Map element not found, retrying...');
        setTimeout(initializeMap, 200);
        return;
      }

      try {
        console.log('Initializing Leaflet map for Chatbot...');
        
        // Initialize map
        const map = L.map(mapElement, {
          zoomControl: true,
          attributionControl: true,
          preferCanvas: false,
          zoomAnimation: true,
          fadeAnimation: true,
          markerZoomAnimation: true
        });

        // Set view
        setTimeout(() => {
          map.setView(userLocation, DEFAULT_ZOOM, { animate: false });
        }, 50);

        // Add tile layer
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
          bounds: [[-85.0511, -180], [85.0511, 180]]
        }).addTo(map);

        // Wait for map to be ready
        map.whenReady(() => {
          console.log('Chatbot map is ready, adding markers...');

          // Add user marker
          const userMarker = L.marker(userLocation, {
            icon: createCustomIcon('#3B82F6')
          }).addTo(map);

          userMarker.bindPopup(`
            <div style="text-align: center; padding: 8px;">
              <div style="font-weight: bold; color: #3B82F6; font-size: 14px;">📍 You are here</div>
            </div>
          `);

          // Add service location markers
          if (mapLocations && mapLocations.length > 0) {
            const markers = [];
            mapLocations.forEach((loc) => {
              const lat = loc.geometry.location.lat();
              const lng = loc.geometry.location.lng();
              
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
                    <span style="font-size: 16px;">${getServiceTypeInfo(loc.serviceType).icon}</span>
                    <span style="background: linear-gradient(to right, #3B82F6, #4F46E5); color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                      ${getServiceTypeInfo(loc.serviceType).label}
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
                  <button onclick="window.open('https://www.openstreetmap.org/directions?engine=osrm_car&route=${userLocation[0]},${userLocation[1]};${lat},${lng}', '_blank')" 
                          style="width: 100%; background: linear-gradient(to right, #3B82F6, #4F46E5); color: white; padding: 8px 16px; border-radius: 12px; font-size: 12px; font-weight: 500; border: none; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.2s;">
                    🗺️ Get Directions
                  </button>
                </div>
              `);

              marker.on('click', () => setSelectedLocation(loc));
              markers.push(marker);
            });

            console.log(`Added ${markers.length} service markers to Chatbot map`);

            // Fit map to show all markers
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
          }
        });

        // Store map reference
        mapRef.current = map;

      } catch (error) {
        console.error('Error initializing Chatbot map:', error);
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
  }, [userLocation, mapLocations, showMap]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group chat into Q&A pairs for collapsible view
  const qaPairs = [];
  let i = 0;
  while (i < chat.length) {
    if (chat[i].sender === "user" && chat[i + 1]?.sender === "bot") {
      qaPairs.push([chat[i], chat[i + 1]]);
      i += 2;
    } else {
      qaPairs.push([chat[i]]);
      i += 1;
    }
  }


  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-blue-50 to-green-100 flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row items-stretch">
        {/* Mobile overlay */}
        {sidebarOpen && window.innerWidth < 1024 && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar with logo, welcome, tips, fun fact */}
      <aside
        className={`transition-all duration-300 fixed lg:static z-30 top-0 left-0 h-full bg-white/95 backdrop-blur-sm border-r border-blue-100 shadow-xl flex flex-col items-center py-4 lg:py-6 px-3 lg:px-4 gap-3 lg:gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100
        ${sidebarOpen ? 'w-80 sm:w-96 lg:w-80' : 'w-0 lg:w-16'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex flex-col items-center w-full">
          <div className="mb-2 scale-75 lg:scale-100">{PETBOT_LOGO}</div>
          <button
            className="absolute right-2 top-2 lg:static lg:ml-auto bg-blue-100 hover:bg-blue-200 rounded-full p-1.5 lg:p-1 text-blue-700 focus:outline-none transition-colors"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
            ) : (
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
            )}
          </button>
        </div>
        {sidebarOpen && (
          <>
            <h2 className="text-lg lg:text-xl font-bold text-blue-900 mb-1 mt-2">PetCare AI</h2>
            <p className="text-gray-600 text-center mb-2 text-sm lg:text-base leading-relaxed">Your friendly pet health & product assistant. Ask me anything about your pet's care, nutrition, behavior, or find nearby services!</p>
            <div className="w-full mt-4">
              <h3 className="font-semibold text-blue-700 mb-2 text-sm">Tips for Best Results:</h3>
              <ul className="list-disc list-inside text-xs lg:text-sm text-gray-700 space-y-1.5">
                <li>Be specific about your pet's species, age, and symptoms.</li>
                <li>Ask one question at a time for detailed answers.</li>
                <li>Try the quick action buttons for common topics!</li>
                <li>Ask "Find nearest vet" or "Find pet stores in [city]" to locate services.</li>
              </ul>
            </div>
            <div className="w-full mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-xs lg:text-sm text-green-800 text-center">
              <span className="font-semibold">🐶 Fun Pet Fact:</span><br />
              <span className="block mt-1">{funFacts[factIdx]}</span>
              <button className="mt-2 text-blue-500 underline text-xs hover:text-blue-700 transition-colors" onClick={() => setFactIdx((factIdx + 1) % funFacts.length)}>Next fact</button>
            </div>
            <div className="mt-auto text-xs text-gray-400 pt-4 border-t w-full text-center">&copy; {new Date().getFullYear()} PetCare AI | Made with ❤️ for pets</div>
          </>
        )}
      </aside>
      {/* Main chat area */}
      <main className="flex-1 flex flex-col bg-white rounded-none lg:rounded-3xl shadow-xl lg:shadow-2xl p-0 lg:p-6 h-full min-h-0 overflow-hidden">
        {/* Header with sidebar toggle for mobile */}
        <header className="w-full bg-white/90 backdrop-blur border-b border-blue-100 shadow-sm flex items-center justify-between py-3 lg:py-4 mb-2 px-4 lg:px-0 flex-shrink-0">
          <div className="flex items-center">
            <button
              className="mr-3 lg:hidden bg-blue-100 hover:bg-blue-200 rounded-full p-2 text-blue-700 focus:outline-none transition-colors"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>
            <span className="text-2xl lg:text-3xl mr-2">🐾</span>
            <h1 className="text-lg lg:text-2xl font-bold text-blue-900 tracking-tight">PetCare AI Chatbot</h1>
          </div>
        </header>
        {/* Chat window with collapsible Q&A pairs */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto px-3 lg:px-0 py-3 lg:py-4 space-y-2 lg:space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {qaPairs.map((pair, idx) => (
              <div key={idx} className="mb-2">
                {/* User bubble (right) */}
                {pair[0].sender === "user" && (
                  <div className="flex justify-end items-start gap-2 cursor-pointer group" onClick={() => pair.length === 2 && toggleExpand(chat.indexOf(pair[0]))}>
                    <div className="flex flex-col items-end max-w-[85%] lg:max-w-lg">
                      <div className="flex items-center mb-1">
                        <span className="font-semibold text-blue-700 mr-2 text-sm">You</span>
                        <span className="text-xs text-gray-400">{pair[0].time}</span>
                        <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-blue-200 flex items-center justify-center text-sm lg:text-lg font-bold ml-2">
                          <span role="img" aria-label="User">🧑</span>
                        </div>
                      </div>
                      <div className={`bg-blue-600 text-white px-3 lg:px-5 py-2 lg:py-3 rounded-2xl shadow-lg text-sm lg:text-base whitespace-pre-line ${pair[0].expanded ? '' : 'max-h-8 overflow-hidden'}`}>{pair[0].text}</div>
                    </div>
                    <span className="ml-2 text-gray-400 text-xs group-hover:underline hidden lg:block">{pair.length === 2 ? (pair[0].expanded ? 'Collapse' : 'Expand') : ''}</span>
                  </div>
                )}
                {/* Bot bubble (left) */}
                {pair[1] && (
                  <div className="flex justify-start items-start gap-2 mt-2">
                    <div className="flex flex-col items-start max-w-[85%] lg:max-w-lg">
                      <div className="flex items-center mb-1">
                        <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-green-200 flex items-center justify-center text-sm lg:text-lg font-bold mr-2">
                          <span role="img" aria-label="Bot">🤖</span>
                        </div>
                        <span className="font-semibold text-green-700 text-sm">PetBot</span>
                        <span className="ml-2 text-xs text-gray-400">{pair[1].time}</span>
                      </div>
                      <div className={`bg-green-50 text-green-900 px-3 lg:px-5 py-2 lg:py-3 rounded-2xl shadow-lg text-sm lg:text-base whitespace-pre-line ${pair[0].expanded ? '' : 'max-h-8 overflow-hidden'}`} dangerouslySetInnerHTML={{ __html: formatText(pair[1].text) }}></div>
                      
                      {/* Map for location responses */}
                      {showMap && userLocation && (
                        <div className="mt-3 lg:mt-4 w-full">
                          <div className="bg-white rounded-xl lg:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="p-3 lg:p-4 border-b border-gray-100">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-900 flex items-center gap-1 lg:gap-2 text-sm lg:text-base">
                                  <span>🗺️</span>
                                  <span className="hidden sm:inline">Nearby Pet Services</span>
                                  <span className="sm:hidden">Services</span>
                                  {mapLocations.length > 0 && (
                                    <span className="text-xs lg:text-sm text-gray-500 font-normal">
                                      ({mapLocations.length})
                                    </span>
                                  )}
                                </h4>
                                <button
                                  onClick={() => setShowMap(false)}
                                  className="text-gray-400 hover:text-gray-600 text-sm p-1"
                                  title="Hide map"
                                >
                                  ✕
                                </button>
                              </div>
                              {userLocation && userLocation.accuracy && (
                                <div className="mt-2">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                    userLocation.accuracy <= 50 ? 'bg-green-100 text-green-700' :
                                    userLocation.accuracy <= 100 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-orange-100 text-orange-700'
                                  }`}>
                                    📍 <span className="hidden sm:inline">Location accuracy: </span>{Math.round(userLocation.accuracy)}m
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="h-60 lg:h-80 relative">
                              {mapLoading && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
                                  <div className="text-center">
                                    <div className="animate-spin rounded-full h-6 w-6 lg:h-8 lg:w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                    <p className="text-xs lg:text-sm text-gray-600">Finding nearby services...</p>
                                  </div>
                                </div>
                              )}
                              {!mapLoading && mapLocations.length === 0 && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
                                  <div className="text-center">
                                    <p className="text-xs lg:text-sm text-gray-600">No locations found</p>
                                    <p className="text-xs text-gray-500 mt-1">Debug: {mapLocations.length} locations</p>
                                  </div>
                                </div>
                              )}
                                    <div 
                                      id={`map-${userLocation ? userLocation.join(',') : 'default'}`}
                                      className="w-full h-[300px] rounded-lg"
                                    ></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="ml-2 text-gray-400 text-xs group-hover:underline">{pair[0].expanded ? 'Collapse' : 'Expand'}</span>
                  </div>
                )}
                {/* If only bot message (welcome) */}
                {pair[0].sender === "bot" && !pair[1] && (
                  <div className="flex justify-start items-start gap-2">
                    <div className="flex flex-col items-start max-w-[85%] lg:max-w-lg">
                      <div className="flex items-center mb-1">
                        <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-green-200 flex items-center justify-center text-sm lg:text-lg font-bold mr-2">
                          <span role="img" aria-label="Bot">🤖</span>
                        </div>
                        <span className="font-semibold text-green-700 text-sm">PetBot</span>
                        <span className="ml-2 text-xs text-gray-400">{pair[0].time}</span>
                      </div>
                      <div className="bg-green-50 text-green-900 px-3 lg:px-5 py-2 lg:py-3 rounded-2xl shadow-lg text-sm lg:text-base whitespace-pre-line" dangerouslySetInnerHTML={{ __html: formatText(pair[0].text) }}></div>
                    </div>
                  </div>
                )}
                {pair[1] && pair[1].sender === 'bot' && pair[1].showDiscover && (
                  <div className="mt-2 flex justify-start">
                    <Link to="/discover" className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg lg:rounded-xl text-xs lg:text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl">
                      Open Discover
                    </Link>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 ml-6 lg:ml-10 mt-2">
                <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-green-200 flex items-center justify-center text-sm lg:text-lg font-bold mr-2">
                  <span role="img" aria-label="Bot">🤖</span>
                </div>
                <div className="bg-green-50 text-green-900 px-3 lg:px-4 py-2 rounded-2xl shadow-sm text-xs lg:text-sm animate-pulse">
                  {mapLoading ? 'Finding nearby services...' : 'PetBot is typing...'}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
        {/* Floating quick action bar */}
        <div className="bg-white/95 backdrop-blur-sm py-3 lg:py-2 px-3 lg:px-2 rounded-none lg:rounded-b-3xl border-t border-blue-100 shadow-inner flex-shrink-0">
          <div className="flex flex-wrap gap-1.5 lg:gap-2 justify-center mb-3 lg:mb-2">
            {quickActions.slice(0, window.innerWidth < 768 ? 4 : 6).map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="bg-gradient-to-br from-blue-100 to-green-100 hover:from-blue-200 hover:to-green-200 text-gray-700 px-2 lg:px-3 py-1.5 lg:py-2 rounded-full text-xs border border-gray-200 hover:border-blue-400 transition-colors min-w-[100px] lg:min-w-[120px] min-h-[36px] lg:min-h-[40px] flex-shrink-0"
                disabled={loading}
              >
                {q}
              </button>
            ))}
            {window.innerWidth < 768 && quickActions.length > 4 && (
              <button
                onClick={() => {/* Show more actions */}}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1.5 rounded-full text-xs border border-gray-200 hover:border-gray-400 transition-colors min-w-[80px] min-h-[36px] flex-shrink-0"
              >
                More...
              </button>
            )}
          </div>
          {/* Input area */}
          <div className="flex gap-2 pb-2 lg:pb-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-3 lg:px-4 py-2.5 lg:py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm lg:text-base"
              placeholder="Ask about pet health, nutrition, behavior..."
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 lg:px-6 py-2.5 lg:py-3 rounded-full font-semibold transition-colors disabled:bg-blue-300 text-sm lg:text-base flex-shrink-0"
              disabled={loading || !input.trim()}
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
          {error && <div className="text-red-500 text-xs mt-2 text-center px-2">{error}</div>}
        </div>
        <footer className="mt-2 px-4 lg:px-0 text-center text-xs text-gray-400 flex-shrink-0">
          <div className="space-y-1">
            <p>⚠️ This AI assistant provides general pet care and product information only.</p>
            <p>For emergencies or specific health concerns, always consult a licensed veterinarian.</p>
            <p>
              <a href="https://www.aspca.org/pet-care" className="underline text-blue-500 hover:text-blue-700" target="_blank" rel="noopener noreferrer">More pet care resources</a>
            </p>
          </div>
        </footer>
      </main>
      </div>
      
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
};

export default Chatbot;