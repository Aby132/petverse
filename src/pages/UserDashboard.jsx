import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import productService from '../services/productService';
import AnimalService from '../services/animalService';

const UserDashboard = () => {
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({
    name: authUser?.attributes?.name || 'User',
    email: authUser?.attributes?.email || 'user@example.com',
    memberSince: 'January 2024',
    totalOrders: 0,
    favoriteProducts: 0
  });

  const [pets, setPets] = useState([]);
  const [availableAnimals, setAvailableAnimals] = useState([]);
  const [featuredAnimals, setFeaturedAnimals] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [animalService, setAnimalService] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Initialize animal service if user is authenticated
        if (authUser) {
          const service = new AnimalService(authUser);
          setAnimalService(service);
          
          // Load animals (user's pets) - animals owned by current user
          try {
            const animals = await service.getAnimals();
            // Filter animals owned by current user (assuming ownerEmail matches user email)
            const userPets = animals.filter(animal => 
              animal.ownerEmail === authUser.attributes?.email && 
              animal.status !== 'Sold'
            );
            
            const formattedPets = userPets.slice(0, 4).map(animal => ({
              id: animal.animalId,
              name: animal.name,
              type: animal.type,
              breed: animal.breed || 'Mixed',
              age: animal.age || 'Unknown',
              image: getAnimalEmoji(animal.type)
            }));
            setPets(formattedPets);

            // Also load available animals for sale (not owned by current user)
            const availableForSale = animals.filter(animal => 
              animal.ownerEmail !== authUser.attributes?.email && 
              animal.status !== 'Sold' &&
              animal.price > 0
            );
            
            const formattedAvailableAnimals = availableForSale.slice(0, 3).map(animal => ({
              id: animal.animalId,
              name: animal.name,
              type: animal.type,
              breed: animal.breed || 'Mixed',
              age: animal.age || 'Unknown',
              price: animal.price,
              image: getAnimalEmoji(animal.type),
              ownerName: animal.ownerName
            }));
            setAvailableAnimals(formattedAvailableAnimals);

            // Load featured animals (animals with special status or high price)
            let featuredAnimalsList = animals.filter(animal => 
              animal.ownerEmail !== authUser.attributes?.email && 
              animal.status !== 'Sold' &&
              (animal.status === 'Featured' || animal.price > 1000 || animal.isFeatured === true)
            );
            
            // If no featured animals, show random available animals
            if (featuredAnimalsList.length === 0) {
              const availableForRandom = animals.filter(animal => 
                animal.ownerEmail !== authUser.attributes?.email && 
                animal.status !== 'Sold' &&
                animal.price > 0
              );
              // Shuffle and take first 4
              featuredAnimalsList = availableForRandom
                .sort(() => Math.random() - 0.5)
                .slice(0, 4);
            }
            
            const formattedFeaturedAnimals = featuredAnimalsList.slice(0, 4).map(animal => ({
              id: animal.animalId,
              name: animal.name,
              type: animal.type,
              breed: animal.breed || 'Mixed',
              age: animal.age || 'Unknown',
              price: animal.price,
              image: getAnimalEmoji(animal.type),
              ownerName: animal.ownerName,
              status: animal.status,
              isFeatured: animal.status === 'Featured' || animal.price > 1000 || animal.isFeatured === true
            }));
            setFeaturedAnimals(formattedFeaturedAnimals);
          } catch (error) {
            console.error('Error loading animals:', error);
            setPets([]);
            setAvailableAnimals([]);
          }
        }

        // Load real products that are for sale as recommendations
        try {
          const products = await productService.getAllProducts();
          // Get products that are active and in stock (for sale)
          const availableProducts = products
            .filter(product => 
              product.isActive && 
              product.stock > 0 && 
              product.price > 0
            )
            .slice(0, 3)
            .map(product => ({
              name: product.name,
              price: `₹${Number(product.price).toLocaleString()}`,
              image: getProductEmoji(product.category),
              rating: 4.5 + Math.random() * 0.5, // Mock rating for now
              productId: product.productId,
              stock: product.stock,
              category: product.category
            }));
          setRecommendations(availableProducts);

          // Load featured products (products marked as featured)
          let featuredProductsList = products.filter(product => 
            product.isActive && 
            product.stock > 0 && 
            product.price > 0 &&
            product.isFeatured === true
          );
          
          // If no featured products, show random available products
          if (featuredProductsList.length === 0) {
            const availableForRandom = products.filter(product => 
              product.isActive && 
              product.stock > 0 && 
              product.price > 0
            );
            // Shuffle and take first 4
            featuredProductsList = availableForRandom
              .sort(() => Math.random() - 0.5)
              .slice(0, 4);
          }
          
          const formattedFeaturedProducts = featuredProductsList.slice(0, 4).map(product => ({
            name: product.name,
            price: `₹${Number(product.price).toLocaleString()}`,
            image: getProductEmoji(product.category),
            rating: 4.5 + Math.random() * 0.5,
            productId: product.productId,
            stock: product.stock,
            category: product.category,
            isFeatured: product.isFeatured === true,
            description: product.description
          }));
          setFeaturedProducts(formattedFeaturedProducts);
        } catch (error) {
          console.error('Error loading recommendations:', error);
          setRecommendations([]);
          setFeaturedProducts([]);
        }

        // Mock recent orders for now (can be replaced with real order data later)
        setRecentOrders([
          { id: '#001', product: 'Premium Dog Food', date: '2024-01-15', status: 'Delivered', amount: '₹25' },
          { id: '#002', product: 'Cat Scratching Post', date: '2024-01-10', status: 'Shipped', amount: '₹40' },
          { id: '#003', product: 'Pet Vitamins', date: '2024-01-05', status: 'Processing', amount: '₹18' },
        ]);

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [authUser]);

  // Update user stats when data changes
  useEffect(() => {
    setUser(prevUser => ({
      ...prevUser,
      favoriteProducts: recommendations.length,
      totalOrders: recentOrders.length
    }));
  }, [recommendations, recentOrders]);

  // Helper function to get animal emoji
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

  // Helper function to get product emoji based on category
  const getProductEmoji = (category) => {
    const categoryEmojis = {
      'food': '🍖',
      'accessories': '🦴',
      'toys': '🧸',
      'grooming': '✂️',
      'health': '💊',
      'bedding': '🛏️',
      'clothing': '👕'
    };
    return categoryEmojis[category] || '📦';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
                Welcome back, {user.name}! 👋
              </h1>
              <p className="text-gray-600">Here's what's happening with your pets and orders today.</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Link
                to="/admin/community"
                className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
              >
                <span className="mr-2">🏘️</span>
                Join Communities
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-primary-100 p-3 rounded-lg">
                <span className="text-2xl">🐾</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">My Pets</p>
                <p className="text-2xl font-bold text-gray-900">{pets.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-secondary-100 p-3 rounded-lg">
                <span className="text-2xl">📦</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{user.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-accent-100 p-3 rounded-lg">
                <span className="text-2xl">❤️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Favorites</p>
                <p className="text-2xl font-bold text-gray-900">{user.favoriteProducts}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* My Pets */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">My Pets</h2>
                  <Link 
                    to="/animals" 
                    className="text-primary-600 hover:text-primary-700 font-medium transition-colors text-sm"
                  >
                    + Add Pet
                  </Link>
                </div>
              </div>
              <div className="p-4">
                {pets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pets.map((pet) => (
                    <div key={pet.id} className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <span className="text-3xl mr-3">{pet.image}</span>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">{pet.name}</h3>
                          <p className="text-xs text-gray-600">{pet.breed}</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <p><span className="font-medium">Type:</span> {pet.type}</p>
                        <p><span className="font-medium">Age:</span> {pet.age}</p>
                      </div>
                      <button className="mt-3 w-full bg-white hover:bg-gray-50 text-gray-900 py-2 px-3 rounded-lg font-medium transition-colors border border-gray-200 text-sm">
                        View Profile
                      </button>
                    </div>
                  ))}
                </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🐾</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No pets yet</h3>
                    <p className="text-gray-600 mb-4 text-sm">
                      You haven't added any pets to your profile yet.
                    </p>
                    <Link 
                      to="/animals" 
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <span className="mr-2">🐾</span>
                      Browse Animals
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Available Animals for Sale */}
            {availableAnimals.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Available Animals</h2>
                    <Link 
                      to="/animals" 
                      className="text-primary-600 hover:text-primary-700 font-medium transition-colors text-sm"
                    >
                      View All →
                    </Link>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {availableAnimals.map((animal) => (
                      <div key={animal.id} className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <span className="text-3xl mr-3">{animal.image}</span>
                          <div>
                            <h3 className="text-base font-semibold text-gray-900">{animal.name}</h3>
                            <p className="text-xs text-gray-600">{animal.breed}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs mb-3">
                          <p><span className="font-medium">Type:</span> {animal.type}</p>
                          <p><span className="font-medium">Age:</span> {animal.age}</p>
                          <p><span className="font-medium">Owner:</span> {animal.ownerName}</p>
                          {animal.price && (
                            <p className="font-semibold text-green-600">
                              <span className="font-medium">Price:</span> ₹{Number(animal.price).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <Link 
                          to={`/product/${animal.id}`}
                          className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg font-medium transition-colors text-sm text-center"
                        >
                          View Details
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Available Animals</h2>
                </div>
                <div className="p-8 text-center">
                  <div className="text-4xl mb-4">🐾</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No animals available</h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    There are currently no animals available for adoption.
                  </p>
                  <Link 
                    to="/animals" 
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <span className="mr-2">🐾</span>
                    Browse All Animals
                  </Link>
                </div>
              </div>
            )}

            {/* Featured Animals */}
            {featuredAnimals.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {featuredAnimals.some(animal => animal.isFeatured) ? '⭐ Featured Animals' : '🐾 Available Animals'}
                    </h2>
                    <Link 
                      to="/animals" 
                      className="text-primary-600 hover:text-primary-700 font-medium transition-colors text-sm"
                    >
                      View All →
                    </Link>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {featuredAnimals.map((animal) => (
                      <div key={animal.id} className={`rounded-lg p-4 border ${
                        animal.isFeatured 
                          ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200' 
                          : 'bg-gradient-to-br from-blue-50 to-green-50 border-blue-200'
                      }`}>
                        <div className="flex items-center mb-3">
                          <span className="text-3xl mr-3">{animal.image}</span>
                          <div>
                            <h3 className="text-base font-semibold text-gray-900">{animal.name}</h3>
                            <p className="text-xs text-gray-600">{animal.breed}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs mb-3">
                          <p><span className="font-medium">Type:</span> {animal.type}</p>
                          <p><span className="font-medium">Age:</span> {animal.age}</p>
                          <p><span className="font-medium">Owner:</span> {animal.ownerName}</p>
                          {animal.price && (
                            <p className="font-semibold text-green-600">
                              <span className="font-medium">Price:</span> ₹{Number(animal.price).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            animal.isFeatured 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {animal.isFeatured ? '⭐ Featured' : '🐾 Available'}
                          </span>
                          <Link 
                            to={`/product/${animal.id}`}
                            className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                          >
                            View Details →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Featured Products */}
            {featuredProducts.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {featuredProducts.some(product => product.isFeatured) ? '⭐ Featured Products' : '🛍️ Popular Products'}
                    </h2>
                    <Link 
                      to="/store" 
                      className="text-primary-600 hover:text-primary-700 font-medium transition-colors text-sm"
                    >
                      View All →
                    </Link>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {featuredProducts.map((product) => (
                      <div key={product.productId} className={`rounded-lg p-4 border ${
                        product.isFeatured 
                          ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200' 
                          : 'bg-gradient-to-br from-green-50 to-blue-50 border-green-200'
                      }`}>
                        <div className="flex items-center mb-3">
                          <span className="text-3xl mr-3">{product.image}</span>
                          <div>
                            <h3 className="text-base font-semibold text-gray-900">{product.name}</h3>
                            <p className="text-xs text-gray-600">{product.category}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs mb-3">
                          <p className="font-semibold text-green-600 text-base">{product.price}</p>
                          <p><span className="font-medium">Stock:</span> {product.stock} left</p>
                          <div className="flex items-center">
                            <span className="text-yellow-400 text-xs">⭐</span>
                            <span className="text-xs text-gray-600 ml-1">{product.rating.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            product.isFeatured 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {product.isFeatured ? '⭐ Featured' : '🛍️ Popular'}
                          </span>
                          <Link 
                            to={`/product/${product.productId}`}
                            className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                          >
                            View Details →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{order.product}</p>
                        <p className="text-xs text-gray-600">Order {order.id} • {order.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 text-sm">{order.amount}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                          order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/orders" className="block w-full mt-4 text-center text-primary-600 hover:text-primary-700 font-medium transition-colors">
                  View All Orders →
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  <Link to="/chatbot" className="flex items-center p-2 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors">
                    <span className="text-lg mr-2">🤖</span>
                    <span className="font-medium text-gray-900 text-sm">Ask Pet Expert</span>
                  </Link>
                  <Link to="/store" className="flex items-center p-2 bg-secondary-50 hover:bg-secondary-100 rounded-lg transition-colors">
                    <span className="text-lg mr-2">🛒</span>
                    <span className="font-medium text-gray-900 text-sm">Shop Products</span>
                  </Link>
                  <Link to="/animals" className="flex items-center p-2 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                    <span className="text-lg mr-2">🐾</span>
                    <span className="font-medium text-gray-900 text-sm">Browse Animals</span>
                  </Link>
                  <Link to="/admin/community" className="flex items-center p-2 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                    <span className="text-lg mr-2">🏘️</span>
                    <span className="font-medium text-gray-900 text-sm">Join Communities</span>
                  </Link>
                  <button className="flex items-center w-full p-2 bg-accent-50 hover:bg-accent-100 rounded-lg transition-colors">
                    <span className="text-lg mr-2">📅</span>
                    <span className="font-medium text-gray-900 text-sm">Schedule Vet Visit</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Recommended for You</h2>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {recommendations.length > 0 ? (
                    recommendations.map((product, idx) => (
                      <Link 
                        key={idx} 
                        to={`/product/${product.productId}`}
                        className="flex items-center space-x-2 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                      >
                      <span className="text-lg">{product.image}</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-xs">{product.name}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-primary-600 font-semibold text-xs">{product.price}</span>
                          <div className="flex items-center">
                            <span className="text-yellow-400 text-xs">⭐</span>
                              <span className="text-xs text-gray-600 ml-1">{product.rating.toFixed(1)}</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Stock: {product.stock} • {product.category}
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">No recommendations available</p>
                    </div>
                  )}
                </div>
                <Link to="/store" className="block w-full mt-4 text-center text-primary-600 hover:text-primary-700 font-medium transition-colors">
                  View More →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;