import React, { useState, useRef, useEffect } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { Link } from 'react-router-dom';

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

// Google Maps configuration
const GOOGLE_MAPS_API_KEY = "AIzaSyCoPzRJLAmma54BBOyF4AhZ2ZIqGvak8CA";
const DEFAULT_COORDS = { lat: 9.3977, lng: 76.8861 }; 
const MAP_CONTAINER_STYLE = { width: '100%', height: '300px' };
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
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 640);

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

  // Memoize the loader options to prevent re-creation
  const loaderOptions = React.useMemo(() => ({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places']
  }), []);

  const { isLoaded, loadError } = useJsApiLoader(loaderOptions);

  // Search for nearby pet services
  const searchNearbyPlaces = async (lat, lng, type = null) => {
    try {
      if (!window.google || !window.google.maps) {
        throw new Error('Google Maps not loaded');
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
        PET_SERVICE_TYPES.forEach(({ type: serviceType }) => {
          const request = {
            location: new window.google.maps.LatLng(lat, lng),
            radius: 5000,
            type: serviceType
          };
          
          searchPromises.push(
            new Promise((resolve) => {
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
            })
          );
        });
      }

      const results = await Promise.all(searchPromises);
      return results.flat();
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  };

  // Search for pet services in a specific location by name
  const searchPetServicesInLocation = async (locationName, serviceType = 'all') => {
    try {
      if (!window.google || !window.google.maps) {
        throw new Error('Google Maps not loaded');
      }

      const service = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );

      // First, geocode the location name to get coordinates
      const geocoder = new window.google.maps.Geocoder();
      const geocodeResult = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: locationName }, (results, status) => {
          if (status === window.google.maps.GeocoderStatus.OK && results && results.length > 0) {
            resolve(results[0]);
          } else {
            reject(new Error(`Geocoding failed for "${locationName}": ${status}`));
          }
        });
      });

      const location = geocodeResult.geometry.location;
      const lat = location.lat();
      const lng = location.lng();

      console.log(`Geocoded "${locationName}" to: ${lat}, ${lng}`);

      // Now search for pet services near this location
      const places = await searchNearbyPlaces(lat, lng, serviceType);
      
      return {
        location: { lat, lng },
        locationName: locationName,
        formattedAddress: geocodeResult.formatted_address,
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
        
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        
        // Validate coordinates are reasonable
        if (Math.abs(coords.lat) > 90 || Math.abs(coords.lng) > 180) {
          throw new Error('Invalid coordinates received');
        }
        
        console.log('Chatbot: Final live GPS location obtained:', coords.accuracy, 'meters accuracy');
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
      const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${loc.geometry.location.lat()},${loc.geometry.location.lng()}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error opening navigation:', error);
    }
  };



  // Responsive sidebar toggle for mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setSidebarOpen(false);
      else setSidebarOpen(true);
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

    if (isLocationRequest && isLoaded) {
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
          
          const places = await searchNearbyPlaces(coords.lat, coords.lng, serviceType);
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

  if (loadError) {
    return <div className="text-center text-red-500 p-8">Failed to load Google Maps</div>;
  }

  if (!isLoaded) {
    return <div className="text-center text-gray-500 p-8">Loading Google Maps...</div>;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-blue-50 to-green-100 flex flex-col sm:flex-row items-stretch">
      {/* Sidebar with logo, welcome, tips, fun fact */}
      <aside
        className={`transition-all duration-300 fixed sm:static z-30 top-0 left-0 h-full sm:h-full bg-white/90 border-r border-blue-100 shadow-lg flex flex-col items-center py-6 px-4 gap-4 overflow-y-auto
        ${sidebarOpen ? 'w-4/5 sm:w-80' : 'w-16 sm:w-16'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
        sm:relative sm:translate-x-0`}
        style={{ minWidth: sidebarOpen ? undefined : 64 }}
      >
        <div className="flex flex-col items-center w-full">
          <div className="mb-2">{PETBOT_LOGO}</div>
          <button
            className="sm:absolute sm:right-2 sm:top-2 absolute right-2 top-2 bg-blue-100 hover:bg-blue-200 rounded-full p-1 text-blue-700 focus:outline-none"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
            ) : (
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
            )}
          </button>
        </div>
        {sidebarOpen && (
          <>
            <h2 className="text-xl font-bold text-blue-900 mb-1 mt-2">PetCare AI</h2>
            <p className="text-gray-600 text-center mb-2">Your friendly pet health & product assistant. Ask me anything about your pet's care, nutrition, behavior, or find nearby services!</p>
            <div className="w-full mt-4">
              <h3 className="font-semibold text-blue-700 mb-1">Tips for Best Results:</h3>
              <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                <li>Be specific about your pet's species, age, and symptoms.</li>
                <li>Ask one question at a time for detailed answers.</li>
                <li>Try the quick action buttons for common topics!</li>
                <li>Ask "Find nearest vet" or "Find pet stores in [city]" to locate services.</li>
              </ul>
            </div>
            <div className="w-full mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 text-center">
              <span className="font-semibold">🐶 Fun Pet Fact:</span><br />
              {funFacts[factIdx]}
              <button className="ml-2 text-blue-500 underline text-xs" onClick={() => setFactIdx((factIdx + 1) % funFacts.length)}>Next fact</button>
            </div>
            <div className="mt-auto text-xs text-gray-400 pt-4 border-t w-full text-center">&copy; {new Date().getFullYear()} PetCare AI | Made with ❤️ for pets</div>
          </>
        )}
      </aside>
      {/* Main chat area */}
      <main className="flex-1 flex flex-col bg-white rounded-3xl shadow-2xl p-0 sm:p-6 h-full min-h-0 overflow-hidden">
        {/* Header with sidebar toggle for mobile */}
        <header className="w-full bg-white/80 backdrop-blur border-b border-blue-100 shadow-sm flex items-center justify-between py-3 mb-2 px-4 sm:px-0 flex-shrink-0">
          <div className="flex items-center">
            {window.innerWidth < 640 && (
              <button
                className="mr-2 bg-blue-100 hover:bg-blue-200 rounded-full p-1 text-blue-700 focus:outline-none"
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {sidebarOpen ? (
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
                ) : (
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
                )}
              </button>
            )}
            <span className="text-3xl mr-2">🐾</span>
            <h1 className="text-2xl font-bold text-blue-900 tracking-tight">PetCare AI Chatbot</h1>
          </div>
        </header>
        {/* Chat window with collapsible Q&A pairs */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto px-2 sm:px-0 py-4 space-y-3 custom-scrollbar">
            {qaPairs.map((pair, idx) => (
              <div key={idx} className="mb-2">
                {/* User bubble (right) */}
                {pair[0].sender === "user" && (
                  <div className="flex justify-end items-center gap-2 cursor-pointer group" onClick={() => pair.length === 2 && toggleExpand(chat.indexOf(pair[0]))}>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center mb-1">
                        <span className="font-semibold text-blue-700 mr-2">You</span>
                        <span className="text-xs text-gray-400">{pair[0].time}</span>
                        <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-lg font-bold ml-2">
                          <span role="img" aria-label="User">🧑</span>
                        </div>
                      </div>
                      <div className={`bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg text-base whitespace-pre-line max-w-lg ${pair[0].expanded ? '' : 'max-h-8 overflow-hidden'}`}>{pair[0].text}</div>
                    </div>
                    <span className="ml-2 text-gray-400 text-xs group-hover:underline">{pair.length === 2 ? (pair[0].expanded ? 'Collapse' : 'Expand') : ''}</span>
                  </div>
                )}
                {/* Bot bubble (left) */}
                {pair[1] && (
                  <div className="flex justify-start items-center gap-2 mt-2">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center mb-1">
                        <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-lg font-bold mr-2">
                          <span role="img" aria-label="Bot">🤖</span>
                        </div>
                        <span className="font-semibold text-green-700">PetBot</span>
                        <span className="ml-2 text-xs text-gray-400">{pair[1].time}</span>
                      </div>
                      <div className={`bg-green-50 text-green-900 px-5 py-3 rounded-2xl shadow-lg text-base whitespace-pre-line max-w-lg ${pair[0].expanded ? '' : 'max-h-8 overflow-hidden'}`} dangerouslySetInnerHTML={{ __html: formatText(pair[1].text) }}></div>
                      
                      {/* Map for location responses */}
                      {showMap && userLocation && (
                        <div className="mt-4 w-full max-w-lg">
                          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-100">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  <span>🗺️</span>
                                  Nearby Pet Services
                                  {mapLocations.length > 0 && (
                                    <span className="text-sm text-gray-500 font-normal">
                                      ({mapLocations.length} found)
                                    </span>
                                  )}
                                </h4>
                                <button
                                  onClick={() => setShowMap(false)}
                                  className="text-gray-400 hover:text-gray-600 text-sm"
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
                                    📍 Location accuracy: {Math.round(userLocation.accuracy)} meters
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="h-80 relative">
                              {mapLoading && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
                                  <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                    <p className="text-sm text-gray-600">Finding nearby services...</p>
                                  </div>
                                </div>
                              )}
                              {!mapLoading && mapLocations.length === 0 && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
                                  <div className="text-center">
                                    <p className="text-sm text-gray-600">No locations found</p>
                                    <p className="text-xs text-gray-500 mt-1">Debug: {mapLocations.length} locations</p>
                                  </div>
                                </div>
                              )}
                                    <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={userLocation}
        zoom={DEFAULT_ZOOM}
        onLoad={map => {
          mapRef.current = map;
          console.log('Map loaded successfully');
          console.log('Map center:', map.getCenter());
          console.log('Map zoom:', map.getZoom());
          console.log('Map locations count:', mapLocations.length);
        }}
                                options={{
                                  zoomControl: true,
                                  mapTypeControl: false,
                                  scaleControl: true,
                                  streetViewControl: false,
                                  rotateControl: false,
                                  fullscreenControl: true
                                }}
                              >
                                {/* User marker */}
                                <Marker
                                  key="user-location-marker"
                                  position={userLocation}
                                  icon={{
                                    url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                                    scaledSize: new window.google.maps.Size(40, 40)
                                  }}
                                  title="You are here"
                                />

                                {/* Test marker to verify markers work */}
                                {userLocation && (
                                  <Marker
                                    key="test-marker"
                                    position={{
                                      lat: userLocation.lat + 0.01,
                                      lng: userLocation.lng + 0.01
                                    }}
                                    icon={{
                                      url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                                      scaledSize: new window.google.maps.Size(32, 32)
                                    }}
                                    title="Test Marker"
                                  />
                                )}

                                {/* Service locations */}
                                {mapLocations
                                  .filter(loc => loc.geometry && loc.geometry.location && typeof loc.geometry.location.lat === 'function' && typeof loc.geometry.location.lng === 'function')
                                  .map((loc) => {
                                    const position = {
                                      lat: loc.geometry.location.lat(),
                                      lng: loc.geometry.location.lng()
                                    };
                                    console.log('Rendering marker for:', loc.name, position.lat, position.lng);
                                    console.log('Creating marker with position:', position);
                                    return (
                                      <Marker
                                        key={`marker-${loc.place_id}-${position.lat}-${position.lng}`}
                                        position={position}
                                        onClick={() => setSelectedLocation(loc)}
                                        icon={{
                                          url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                                          scaledSize: new window.google.maps.Size(32, 32)
                                        }}
                                        title={loc.name}
                                      />
                                    );
                                  })}
                                {/* InfoWindow for selected location */}
                                {selectedLocation && (
                                  <InfoWindow
                                    position={{
                                      lat: selectedLocation.geometry.location.lat(),
                                      lng: selectedLocation.geometry.location.lng()
                                    }}
                                    onCloseClick={() => setSelectedLocation(null)}
                                  >
                                    <div className="max-w-xs">
                                      {/* Header with name and type */}
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                          <div className="font-bold text-sm text-gray-900 leading-tight mb-1">
                                            {selectedLocation.name}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs">{getServiceTypeInfo(selectedLocation.serviceType).icon}</span>
                                            <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                                              {getServiceTypeInfo(selectedLocation.serviceType).label}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Compact info row */}
                                      <div className="flex items-center justify-between mb-3 text-xs">
                                        {selectedLocation.vicinity && (
                                          <div className="text-gray-500 flex items-center gap-1 flex-1">
                                            <span>📍</span>
                                            <span className="truncate">{selectedLocation.vicinity}</span>
                                          </div>
                                        )}
                                        {selectedLocation.rating && (
                                          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                            <span className="text-yellow-500">⭐</span>
                                            <span className="font-medium">{selectedLocation.rating}</span>
                                            {selectedLocation.user_ratings_total && (
                                              <span className="text-gray-400">({selectedLocation.user_ratings_total})</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Action button */}
                                      <button
                                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                                        onClick={() => handleNavigate(selectedLocation)}
                                      >
                                        🗺️ Get Directions
                                      </button>
                                    </div>
                                  </InfoWindow>
                                )}
                              </GoogleMap>
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
                  <div className="flex justify-start items-center gap-2">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center mb-1">
                        <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-lg font-bold mr-2">
                          <span role="img" aria-label="Bot">🤖</span>
                        </div>
                        <span className="font-semibold text-green-700">PetBot</span>
                        <span className="ml-2 text-xs text-gray-400">{pair[0].time}</span>
                      </div>
                      <div className="bg-green-50 text-green-900 px-5 py-3 rounded-2xl shadow-lg text-base whitespace-pre-line max-w-lg" dangerouslySetInnerHTML={{ __html: formatText(pair[0].text) }}></div>
                    </div>
                  </div>
                )}
                {pair[1] && pair[1].sender === 'bot' && pair[1].showDiscover && (
                  <div className="mt-2 flex justify-start">
                    <Link to="/discover" className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl">
                      Open Discover
                    </Link>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 ml-10 mt-2">
                <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-lg font-bold mr-2">
                  <span role="img" aria-label="Bot">🤖</span>
                </div>
                <div className="bg-green-50 text-green-900 px-4 py-2 rounded-2xl shadow-sm text-sm animate-pulse">
                  {mapLoading ? 'Finding nearby services...' : 'PetBot is typing...'}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
        {/* Floating quick action bar */}
        <div className="bg-white/90 py-2 px-2 rounded-b-3xl border-t border-blue-100 shadow-inner flex-shrink-0">
          <div className="flex flex-wrap gap-2 justify-center mb-2">
            {quickActions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="bg-gradient-to-br from-blue-100 to-green-100 hover:from-blue-200 hover:to-green-200 text-gray-700 px-3 py-2 rounded-full text-xs border border-gray-200 hover:border-blue-400 transition-colors min-w-[120px] min-h-[40px]"
                disabled={loading}
              >
                {q}
              </button>
            ))}
          </div>
          {/* Input area */}
          <div className="flex gap-2 pb-2 sm:pb-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-base"
              placeholder="Ask about pet health, nutrition, behavior, products, or find nearby services..."
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold transition-colors disabled:bg-blue-300 text-base"
              disabled={loading || !input.trim()}
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
          {error && <div className="text-red-500 text-xs mt-2 text-center">{error}</div>}
        </div>
        <footer className="mt-2 text-center text-xs text-gray-400 flex-shrink-0">
          ⚠️ This AI assistant provides general pet care and product information only.<br />For emergencies or specific health concerns, always consult a licensed veterinarian.<br />
          <a href="https://www.aspca.org/pet-care" className="underline text-blue-500" target="_blank" rel="noopener noreferrer">More pet care resources</a>
        </footer>
      </main>
    </div>
  );
};

export default Chatbot;