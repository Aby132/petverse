import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import cartService from '../services/cartService';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';

const Cart = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [productStocks, setProductStocks] = useState({});

  useEffect(() => {
    loadCartItems();
    // Check for and remove sold animals when component mounts
    // Use enhanced function with API verification
    checkAndRemoveSoldAnimals();
    
    // Set up periodic check for sold animals (every 2 minutes)
    const interval = setInterval(() => {
      checkAndRemoveSoldAnimals();
    }, 120000);
    
    return () => clearInterval(interval);
  }, []);

  // Listen for cart updates from other components
  useEffect(() => {
    const handleCartUpdate = (event) => {
      if (event.detail && Array.isArray(event.detail)) {
        // Filter items: keep sold animals, remove completed products
        const filteredItems = event.detail.filter(item => {
          // For products: remove if order is completed
          if (!isAnimal(item)) {
            return item.orderStatus !== 'completed' && 
                   item.orderStatus !== 'delivered';
          }
          // For animals: keep all (including sold ones) to show them with "Sold" label
          return true;
        });
        setCartItems(filteredItems);
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
      
      // Filter items: keep sold animals (to show them), remove completed products
      let filteredItems = Array.isArray(items) ? items.filter(item => {
        // For products: remove if order is completed
        if (!isAnimal(item)) {
          return item.orderStatus !== 'completed' && 
                 item.orderStatus !== 'delivered';
        }
        // For animals: keep all (including sold ones) to show them with "Sold" label
        return true;
      }) : [];
      
      // Check for deleted animals and update their status
      const animalItems = filteredItems.filter(isAnimal);
      if (animalItems.length > 0) {
        console.log('Checking for deleted animals and updating status...');
        const availabilityChecks = await Promise.all(
          animalItems.map(async (item) => {
            const animalId = item.animalId || item.productId;
            const animalData = await verifyAnimalAvailability(animalId);
            return { item, animalData };
          })
        );
        
        // Update items with current animal status and filter out deleted animals
        filteredItems = filteredItems.map(item => {
          if (isAnimal(item)) {
            const check = availabilityChecks.find(c => c.item === item);
            if (check && check.animalData) {
              // Update item with current animal data from API
              return {
                ...item,
                status: check.animalData.status,
                orderStatus: check.animalData.orderStatus,
                isSold: check.animalData.isSold,
                availability: check.animalData.availability,
                soldAt: check.animalData.soldAt
              };
            } else if (check === false) {
              // Animal was deleted - return null to filter out
              return null;
            }
          }
          return item;
        }).filter(item => item !== null); // Remove deleted animals
        
        // Update cart if any changes were made
        if (filteredItems.length !== items.length || 
            JSON.stringify(filteredItems) !== JSON.stringify(items)) {
          console.log('Updated animal status and removed deleted animals from cart');
          localStorage.setItem('petverse_cart', JSON.stringify(filteredItems));
        }
      }
      
      setCartItems(filteredItems);
      
      // Load stock information for products (not animals)
      await loadProductStocks(filteredItems);
      
    } catch (error) {
      console.error('Error loading cart:', error);
      setError('Failed to load cart items. Please try again.');
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to load stock information for products only (not animals)
  const loadProductStocks = async (items) => {
    try {
      // Filter only non-animal items (products) - animals don't have stock
      const productItems = items.filter(item => !isAnimal(item));
      
      if (productItems.length === 0) {
        setProductStocks({});
        return;
      }

      // Fetch stock information for each product
      const stockPromises = productItems.map(async (item) => {
        try {
          const response = await fetch(`https://ykqbrht440.execute-api.us-east-1.amazonaws.com/prod/products/${item.productId}`);
          if (response.ok) {
            const productData = await response.json();
            return {
              productId: item.productId,
              stock: productData.stock || 0
            };
          } else {
            console.warn(`API returned ${response.status} for product ${item.productId}:`, response.statusText);
            return {
              productId: item.productId,
              stock: item.stock || 0 // Use cached stock if API fails
            };
          }
        } catch (error) {
          console.error(`Error fetching stock for product ${item.productId}:`, error);
          return {
            productId: item.productId,
            stock: item.stock || 0 // Use cached stock if API fails
          };
        }
      });

      const stockResults = await Promise.all(stockPromises);
      const stockMap = {};
      stockResults.forEach(result => {
        stockMap[result.productId] = result.stock;
      });
      
      setProductStocks(stockMap);
    } catch (error) {
      console.error('Error loading product stocks:', error);
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    
    // Find the item to check if it's an animal
    const item = cartItems.find(item => item.productId === productId);
    if (item && isAnimal(item)) {
      console.warn('Cannot update quantity for animals - they are unique items without stock');
      return; // Prevent quantity updates for animals (they don't have stock/quantity)
    }
    
    // Check stock limit for products
    if (item && !isAnimal(item)) {
      const currentStock = productStocks[productId] || item.stock || 0;
      if (newQuantity > currentStock) {
        Swal.fire({
          icon: 'warning',
          title: 'Insufficient Stock',
          text: `Only ${currentStock} items available in stock.`,
          confirmButtonColor: '#3B82F6'
        });
        return;
      }
    }
    
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

  const removeItem = async (itemId) => {
    try {
      setError('');
      
      if (!cartService || typeof cartService.removeFromCart !== 'function') {
        throw new Error('Cart service not available');
      }

      // Find the item to determine if it's an animal
      const itemToRemove = cartItems.find(item => 
        item.productId === itemId || item.animalId === itemId
      );
      
      if (!itemToRemove) {
        console.warn('Item not found in cart:', itemId);
        return;
      }

      // Optimistic update - remove from UI immediately
      const originalItems = [...cartItems];
      setCartItems(prevItems => prevItems.filter(item => 
        item.productId !== itemId && item.animalId !== itemId
      ));

      // For animals, we need to handle removal differently
      if (isAnimal(itemToRemove)) {
        console.log('Removing animal from cart:', itemToRemove.name);
        
        // For animals, we can remove directly from localStorage since they don't sync with backend
        const updatedCart = cartItems.filter(item => 
          item.productId !== itemId && item.animalId !== itemId
        );
        
        // Update localStorage
        localStorage.setItem('petverse_cart', JSON.stringify(updatedCart));
        
        // Update the UI state
        setCartItems(updatedCart);
        
        // Dispatch cart update event to notify other components
        window.dispatchEvent(new CustomEvent('cartUpdated', { 
          detail: updatedCart 
        }));
        
        console.log('Animal removed successfully from cart');
        return;
      }

      // For regular products, use the cart service
      const result = await cartService.removeFromCart(itemId);
      
      if (result && result.success) {
        // Use the updated cart from the service (already updated optimistically)
        setCartItems(Array.isArray(result.cart) ? result.cart : []);
        console.log('Product removed successfully:', itemId);
      } else {
        // Revert optimistic update on failure
        setCartItems(originalItems);
        console.warn('Failed to remove product:', result?.message || 'Unknown error');
        setError('Failed to remove item. Please try again.');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      setError('Error removing item. Please try again.');
    }
  };

  const clearCart = async () => {
    if (updating) return;
    
    const result = await Swal.fire({
      title: 'Clear Cart',
      text: 'Are you sure you want to clear your cart?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, clear it!',
      cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) {
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

  // Helper function to get product/animal image URL
  const getProductImageUrl = (item) => {
    // For animals, prioritize animal-specific image properties
    if (isAnimal(item)) {
      // Try imageUrl property first (now properly set from Animals.jsx)
      if (item.imageUrl) {
        return item.imageUrl;
      }
      
      // Try imageUrls array (fallback)
    if (item.imageUrls && Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
      return item.imageUrls[0];
    }
    
      // Try images array
      if (item.images && Array.isArray(item.images) && item.images.length > 0) {
        const firstImage = item.images[0];
        const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage.imageUrl;
        return imageUrl;
      }
      
      // Try image property
      if (item.image) {
        return item.image;
      }
      
      // Animal-specific placeholder
      const emoji = getAnimalEmoji(item.type);
      return `https://placehold.co/100x100?text=${emoji}`;
    }
    
    // For regular products, try different image properties
    if (item.imageUrl) {
      return item.imageUrl;
    }
    
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      const firstImage = item.images[0];
      const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage.imageUrl;
      return imageUrl;
    }
    
    if (item.image) {
      return item.image;
    }
    
    // Fallback to placeholder
    return 'https://placehold.co/100x100?text=No%20Image';
  };

  // Helper function to check if item is an animal
  const isAnimal = (item) => {
    // First check for explicit flag
    if (item.isAnimal === true) {
      return true;
    }
    
    // Check for animalId
    if (item.animalId) {
      return true;
    }
    
    // Check for animal-specific properties
    if (item.type && (item.breed || item.ownerName)) {
      return true;
    }
    
    // Check for ownerName
    if (item.ownerName) {
      return true;
    }
    
    // Additional check for animals vs products
    if (item.name && item.type && !item.category) {
      return true;
    }
    
    // Additional fallback: check for common animal-related properties
    const hasAnimalProperties = item.age || item.gender || item.weight || item.color || item.microchipId;
    if (hasAnimalProperties && item.type) {
      return true;
    }
    
    // Check if the name suggests it's an animal (common pet names)
    const commonPetNames = ['buddy', 'whiskers', 'fluffy', 'spot', 'max', 'bella', 'luna', 'charlie', 'milo', 'kuttusan'];
    if (item.name && commonPetNames.some(petName => item.name.toLowerCase().includes(petName.toLowerCase()))) {
      return true;
    }
    
    return false;
  };

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

  // Helper function to get item display name
  const getItemDisplayName = (item) => {
    return item.name || item.productName || 'Unknown Item';
  };

  // Helper function to check if an animal is sold
  const isAnimalSold = (item) => {
    if (!isAnimal(item)) return false;
    
    return item.status === 'Sold' || 
           item.orderStatus === 'delivered' || 
           item.orderStatus === 'completed' ||
           item.isSold === true ||
           item.availability === 'Sold';
  };

  // Helper function to remove sold animals from cart
  const removeSoldAnimals = async () => {
    try {
      // Get current cart items
      const currentItems = await cartService.getCartItems();
      
      // Filter out sold animals - check multiple status indicators
      const availableItems = currentItems.filter(item => {
        if (isAnimal(item)) {
          // Check multiple ways an animal might be marked as sold
          return item.status !== 'Sold' && 
                 item.orderStatus !== 'delivered' && 
                 item.orderStatus !== 'completed' &&
                 !item.isSold &&
                 item.availability !== 'Sold';
        }
        return true;
      });
      
      // If any sold animals were found, update the cart
      if (availableItems.length !== currentItems.length) {
        console.log('Removing sold animals from cart');
        // Update localStorage directly to remove sold animals
        localStorage.setItem('petverse_cart', JSON.stringify(availableItems));
        
        // Update the UI
        setCartItems(availableItems);
        
        // Silently remove sold animals without notification
      }
    } catch (error) {
      console.error('Error removing sold animals from cart:', error);
    }
  };

  // Function to remove a specific animal from cart with confirmation
  const removeAnimalFromCart = async (animalId, animalName) => {
    try {
      // Find the animal to check if it's sold
      const animal = cartItems.find(item => 
        (item.animalId === animalId || item.productId === animalId) && isAnimal(item)
      );
      const isSold = animal ? isAnimalSold(animal) : false;

      const result = await Swal.fire({
        title: isSold ? 'Remove Sold Animal from Cart?' : 'Remove Animal from Cart?',
        html: `
          <div class="text-left">
            <p class="mb-2">Are you sure you want to remove <strong>${animalName}</strong> from your cart?</p>
            ${isSold ? '<p class="text-sm text-red-600 font-medium">⚠️ This animal is marked as sold</p>' : ''}
            <p class="text-sm text-gray-600">This action cannot be undone.</p>
          </div>
        `,
        icon: isSold ? 'warning' : 'question',
        showCancelButton: true,
        confirmButtonColor: isSold ? '#ef4444' : '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: isSold ? 'Yes, remove sold animal!' : 'Yes, remove it!',
        cancelButtonText: 'Cancel'
      });

      if (!result.isConfirmed) {
        return;
      }

      // Remove the animal from cart
      await removeItem(animalId);
      
      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'Animal Removed',
        text: `${animalName} has been removed from your cart.`,
        confirmButtonColor: '#3B82F6',
        timer: 2000,
        showConfirmButton: true
      });
    } catch (error) {
      console.error('Error removing animal from cart:', error);
      Swal.fire({
        icon: 'error',
        title: 'Remove Failed',
        text: 'Failed to remove animal from cart. Please try again.',
        confirmButtonColor: '#3B82F6'
      });
    }
  };

  // Helper function to verify animal availability by checking the API
  const verifyAnimalAvailability = async (animalId) => {
    try {
      const response = await fetch(`https://gk394j27jg.execute-api.us-east-1.amazonaws.com/prod/animals/${animalId}`);
      if (response.ok) {
        const data = await response.json();
        // Animal exists - return the full animal data for status checking
        return data.animal ? data.animal : false;
      } else if (response.status === 404) {
        // Animal not found - it has been deleted
        console.log(`Animal ${animalId} not found - it has been deleted`);
        return false;
      } else {
        console.warn(`API returned ${response.status} for animal ${animalId}:`, response.statusText);
        // For other errors, assume animal is still available to avoid false positives
        return true;
      }
    } catch (error) {
      console.error('Error verifying animal availability:', error);
      // If API call fails, assume animal is still available to avoid false positives
      return true;
    }
  };

  // Enhanced function to check and update sold animals with API verification
  const checkAndRemoveSoldAnimals = async () => {
    try {
      const currentItems = await cartService.getCartItems();
      const animalItems = currentItems.filter(isAnimal);
      
      if (animalItems.length === 0) return;
      
      // Check each animal's current status via API
      const availabilityChecks = await Promise.all(
        animalItems.map(async (item) => {
          const animalId = item.animalId || item.productId;
          const animalData = await verifyAnimalAvailability(animalId);
          return { item, animalData };
        })
      );
      
      // Update cart items with current animal status
      const updatedItems = currentItems.map(item => {
        if (isAnimal(item)) {
          const check = availabilityChecks.find(c => c.item === item);
          if (check && check.animalData) {
            // Update item with current animal data from API
            return {
              ...item,
              status: check.animalData.status,
              orderStatus: check.animalData.orderStatus,
              isSold: check.animalData.isSold,
              availability: check.animalData.availability,
              soldAt: check.animalData.soldAt
            };
          } else if (check === false) {
            // Animal was deleted - mark for removal
            return null;
          }
        }
        return item;
      }).filter(item => item !== null); // Remove deleted animals
      
      // Update cart if any changes were made
      if (updatedItems.length !== currentItems.length || 
          JSON.stringify(updatedItems) !== JSON.stringify(currentItems)) {
        console.log('Updating cart with current animal status');
        localStorage.setItem('petverse_cart', JSON.stringify(updatedItems));
        setCartItems(updatedItems);
      }
    } catch (error) {
      console.error('Error checking animal availability:', error);
    }
  };

  const handleCheckout = async () => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: '/cart' } });
      return;
    }

    // First, refresh animal status before checkout
    await checkAndRemoveSoldAnimals();

    // Check for sold animals (prevent checkout if animals are sold)
    const soldAnimals = cartItems.filter(item => isAnimalSold(item));
    if (soldAnimals.length > 0) {
      const animalNames = soldAnimals.map(item => item.name).join(', ');
      Swal.fire({
        icon: 'error',
        title: 'Cannot Proceed to Checkout',
        html: `
          <div class="text-left">
            <p class="mb-2">The following animals have been sold and cannot be purchased:</p>
            <ul class="list-disc list-inside space-y-1 text-sm">
              ${soldAnimals.map(animal => `<li class="flex items-center"><span class="mr-2">🐾</span>${animal.name} - ${animal.status || 'Sold'}</li>`).join('')}
            </ul>
            <p class="mt-3 text-sm text-gray-600">Please remove these animals from your cart before proceeding to checkout.</p>
          </div>
        `,
        confirmButtonColor: '#3B82F6'
      });
      return;
    }

    // Check for out-of-stock products (animals don't have stock - they are unique items)
    const outOfStockItems = cartItems.filter(item => {
      if (isAnimal(item)) return false; // Animals don't have stock limits - they are unique items
      const currentStock = productStocks[item.productId] || item.stock || 0;
      return item.quantity > currentStock || currentStock <= 0;
    });

    if (outOfStockItems.length > 0) {
      const itemNames = outOfStockItems.map(item => item.name).join(', ');
      Swal.fire({
        icon: 'error',
        title: 'Cannot Proceed to Checkout',
        text: `The following items are out of stock: ${itemNames}. Please remove them or reduce quantities before proceeding.`,
        confirmButtonColor: '#3B82F6'
      });
      return;
    }

    // Navigate directly to checkout page - cart items will remain until order is successfully placed
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
              {cartItems.map((item) => {
                const animalIsSold = isAnimalSold(item);
                return (
                <div key={item.productId} className={`bg-white rounded-xl shadow-sm border p-6 ${
                  animalIsSold ? 'border-red-200 bg-red-50' : 'border-gray-200'
                }`}>
                  <div className="flex items-center space-x-4">
                    {/* Product/Animal Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={getProductImageUrl(item)}
                        alt={getItemDisplayName(item)}
                        className="w-20 h-20 object-cover rounded-lg"
                        onError={(e) => {
                          // Use animal-specific placeholder if it's an animal
                          if (isAnimal(item)) {
                            e.target.src = `https://placehold.co/100x100?text=${getAnimalEmoji(item.type)}`;
                          } else {
                          e.target.src = 'https://placehold.co/100x100?text=No%20Image';
                          }
                        }}
                      />
                    </div>

                    {/* Product/Animal Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {getItemDisplayName(item)}
                          </h3>
                            {animalIsSold && (
                              <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                SOLD
                              </span>
                            )}
                          </div>
                          {isAnimal(item) ? (
                            <div className="text-sm text-gray-500 space-y-1">
                              <div className="flex items-center space-x-4">
                                {item.type && (
                                  <span className="flex items-center">
                                    <span className="mr-1">{getAnimalEmoji(item.type)}</span>
                                    <span className="font-medium">{item.type}</span>
                                  </span>
                                )}
                                {item.breed && <span>Breed: {item.breed}</span>}
                              </div>
                              {item.age && <p>Age: {item.age}</p>}
                              {item.gender && <p>Gender: {item.gender}</p>}
                              {item.ownerName && <p>Owner: {item.ownerName}</p>}
                            </div>
                          ) : (
                            item.brand && <p className="text-sm text-gray-500">{item.brand}</p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (isAnimal(item)) {
                              removeAnimalFromCart(item.animalId || item.productId, item.name);
                            } else {
                              removeItem(item.productId);
                            }
                          }}
                          disabled={updating}
                          className={`transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            animalIsSold 
                              ? 'text-red-400 hover:text-red-600' 
                              : 'text-gray-400 hover:text-red-500'
                          }`}
                          title={isAnimal(item) ? 
                            (animalIsSold ? 'Remove sold animal from cart' : 'Remove animal from cart') : 
                            'Remove product from cart'
                          }
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-bold text-blue-600">₹{item.price}</span>
                          {isAnimal(item) ? (
                            <span className="text-sm text-gray-500">unique animal</span>
                          ) : (
                            <span className="text-sm text-gray-500">per item</span>
                          )}
                        </div>

                        {/* Quantity Controls - Different for animals vs products */}
                        {isAnimal(item) ? (
                          <div className="flex items-center space-x-2">
                            {animalIsSold ? (
                              <span className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                                🚫 Sold - Cannot Purchase
                              </span>
                            ) : (
                              <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                                🐾 Unique Animal
                            </span>
                            )}
                            <span className="w-12 text-center font-medium text-gray-500">1</span>
                          </div>
                        ) : (
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
                              disabled={item.quantity >= (productStocks[item.productId] || item.stock || 999) || updating}
                              className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Item Total */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Item Total:</span>
                          <span className="text-lg font-bold text-gray-900">₹{item.price * item.quantity}</span>
                        </div>
                        {isAnimal(item) ? (
                          <div className="mt-1">
                            {animalIsSold ? (
                              <p className="text-xs text-red-600 font-medium">
                                🚫 This animal has been sold and cannot be purchased
                              </p>
                            ) : (
                              <p className="text-xs text-blue-600">
                                🐾 This is a unique animal - quantity cannot be changed
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="mt-1 space-y-1">
                            <p className="text-xs text-gray-500">
                              Stock: {productStocks[item.productId] !== undefined ? productStocks[item.productId] : (item.stock || 0)} available
                            </p>
                            {productStocks[item.productId] !== undefined && productStocks[item.productId] <= 0 && (
                              <p className="text-xs text-red-600 font-medium">
                                ⚠️ Out of Stock
                              </p>
                            )}
                            {productStocks[item.productId] !== undefined && item.quantity > productStocks[item.productId] && (
                              <p className="text-xs text-red-600 font-medium">
                                ⚠️ Quantity exceeds available stock
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}

              {/* Cart Action Buttons */}
              <div className="flex justify-between items-center">
                <div className="flex space-x-4">
                  {cartItems.filter(item => isAnimal(item)).length > 0 && (
                    <button
                      onClick={async () => {
                        const animals = cartItems.filter(item => isAnimal(item));
                        const animalCount = animals.length;
                        const soldCount = animals.filter(item => isAnimalSold(item)).length;
                        
                        const result = await Swal.fire({
                          title: 'Remove All Animals?',
                          html: `
                            <div class="text-left">
                              <p class="mb-2">Are you sure you want to remove all <strong>${animalCount} animal(s)</strong> from your cart?</p>
                              ${soldCount > 0 ? `<p class="text-sm text-red-600 font-medium">⚠️ ${soldCount} of these animals are marked as sold</p>` : ''}
                              <p class="text-sm text-gray-600">This action cannot be undone.</p>
                            </div>
                          `,
                          icon: soldCount > 0 ? 'warning' : 'question',
                          showCancelButton: true,
                          confirmButtonColor: '#ef4444',
                          cancelButtonColor: '#6b7280',
                          confirmButtonText: soldCount > 0 ? 'Yes, remove all (including sold)!' : 'Yes, remove all!',
                          cancelButtonText: 'Cancel'
                        });

                        if (result.isConfirmed) {
                          const animalIds = animals.map(item => item.animalId || item.productId);
                          
                          for (const animalId of animalIds) {
                            await removeItem(animalId);
                          }
                          
                          Swal.fire({
                            icon: 'success',
                            title: 'Animals Removed',
                            text: `All ${animalCount} animals have been removed from your cart.`,
                            confirmButtonColor: '#3B82F6',
                            timer: 2000,
                            showConfirmButton: true
                          });
                        }
                      }}
                      className="text-orange-600 hover:text-orange-700 font-medium transition-colors"
                    >
                      Remove All Animals
                    </button>
                  )}
                </div>
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
                {(() => {
                  const soldAnimals = cartItems.filter(item => isAnimalSold(item));
                  const outOfStockItems = cartItems.filter(item => {
                    if (isAnimal(item)) return false; // Animals don't have stock - they are unique items
                    const currentStock = productStocks[item.productId] || item.stock || 0;
                    return item.quantity > currentStock || currentStock <= 0;
                  });

                  const hasBlockingItems = soldAnimals.length > 0 || outOfStockItems.length > 0;

                  return (
                <button
                  onClick={handleCheckout}
                      disabled={hasBlockingItems || updating}
                      className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors mt-6 ${
                        hasBlockingItems || updating
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {updating ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : soldAnimals.length > 0 ? (
                        <span className="flex items-center justify-center">
                          <span className="mr-2">🐾</span>
                          Cannot Checkout ({soldAnimals.length} sold animals)
                        </span>
                      ) : outOfStockItems.length > 0 ? (
                        `Cannot Checkout (${outOfStockItems.length} out of stock)`
                      ) : (
                        'Proceed to Checkout'
                      )}
                </button>
                  );
                })()}

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
