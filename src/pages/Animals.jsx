import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimalService from '../services/animalService';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';
import Footer from '../components/Footer';

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

const Animals = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [animalService, setAnimalService] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);

  const animalTypes = [
    { id: 'all', name: 'All Animals', icon: '🐾' },
    { id: 'Dog', name: 'Dogs', icon: '🐕' },
    { id: 'Cat', name: 'Cats', icon: '🐱' },
    { id: 'Bird', name: 'Birds', icon: '🐦' },
    { id: 'Fish', name: 'Fish', icon: '🐠' },
    { id: 'Rabbit', name: 'Rabbits', icon: '🐰' },
    { id: 'Hamster', name: 'Hamsters', icon: '🐹' },
    { id: 'Reptile', name: 'Reptiles', icon: '🦎' },
    { id: 'Other', name: 'Other', icon: '🐾' },
  ];

  useEffect(() => {
    if (user) {
      const service = new AnimalService(user);
      setAnimalService(service);
      loadAnimals(service);
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadAnimals = async (service) => {
    try {
      setLoading(true);
      setError('');
      const animalsData = await service.getAnimals();
      setAnimals(Array.isArray(animalsData) ? animalsData : []);
    } catch (err) {
      console.error('Error loading animals:', err);
      setError('Failed to load animals. Please try again later.');
      setAnimals([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnimals = useMemo(() => {
    return animals.filter(animal => {
      if (!animal || animal.status === 'Sold') {
        return false;
      }

      const matchesType = selectedType === 'all' || animal.type === selectedType;
      
      // Enhanced search functionality
      if (!searchTerm) {
        return matchesType;
      }

      const searchLower = searchTerm.toLowerCase();
      
      // Search in multiple fields
      const matchesSearch = 
        // Animal name
        (animal.name && animal.name.toLowerCase().includes(searchLower)) ||
        // Animal type
        (animal.type && animal.type.toLowerCase().includes(searchLower)) ||
        // Breed
        (animal.breed && animal.breed.toLowerCase().includes(searchLower)) ||
        // Owner name
        (animal.ownerName && animal.ownerName.toLowerCase().includes(searchLower)) ||
        // Owner email
        (animal.ownerEmail && animal.ownerEmail.toLowerCase().includes(searchLower)) ||
        // Age
        (animal.age && animal.age.toLowerCase().includes(searchLower)) ||
        // Gender
        (animal.gender && animal.gender.toLowerCase().includes(searchLower)) ||
        // Color
        (animal.color && animal.color.toLowerCase().includes(searchLower)) ||
        // Weight
        (animal.weight && animal.weight.toLowerCase().includes(searchLower)) ||
        // Microchip ID
        (animal.microchipId && animal.microchipId.toLowerCase().includes(searchLower)) ||
        // Status
        (animal.status && animal.status.toLowerCase().includes(searchLower)) ||
        // Price
        (animal.price && animal.price.toString().includes(searchLower)) ||
        // Notes
        (animal.notes && animal.notes.toLowerCase().includes(searchLower)) ||
        // Address
        (animal.address && animal.address.toLowerCase().includes(searchLower)) ||
        // Emergency contact
        (animal.emergencyContact && animal.emergencyContact.toLowerCase().includes(searchLower));

      return matchesType && matchesSearch;
    });
  }, [animals, selectedType, searchTerm]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedType('all');
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearchTerm(value);
      if (value.trim() && value.length > 2) {
        setSearchHistory(prev => {
          const newHistory = [value, ...prev.filter(item => item !== value)].slice(0, 5);
          return newHistory;
        });
      }
    }, 300),
    []
  );



  const handleBuyNow = (animal) => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      Swal.fire({
        icon: 'info',
        title: 'Login Required',
        text: 'Please log in to purchase animals.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3B82F6'
      }).then(() => {
        navigate('/login', { state: { from: '/animals' } });
      });
      return;
    }

    // Navigate to product detail page for the animal
    navigate(`/product/${animal.animalId}`);
  };

  const handleContactOwner = (animal) => {
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: '/animals' } });
      return;
    }

    Swal.fire({
      title: `Contact ${animal.ownerName}`,
      html: `
        <div class="text-left">
          <p><strong>Email:</strong> ${animal.ownerEmail || 'Not provided'}</p>
          <p><strong>Phone:</strong> ${animal.ownerPhone || 'Not provided'}</p>
          <p><strong>Address:</strong> ${animal.address || 'Not provided'}</p>
          ${animal.emergencyContact ? `<p><strong>Emergency Contact:</strong> ${animal.emergencyContact}</p>` : ''}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Send Email',
      cancelButtonText: 'Close',
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#6B7280'
    }).then((result) => {
      if (result.isConfirmed && animal.ownerEmail) {
        window.location.href = `mailto:${animal.ownerEmail}?subject=Inquiry about ${animal.name}`;
      }
    });
  };

  const handleViewDetails = (animal) => {
    Swal.fire({
      title: animal.name,
      html: `
        <div class="text-left space-y-2">
          <p><strong>Type:</strong> ${animal.type}</p>
          <p><strong>Breed:</strong> ${animal.breed || 'Not specified'}</p>
          <p><strong>Age:</strong> ${animal.age || 'Not specified'}</p>
          <p><strong>Gender:</strong> ${animal.gender || 'Not specified'}</p>
          <p><strong>Weight:</strong> ${animal.weight || 'Not specified'}</p>
          <p><strong>Color:</strong> ${animal.color || 'Not specified'}</p>
          <p><strong>Microchip ID:</strong> ${animal.microchipId || 'Not specified'}</p>
          <p><strong>Status:</strong> ${animal.status}</p>
          ${animal.price ? `<p><strong>Price:</strong> <span class="text-green-600 font-semibold">₹${Number(animal.price).toLocaleString()}</span></p>` : ''}
          ${animal.notes ? `<p><strong>Notes:</strong> ${animal.notes}</p>` : ''}
          <p><strong>Owner:</strong> ${animal.ownerName}</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Contact Owner',
      cancelButtonText: 'Close',
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#6B7280',
      imageUrl: animal.imageUrls && animal.imageUrls.length > 0 ? animal.imageUrls[0] : undefined,
      imageWidth: 200,
      imageHeight: 200,
      imageAlt: animal.name
    }).then((result) => {
      if (result.isConfirmed) {
        handleContactOwner(animal);
      }
    });
  };

  const getAnimalEmoji = (type) => {
    const typeEmojis = {
      'Dog': '🐕',
      'Cat': '🐱',
      'Bird': '🐦',
      'Fish': '🐠',
      'Rabbit': '🐰',
      'Hamster': '🐹',
      'Reptile': '🦎',
      'Other': '🐾'
    };
    return typeEmojis[type] || '🐾';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available':
        return 'bg-green-100 text-green-800';
      case 'Healthy':
        return 'bg-blue-100 text-blue-800';
      case 'Checkup Due':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to highlight search terms in text
  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Available Animals</h1>
              <p className="text-gray-600 max-w-2xl mt-1">Find your perfect companion from our community</p>
            </div>
            <div className="w-full md:w-[420px]">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by name, breed, owner, type, age, color, price..."
                  defaultValue={searchTerm}
                  onChange={(e) => debouncedSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm bg-white"
                />
              </div>
              
              {/* Quick search tags */}
              <div className="mt-3 flex flex-wrap gap-2">
                {['Available', 'Healthy', 'Male', 'Female', 'Puppy', 'Kitten'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSearchTerm(tag)}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-full transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              
              {/* Search history */}
              {searchHistory.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-gray-600">Recent searches:</span>
                  {searchHistory.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => setSearchTerm(term)}
                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs rounded-full transition-colors border border-blue-200"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Animal Types</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showFilters ? 'Hide' : 'Show'} filters
            </button>
          </div>
          <div className={`transition-all duration-300 ${showFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {animalTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-3 rounded-xl text-center transition-all duration-200 border-2 ${
                    selectedType === type.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-lg mb-1">{type.icon}</div>
                  <div className="text-xs font-medium">{type.name}</div>
                </button>
              ))}
            </div>

            {(searchTerm || selectedType !== 'all') && (
              <div className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {searchTerm && (
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                        Search: "{searchTerm}"
                      </span>
                    )}
                    {selectedType !== 'all' && (
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                        {animalTypes.find(t => t.id === selectedType)?.name}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Authentication Required Message */}
        {!isAuthenticated() && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  Please <button onClick={() => navigate('/login')} className="font-medium underline hover:text-yellow-900">log in</button> to contact animal owners and get more details.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg mb-4" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Search Results Header */}
        {!loading && searchTerm && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-blue-900">
                  Search Results for "{searchTerm}"
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Found {filteredAnimals.length} {filteredAnimals.length === 1 ? 'animal' : 'animals'} matching your search
                </p>
              </div>
              <button
                onClick={() => setSearchTerm('')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Clear Search
              </button>
            </div>
          </div>
        )}

        {/* Animals Grid */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredAnimals.map((animal) => (
              <div 
                key={animal.animalId} 
                className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 hover:border-gray-200 flex flex-col"
              >
                {/* Image */}
                <div className="relative">
                  <div className="overflow-hidden">
                    <img
                      src={animal.imageUrls && animal.imageUrls.length > 0 ? animal.imageUrls[0] : `https://placehold.co/600x600?text=${getAnimalEmoji(animal.type)}`}
                      alt={animal.name}
                      className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = `https://placehold.co/600x600?text=${getAnimalEmoji(animal.type)}`;
                      }}
                    />
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(animal.status)}`}>
                      {animal.status}
                    </span>
                  </div>

                  {/* Type Badge */}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2">
                    <span className="text-lg">{getAnimalEmoji(animal.type)}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 
                    className="font-semibold text-gray-900 text-base mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors"
                    dangerouslySetInnerHTML={{
                      __html: highlightSearchTerm(animal.name, searchTerm)
                    }}
                  />

                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <p>
                      <span className="font-medium">Breed:</span> 
                      <span dangerouslySetInnerHTML={{
                        __html: highlightSearchTerm(animal.breed || 'Mixed', searchTerm)
                      }} />
                    </p>
                    <p><span className="font-medium">Age:</span> {animal.age || 'Unknown'}</p>
                    <p><span className="font-medium">Owner:</span> {animal.ownerName}</p>
                    {animal.price && (
                      <p className="font-semibold text-green-600 text-base">
                        <span className="font-medium">Price:</span> ₹{Number(animal.price).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {animal.notes && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{animal.notes}</p>
                  )}

                  {/* Actions */}
                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleViewDetails(animal)}
                      className="py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Details
                    </button>
                    <button 
                      onClick={() => handleContactOwner(animal)}
                      disabled={!isAuthenticated()}
                      className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center ${
                        isAuthenticated()
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Contact
                    </button>
                  </div>
                  
                  {/* Buy Now Action */}
                  <div className="mt-2">
                    <button 
                      onClick={() => handleBuyNow(animal)}
                      disabled={!isAuthenticated()}
                      className={`w-full py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center ${
                        isAuthenticated()
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Animals Found */}
        {!loading && filteredAnimals.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🐾</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No animals found</h3>
            <p className="text-gray-600 mb-4 text-sm">
              {searchTerm || selectedType !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'No animals are currently available for adoption'
              }
            </p>
            {(searchTerm || selectedType !== 'all') && (
              <button
                onClick={clearFilters}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Results Summary */}
        {!loading && animals.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-600">
            Showing {filteredAnimals.length} of {animals.filter(a => a.status !== 'Sold').length} available animals
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">😔</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
            <p className="text-gray-600 mb-4 text-sm">{error}</p>
            <button
              onClick={() => animalService && loadAnimals(animalService)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default Animals;
