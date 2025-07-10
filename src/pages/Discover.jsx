import React, { useState, useEffect } from 'react';

const Discover = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(5);

  const categories = [
    { id: 'all', name: 'All Services', icon: '🗺️' },
    { id: 'veterinary', name: 'Veterinary', icon: '🏥' },
    { id: 'grooming', name: 'Grooming', icon: '✂️' },
    { id: 'boarding', name: 'Pet Boarding', icon: '🏠' },
    { id: 'training', name: 'Training', icon: '🎓' },
    { id: 'pharmacy', name: 'Pet Pharmacy', icon: '💊' },
  ];

  // Mock data for nearby services
  const nearbyServices = [
    {
      id: 1,
      name: 'Happy Paws Veterinary Clinic',
      category: 'veterinary',
      address: '123 Main Street, Downtown',
      distance: 0.8,
      rating: 4.9,
      reviews: 234,
      phone: '(555) 123-4567',
      hours: 'Mon-Fri: 8AM-6PM, Sat: 9AM-4PM',
      services: ['Emergency Care', 'Surgery', 'Dental Care', 'Vaccinations'],
      image: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=400&h=300'
    },
    {
      id: 2,
      name: 'Pampered Pets Grooming Salon',
      category: 'grooming',
      address: '456 Oak Avenue, Midtown',
      distance: 1.2,
      rating: 4.7,
      reviews: 156,
      phone: '(555) 234-5678',
      hours: 'Tue-Sat: 9AM-5PM',
      services: ['Full Grooming', 'Nail Trimming', 'Teeth Cleaning', 'Flea Treatment'],
      image: 'https://images.unsplash.com/photo-1560807707-8cc77767d783?auto=format&fit=crop&w=400&h=300'
    },
    {
      id: 3,
      name: 'City Animal Hospital',
      category: 'veterinary',
      address: '789 Pine Road, Uptown',
      distance: 2.1,
      rating: 4.8,
      reviews: 189,
      phone: '(555) 345-6789',
      hours: '24/7 Emergency Services',
      services: ['Emergency Care', 'X-Ray', 'Laboratory', 'Pharmacy'],
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?auto=format&fit=crop&w=400&h=300'
    },
    {
      id: 4,
      name: 'Cozy Paws Pet Boarding',
      category: 'boarding',
      address: '321 Elm Street, Suburbs',
      distance: 3.5,
      rating: 4.6,
      reviews: 98,
      phone: '(555) 456-7890',
      hours: 'Daily: 7AM-7PM',
      services: ['Overnight Boarding', 'Daycare', 'Play Time', 'Feeding Service'],
      image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=400&h=300'
    },
    {
      id: 5,
      name: 'Smart Pet Training Academy',
      category: 'training',
      address: '654 Maple Drive, Westside',
      distance: 2.8,
      rating: 4.9,
      reviews: 145,
      phone: '(555) 567-8901',
      hours: 'Mon-Sat: 10AM-8PM',
      services: ['Puppy Training', 'Obedience Classes', 'Behavioral Training', 'Agility Training'],
      image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=400&h=300'
    },
    {
      id: 6,
      name: 'Pet Care Pharmacy Plus',
      category: 'pharmacy',
      address: '987 Cedar Lane, Eastside',
      distance: 1.9,
      rating: 4.5,
      reviews: 67,
      phone: '(555) 678-9012',
      hours: 'Mon-Fri: 9AM-7PM, Sat: 10AM-5PM',
      services: ['Prescription Medications', 'Supplements', 'Flea & Tick Prevention', 'Special Diets'],
      image: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?auto=format&fit=crop&w=400&h=300'
    },
  ];

  const filteredServices = nearbyServices.filter(service => {
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    const withinRadius = service.distance <= searchRadius;
    return matchesCategory && withinRadius;
  }).sort((a, b) => a.distance - b.distance);

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied');
        }
      );
    }
  }, []);

  const getCategoryIcon = (category) => {
    const categoryData = categories.find(cat => cat.id === category);
    return categoryData ? categoryData.icon : '📍';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">
            Discover Nearby Pet Services 🗺️
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find trusted veterinarians, grooming salons, boarding facilities, and more in your area.
          </p>
        </div>

        {/* Location Status */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center bg-white rounded-full px-6 py-3 shadow-sm border border-gray-200">
            <span className="text-green-500 mr-2">📍</span>
            <span className="text-gray-700">
              {userLocation ? 'Location detected - Showing nearby services' : 'Enable location for better results'}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>

            {/* Distance Filter */}
            <div className="flex items-center space-x-4 bg-white rounded-lg px-4 py-2 border border-gray-200">
              <span className="text-sm text-gray-600">Within:</span>
              <select
                value={searchRadius}
                onChange={(e) => setSearchRadius(Number(e.target.value))}
                className="text-sm border-none focus:ring-0 focus:outline-none"
              >
                <option value={2}>2 miles</option>
                <option value={5}>5 miles</option>
                <option value={10}>10 miles</option>
                <option value={25}>25 miles</option>
              </select>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredServices.map((service) => (
            <div key={service.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="flex">
                <div className="w-1/3">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="w-2/3 p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center mb-1">
                        <span className="text-xl mr-2">{getCategoryIcon(service.category)}</span>
                        <h3 className="text-lg font-display font-bold text-gray-900">
                          {service.name}
                        </h3>
                      </div>
                      <p className="text-gray-600 text-sm mb-1">{service.address}</p>
                      <p className="text-primary-600 font-semibold text-sm">
                        📍 {service.distance} miles away
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center mb-1">
                        <span className="text-yellow-400 mr-1">⭐</span>
                        <span className="font-semibold">{service.rating}</span>
                        <span className="text-gray-500 text-sm ml-1">({service.reviews})</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">📞</span> {service.phone}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">🕒</span> {service.hours}
                    </p>
                  </div>

                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {service.services.slice(0, 3).map((serviceItem, index) => (
                        <span
                          key={index}
                          className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs"
                        >
                          {serviceItem}
                        </span>
                      ))}
                      {service.services.length > 3 && (
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                          +{service.services.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-colors">
                      📞 Call Now
                    </button>
                    <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm font-semibold transition-colors">
                      🗺️ Directions
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No results */}
        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-600">Try expanding your search radius or changing the category</p>
          </div>
        )}

        {/* Emergency Contact */}
        <div className="mt-16 bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">🚨</div>
          <h2 className="text-2xl font-display font-bold text-red-800 mb-4">Pet Emergency?</h2>
          <p className="text-red-700 mb-6">
            If your pet is experiencing a medical emergency, contact your nearest 24/7 animal hospital immediately.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              🏥 Find Emergency Vet
            </button>
            <button className="bg-white hover:bg-gray-50 text-red-600 border border-red-600 px-6 py-3 rounded-lg font-semibold transition-colors">
              📞 Emergency Hotline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Discover;
