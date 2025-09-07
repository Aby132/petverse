import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import cartService from '../services/cartService';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';

const Cart = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCartItems();
  }, []);

  // Listen for cart updates from other components
  useEffect(() => {
    const handleCartUpdate = (event) => {
      if (event.detail && Array.isArray(event.detail)) {
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
      setLoading(true);
      setError('');
      
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
      setError('Failed to load cart items. Please try again.');
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    
    try {
      setError('');
      
      if (!cartService || typeof cartService.updateCartItem !== 'function') {
        throw new Error('Cart service not available');
      }

      // Optimistic update - update UI immediately
      setCartItems(prevItems => 
        prevItems.map(item => 
          item.productId === productId 
            ? { ...item, quantity: newQuantity }
            : item
        )
      );

      const result = await cartService.updateCartItem(productId, newQuantity);
      
      if (result && result.success) {
        // Use the updated cart from the service (already updated optimistically)
        setCartItems(Array.isArray(result.cart) ? result.cart : []);
        console.log('Quantity updated successfully:', productId, newQuantity);
      } else {
        // Revert optimistic update on failure
        setCartItems(prevItems => 
          prevItems.map(item => 
            item.productId === productId 
              ? { ...item, quantity: item.quantity } // Revert to original
              : item
          )
        );
        console.warn('Failed to update cart:', result?.message || 'Unknown error');
        setError('Failed to update quantity. Please try again.');
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      setError('Error updating quantity. Please try again.');
    }
  };

  const removeItem = async (productId) => {
    try {
      setError('');
      
      if (!cartService || typeof cartService.removeFromCart !== 'function') {
        throw new Error('Cart service not available');
      }

      // Optimistic update - remove from UI immediately
      const originalItems = [...cartItems];
      setCartItems(prevItems => prevItems.filter(item => item.productId !== productId));

      const result = await cartService.removeFromCart(productId);
      
      if (result && result.success) {
        // Use the updated cart from the service (already updated optimistically)
        setCartItems(Array.isArray(result.cart) ? result.cart : []);
        console.log('Item removed successfully:', productId);
      } else {
        // Revert optimistic update on failure
        setCartItems(originalItems);
        console.warn('Failed to remove item:', result?.message || 'Unknown error');
        setError('Failed to remove item. Please try again.');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      setError('Error removing item. Please try again.');
    }
  };

  const clearCart = async () => {
    if (updating) return;
    
    if (!window.confirm('Are you sure you want to clear your cart?')) {
      return;
    }
    
    try {
      setUpdating(true);
      setError('');
      
      if (!cartService || typeof cartService.clearCart !== 'function') {
        throw new Error('Cart service not available');
      }

      const result = await cartService.clearCart();
      
      if (result && result.success) {
        setCartItems([]);
        console.log('Cart cleared successfully');
      } else {
        setError('Failed to clear cart. Please try again.');
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      setError('Error clearing cart. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateShipping = () => {
    const subtotal = calculateSubtotal();
    return subtotal >= 200 ? 0 : 50; // Free shipping over ₹200
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping();
  };

  // Helper function to get product image URL
  const getProductImageUrl = (item) => {
    // Debug: Log the item structure to see what image data is available
    console.log('🖼️ Cart item image data:', {
      productId: item.productId,
      name: item.name,
      imageUrl: item.imageUrl,
      images: item.images,
      image: item.image,
      fullItem: item
    });
    
    // Try different possible image URL properties
    if (item.imageUrl) {
      console.log('✅ Using imageUrl:', item.imageUrl);
      return item.imageUrl;
    }
    
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      // Handle both string URLs and objects with imageUrl property
      const firstImage = item.images[0];
      const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage.imageUrl;
      console.log('✅ Using images array:', imageUrl);
      return imageUrl;
    }
    
    if (item.image) {
      console.log('✅ Using image:', item.image);
      return item.image;
    }
    
    // Fallback to placeholder
    console.log('❌ No image found, using placeholder');
    return 'https://placehold.co/100x100?text=No%20Image';
  };

  const handleCheckout = () => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: '/cart' } });
      return;
    }

    // Navigate to checkout page
    navigate('/checkout');
  };

  // Error display component
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button 
              onClick={loadCartItems}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Try Again
            </button>
            <Link to="/store">
              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold transition-colors">
                Continue Shopping
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Shopping Cart</h1>
          <p className="text-gray-600">
            {cartItems.length === 0 
              ? 'Your cart is empty' 
              : `${cartItems.length} item${cartItems.length !== 1 ? 's' : ''} in your cart`
            }
          </p>
        </div>

        {cartItems.length === 0 ? (
          /* Empty Cart */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-6">🛒</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Looks like you haven't added any items to your cart yet. Start shopping to find amazing products for your pets!
            </p>
            <Link to="/store">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
                Continue Shopping
              </button>
            </Link>
          </div>
        ) : (
          /* Cart Items */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items List */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div key={item.productId} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  {/* Debug info - remove this after fixing */}
                  <div className="mb-2 p-2 bg-gray-100 rounded text-xs">
                    <strong>Debug:</strong> {JSON.stringify({
                      productId: item.productId,
                      name: item.name,
                      imageUrl: item.imageUrl,
                      hasImages: !!item.images,
                      imagesLength: item.images?.length || 0
                    })}
                  </div>
                  <div className="flex items-center space-x-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={getProductImageUrl(item)}
                        alt={item.name || 'Product'}
                        className="w-20 h-20 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.src = 'https://placehold.co/100x100?text=No%20Image';
                        }}
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {item.name}
                          </h3>
                          {item.brand && (
                            <p className="text-sm text-gray-500">{item.brand}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.productId)}
                          disabled={updating}
                          className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-bold text-blue-600">₹{item.price}</span>
                          <span className="text-sm text-gray-500">per item</span>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            disabled={item.quantity <= 1 || updating}
                            className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          
                          <span className="w-12 text-center font-medium">{item.quantity}</span>
                          
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            disabled={item.quantity >= (item.stock || 999) || updating}
                            className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Item Total */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Item Total:</span>
                          <span className="text-lg font-bold text-gray-900">₹{item.price * item.quantity}</span>
                        </div>
                        {item.stock && item.quantity >= item.stock && (
                          <p className="text-xs text-red-600 mt-1">
                            Maximum available quantity reached
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Clear Cart Button */}
              <div className="flex justify-end">
                <button
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-700 font-medium transition-colors"
                >
                  Clear Cart
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal ({cartItems.length} items)</span>
                    <span className="font-medium">₹{calculateSubtotal()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">
                      {calculateShipping() === 0 ? 'Free' : `₹${calculateShipping()}`}
                    </span>
                  </div>
                  
                  {calculateShipping() > 0 && (
                    <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                      Add ₹{200 - calculateSubtotal()} more for free shipping!
                    </div>
                  )}
                  
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>₹{calculateTotal()}</span>
                    </div>
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors mt-6"
                >
                  Proceed to Checkout
                </button>

                {/* Continue Shopping */}
                <Link to="/store">
                  <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold transition-colors mt-3">
                    Continue Shopping
                  </button>
                </Link>

                {/* Additional Info */}
                <div className="mt-6 space-y-3 text-sm text-gray-600">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Free shipping on orders over ₹200
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    10-day return policy
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Secure checkout
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Cart;
