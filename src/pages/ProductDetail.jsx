import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import productService from '../services/productService';
import cartService from '../services/cartService';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isInCart, setIsInCart] = useState(false);
  const [cartQuantity, setCartQuantity] = useState(0);
  const [isOperationPending, setIsOperationPending] = useState(false);
  const [localCartQuantity, setLocalCartQuantity] = useState(0);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError('');
      const productData = await productService.getProduct(productId);
      setProduct(productData);
      if (productData && productData.images && productData.images.length > 0) {
        setSelectedImage(0);
      }
    } catch (err) {
      console.error('Error loading product:', err);
      setError('Failed to load product details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const checkCartStatus = async () => {
    try {
      const cartItems = await cartService.getCartItems();
      const existingItem = cartItems.find(item => item.productId === productId);
      
      if (existingItem) {
        setIsInCart(true);
        setCartQuantity(existingItem.quantity);
        setLocalCartQuantity(existingItem.quantity);
        setQuantity(existingItem.quantity);
      } else {
        setIsInCart(false);
        setCartQuantity(0);
        setLocalCartQuantity(0);
        setQuantity(1);
      }
    } catch (error) {
      console.error('Error checking cart status:', error);
    }
  };

  // Optimized quantity change handler with debouncing
  const handleQuantityChange = useCallback(async (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= product.stock) {
      setQuantity(newQuantity);
      
      // If product is already in cart, update optimistically
      if (isInCart && product) {
        // Apply optimistic update immediately
        setLocalCartQuantity(newQuantity);
        
        // Check if operation is already pending
        if (isOperationPending) {
          return;
        }
        
        try {
          setIsOperationPending(true);
          const result = await cartService.updateCartItem(product.productId, newQuantity);
          if (result.success) {
            setCartQuantity(newQuantity);
            setLocalCartQuantity(newQuantity);
            console.log('Quantity updated successfully in product detail:', product.productId, newQuantity);
          } else {
            // Revert optimistic update on failure
            setLocalCartQuantity(cartQuantity);
            setQuantity(cartQuantity);
          }
        } catch (error) {
          console.error('Error updating cart quantity:', error);
          // Revert optimistic update on failure
          setLocalCartQuantity(cartQuantity);
          setQuantity(cartQuantity);
        } finally {
          setIsOperationPending(false);
        }
      }
    }
  }, [isInCart, product, cartQuantity, isOperationPending]);

  // Debounced quantity change for better performance
  const debouncedQuantityChange = useCallback(
    debounce((newQuantity) => {
      handleQuantityChange(newQuantity);
    }, 300),
    [handleQuantityChange]
  );

  // Debounce utility function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  useEffect(() => {
    loadProduct();
    checkCartStatus();
  }, [productId]);

  // Listen for cart updates
  useEffect(() => {
    const handleCartUpdate = (event) => {
      if (event.detail) {
        const cartItems = event.detail;
        const existingItem = cartItems.find(item => item.productId === productId);
        
        if (existingItem) {
          setIsInCart(true);
          setCartQuantity(existingItem.quantity);
          setLocalCartQuantity(existingItem.quantity);
          setQuantity(existingItem.quantity);
        } else {
          setIsInCart(false);
          setCartQuantity(0);
          setLocalCartQuantity(0);
          setQuantity(1);
        }
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [productId]);

  const handleToggleCart = async () => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: `/product/${productId}` } });
      return;
    }

    // Check if operation is already pending
    if (isOperationPending) {
      return;
    }

    try {
      setIsOperationPending(true);
      
      if (isInCart) {
        // Remove product from cart
        const result = await cartService.removeFromCart(product.productId);
        if (result.success) {
          setIsInCart(false);
          setCartQuantity(0);
          setLocalCartQuantity(0);
          setQuantity(1);
          console.log('Product removed from cart:', product.productId);
        }
      } else {
        // Add new item to cart with current quantity
        const result = await cartService.addToCart(product, quantity);
        if (result.success) {
          setIsInCart(true);
          setCartQuantity(quantity);
          setLocalCartQuantity(quantity);
          console.log('Product added to cart:', product.productId, quantity);
        }
      }
    } catch (error) {
      console.error('Error toggling cart:', error);
      Swal.fire({
        icon: 'error',
        title: 'Cart Update Failed',
        text: 'Failed to update cart. Please try again.',
        confirmButtonColor: '#3B82F6'
      });
    } finally {
      setIsOperationPending(false);
    }
  };

  const handleBuyNow = () => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: `/product/${productId}` } });
      return;
    }

    // TODO: Implement buy now functionality
    console.log(`Buying ${quantity} of ${product.name}`);
    Swal.fire({
      icon: 'info',
      title: 'Buy Now',
      text: `Proceeding to checkout with ${quantity} ${product.name}!`,
      confirmButtonColor: '#3B82F6'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Product not found</h3>
          <p className="text-gray-600 mb-4">{error || 'The product you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/store')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Back to Store
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <button
                onClick={() => navigate('/store')}
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Store
              </button>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">{product.name}</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Product Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Product Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                <img
                  src={product.images && product.images.length > 0 
                    ? product.images[selectedImage].imageUrl 
                    : 'https://placehold.co/600x600?text=No%20Image'
                  }
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/600x600?text=Image%20Error';
                  }}
                />
              </div>

              {/* Thumbnail Images */}
              {product.images && product.images.length > 1 && (
                <div className="flex space-x-2 overflow-x-auto">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === index 
                          ? 'border-blue-500 ring-2 ring-blue-200' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={image.imageUrl}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://placehold.co/80x80?text=Error';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Product Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
                  {product.isFeatured && (
                    <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      ⭐ Featured
                    </span>
                  )}
                </div>
                
                {product.brand && (
                  <p className="text-lg text-gray-600 mb-4">Brand: {product.brand}</p>
                )}

                <div className="flex items-center space-x-4 mb-4">
                  <span className="text-3xl font-bold text-blue-600">₹{product.price}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    product.stock > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                  </span>
                </div>
              </div>

              {/* Product Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
              </div>

              {/* Product Details */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Product Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-2">Category:</span>
                    <span className="font-medium capitalize">{product.category}</span>
                  </div>
                  {product.weight && (
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-2">Weight:</span>
                      <span className="font-medium">{product.weight}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-2">SKU:</span>
                    <span className="font-medium">{product.productId}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-2">Status:</span>
                    <span className={`font-medium ${product.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity Selector */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Quantity</h3>
                  {isInCart && (
                    <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {localCartQuantity} in cart
                      {isOperationPending && (
                        <div className="ml-2 animate-spin rounded-full h-3 w-3 border-b border-green-600"></div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1 || isOperationPending}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  
                  <input
                    type="number"
                    min="1"
                    max={product.stock}
                    value={quantity}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value) || 1;
                      setQuantity(newValue);
                      // Use debounced update for better performance
                      debouncedQuantityChange(newValue);
                    }}
                    disabled={isOperationPending}
                    className="w-20 h-10 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  />
                  
                  <button
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= product.stock || isOperationPending}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                  
                  <span className="text-sm text-gray-500">
                    {product.stock} available
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <div className="flex space-x-3">
                  <button
                    onClick={handleToggleCart}
                    disabled={product.stock <= 0 || isOperationPending}
                    className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center ${
                      isOperationPending
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isInCart
                          ? 'bg-green-100 hover:bg-green-200 text-green-700 border border-green-300' 
                          : product.stock > 0 
                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isOperationPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b border-gray-400 mr-2"></div>
                        Updating...
                      </>
                    ) : isInCart ? (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Remove from Cart
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
                    onClick={handleBuyNow}
                    disabled={product.stock <= 0 || isOperationPending}
                    className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center ${
                      product.stock > 0 && !isOperationPending
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
                
               
                {product.stock <= 0 && (
                  <p className="text-red-600 text-sm text-center">
                    This product is currently out of stock
                  </p>
                )}
              </div>

              {/* Additional Info */}
              <div className="border-t border-gray-200 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="flex flex-col items-center">
                    <svg className="w-8 h-8 text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <h4 className="font-semibold text-sm">Free Shipping</h4>
                    <p className="text-xs text-gray-500">On orders over ₹200</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <svg className="w-8 h-8 text-blue-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <h4 className="font-semibold text-sm">Easy Returns</h4>
                    <p className="text-xs text-gray-500">10-day return policy</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <svg className="w-8 h-8 text-purple-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <h4 className="font-semibold text-sm">Quality Guarantee</h4>
                    <p className="text-xs text-gray-500">100% authentic products</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ProductDetail;
