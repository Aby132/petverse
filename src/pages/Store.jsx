import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import productService from '../services/productService';
import cartService from '../services/cartService';
import { useAuth } from '../contexts/AuthContext';

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

const Store = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [pendingOperations, setPendingOperations] = useState(new Set());

  const categories = [
    { id: 'all', name: 'All', icon: '🛍️' },
    { id: 'food', name: 'Food', icon: '🍖' },
    { id: 'toys', name: 'Toys', icon: '🧸' },
    { id: 'health', name: 'Health', icon: '💊' },
    { id: 'accessories', name: 'Accessories', icon: '🎀' },
    { id: 'grooming', name: 'Grooming', icon: '🛁' },
    { id: 'housing', name: 'Housing', icon: '🏠' },
    { id: 'training', name: 'Training', icon: '🎓' },
    { id: 'travel', name: 'Travel', icon: '✈️' },
  ];

  useEffect(() => {
    loadProducts();
    loadCartItems();
  }, []);

  // Listen for cart updates from other components
  useEffect(() => {
    const handleCartUpdate = (event) => {
      // Use the cart data from the event if available
      if (event.detail) {
        setCartItems(event.detail);
      } else {
        loadCartItems();
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  const loadCartItems = async () => {
    try {
      setCartLoading(true);
      
      // Add error handling for cartService
      if (!cartService || typeof cartService.getCartItems !== 'function') {
        console.warn('Cart service not available, using empty cart');
        setCartItems([]);
        return;
      }
      
      const items = await cartService.getCartItems();
      setCartItems(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Error loading cart:', error);
      setCartItems([]);
    } finally {
      setCartLoading(false);
    }
  };

  const toggleCart = useCallback(async (product) => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: '/store' } });
      return;
    }

    // Check if operation is already pending
    if (pendingOperations.has(product.productId)) {
      return;
    }

    try {
      // Add to pending operations
      setPendingOperations(prev => new Set(prev).add(product.productId));
      
      // Add error handling for cartService
      if (!cartService || typeof cartService.addToCart !== 'function' || typeof cartService.removeFromCart !== 'function') {
        throw new Error('Cart service not available');
      }
      
      const isInCart = cartItems.some(item => item.productId === product.productId);
      
      if (isInCart) {
        // Remove product from cart
        const result = await cartService.removeFromCart(product.productId);
        if (result && result.success) {
          setCartItems(Array.isArray(result.cart) ? result.cart : []);
        }
      } else {
        // Add new item to cart
        const result = await cartService.addToCart({
          ...product,
          quantity: 1
        });
        if (result && result.success) {
          setCartItems(Array.isArray(result.cart) ? result.cart : []);
        }
      }
      
    } catch (error) {
      console.error('Error toggling cart:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to update cart. Please try again.';
      
      if (error.message.includes('Authentication required')) {
        errorMessage = 'Please log in to manage your cart.';
        navigate('/login', { state: { from: '/store' } });
      } else if (error.message.includes('401')) {
        errorMessage = 'Your session has expired. Please log in again.';
        navigate('/login', { state: { from: '/store' } });
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.message.includes('Cart service not available')) {
        errorMessage = 'Cart service is temporarily unavailable. Please try again later.';
      }
      
      // You can add a toast notification here if you have a notification system
      alert(errorMessage);
    } finally {
      // Remove from pending operations
      setPendingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(product.productId);
        return newSet;
      });
    }
  }, [cartItems, isAuthenticated, navigate, pendingOperations]);

  const isInCart = useCallback((productId) => {
    return cartItems.some(item => item.productId === productId);
  }, [cartItems]);

  const isOperationPending = useCallback((productId) => {
    return pendingOperations.has(productId);
  }, [pendingOperations]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const productsData = await productService.getAllProducts();
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load products. Please try again later.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (!product || !product.isActive) {
        return false;
      }

      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedCategory('all');
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Pet Store
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover premium products for your beloved pets
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
                <button 
                  onClick={loadProducts}
                  className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modern Search and Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          {/* Search Bar */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search products..."
              defaultValue={searchTerm}
              onChange={(e) => debouncedSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm bg-gray-50 focus:bg-white"
            />
          </div>

          {/* Category Filters */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Categories</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showFilters ? 'Hide' : 'Show'} filters
            </button>
          </div>

          <div className={`transition-all duration-300 ${showFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`p-3 rounded-xl text-center transition-all duration-200 border-2 ${
                    selectedCategory === category.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-lg mb-1">{category.icon}</div>
                  <div className="text-xs font-medium">{category.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || selectedCategory !== 'all') && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {searchTerm && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                      Search: "{searchTerm}"
                    </span>
                  )}
                  {selectedCategory !== 'all' && (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                      {categories.find(c => c.id === selectedCategory)?.name}
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

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-gray-600 text-sm">Loading products...</p>
            </div>
          </div>
        )}

        {/* Modern Product Grid */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const inCart = isInCart(product.productId);
              const isPending = isOperationPending(product.productId);
              
              return (
                <div 
                  key={product.productId} 
                  className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 hover:border-gray-200"
                >
                  {/* Product Image */}
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={product.images && product.images.length > 0 ? product.images[0].imageUrl : 'https://placehold.co/300x300?text=No%20Image'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = 'https://placehold.co/300x300?text=Image%20Error';
                      }}
                    />
                    
                    {/* Featured Badge */}
                    {product.isFeatured && (
                      <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                        ⭐
                      </div>
                    )}
                    
                    {/* Out of Stock Overlay */}
                    {product.stock <= 0 && (
                      <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                        <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                          Out of Stock
                        </span>
                      </div>
                    )}

                    {/* Loading Overlay */}
                    {isPending && (
                      <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-5">
                    {/* Product Name */}
                    <h3 className="font-semibold text-gray-900 text-base mb-2 truncate group-hover:text-blue-600 transition-colors">
                      {product.name}
                    </h3>
                    
                    {/* Brand */}
                    {product.brand && (
                      <p className="text-sm text-gray-500 mb-3">{product.brand}</p>
                    )}
                    
                    {/* Price and Stock */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xl font-bold text-gray-900">₹{product.price}</span>
                      <span className="text-sm text-gray-500">{product.stock} left</span>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button 
                        onClick={() => toggleCart(product)}
                        disabled={product.stock <= 0 || isPending}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center ${
                          isPending
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : inCart
                              ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                              : product.stock > 0 
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b border-gray-400 mr-2"></div>
                            Updating...
                          </>
                        ) : inCart ? (
                          <>
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Remove
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10a2 2 0 001.9-1.37L21 6H5.4M7 13l-2 6h12M7 13l-2-6M9 21a1 1 0 100-2 1 1 0 000 2m8 1a1 1 0 100-2 1 1 0 000 2" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4h4m-2-2v4" />
                            </svg>
                            Add to Cart
                          </>
                        )}
                      </button>
                      <button 
                        onClick={() => navigate(`/product/${product.productId}`)}
                        disabled={product.stock <= 0 || isPending}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center ${
                          product.stock > 0 && !isPending
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Buy Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No Products Found */}
        {!loading && filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">😔</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-4 text-sm">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'No products are currently available'
              }
            </p>
            {(searchTerm || selectedCategory !== 'all') && (
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
        {!loading && products.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-600">
            Showing {filteredProducts.length} of {products.filter(p => p.isActive).length} products
          </div>
        )}
      </div>
      
      {/* Footer */}
      {/* Footer */}
    </div>
  );
};

export default Store;
