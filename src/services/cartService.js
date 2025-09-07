// Cart Service for PetVerse
// Direct API configuration - no imports needed

const API_BASE_URL = 'https://v1o5fpndre.execute-api.us-east-1.amazonaws.com/prod';

class CartService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/cart`;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.pendingRequests = new Map(); // Track pending requests
    this.batchQueue = []; // Queue for batch operations
    this.batchTimeout = null;
    this.batchDelay = 100; // 100ms batch delay
    this.optimisticUpdates = new Map(); // Track optimistic updates
    this.debounceTimers = new Map(); // Debounce timers
  }

  async getCartItems(userId = null, forceRefresh = false) {
    try {
      // Get userId from auth if not provided
      const currentUserId = userId || this.getCurrentUserId();
      
      // Check cache first for faster response
      if (!forceRefresh && currentUserId) {
        const cacheKey = `cart_${currentUserId}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log('📦 Returning cached cart items');
          return cached.data;
        }
      }

      // Check if backend is available
      const backendAvailable = await this.checkBackendAvailability();
      
      if (!backendAvailable || !currentUserId) {
        console.log('Backend not available or no user ID, using local storage fallback');
        const localCart = this.getCartFromLocalStorage();
        this.cacheCartItems(currentUserId, localCart);
        return localCart;
      }

      // Check if request is already pending
      const requestKey = `getCart_${currentUserId}`;
      if (this.pendingRequests.has(requestKey)) {
        console.log('⏳ Request already pending, waiting...');
        return this.pendingRequests.get(requestKey);
      }

      // Create pending request promise
      const requestPromise = this.fetchCartFromBackend(currentUserId);
      this.pendingRequests.set(requestKey, requestPromise);

      try {
        const cartItems = await requestPromise;
        this.cacheCartItems(currentUserId, cartItems);
        return cartItems;
      } finally {
        this.pendingRequests.delete(requestKey);
      }
    } catch (error) {
      console.warn('Error fetching cart from backend, using local storage:', error);
      const localCart = this.getCartFromLocalStorage();
      const currentUserId = userId || this.getCurrentUserId();
      this.cacheCartItems(currentUserId, localCart);
      return localCart;
    }
  }

  async fetchCartFromBackend(userId) {
    const headers = this.getHeaders();
    const response = await fetch(`${this.baseURL}?userId=${userId}`, {
      method: 'GET',
      headers
    });

    if (response.ok) {
      const cartItems = await response.json();
      this.updateLocalStorage(cartItems);
      this.dispatchCartUpdate(cartItems);
      return cartItems;
    } else {
      console.warn('Backend cart fetch failed, using local storage');
      const localCart = this.getCartFromLocalStorage();
      this.dispatchCartUpdate(localCart);
      return localCart;
    }
  }

  cacheCartItems(userId, cartItems) {
    if (userId) {
      const cacheKey = `cart_${userId}`;
      this.cache.set(cacheKey, {
        data: cartItems,
        timestamp: Date.now()
      });
    }
  }

  async addToCart(product, quantity = 1, userId = null) {
    try {
      // Handle both product object and productId string
      const productId = typeof product === 'string' ? product : product.productId;
      const currentUserId = userId || this.getCurrentUserId();
      
      console.log('🛒 Adding to cart:', {
        productId,
        quantity,
        currentUserId,
        product: typeof product === 'object' ? product : 'string'
      });
      
      // Debug: Log the product object structure
      if (typeof product === 'object') {
        console.log('📦 Product object details:', {
          name: product.name,
          imageUrl: product.imageUrl,
          images: product.images,
          hasImages: !!product.images,
          imagesLength: product.images?.length || 0
        });
      }
      
      const cartItem = {
        productId,
        quantity,
        userId: currentUserId,
        timestamp: Date.now(),
        // Include product details if product object is provided
        ...(typeof product === 'object' && {
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl || (product.images && product.images[0]?.imageUrl) || product.image,
          images: product.images, // Store full images array for flexibility
          brand: product.brand,
          stock: product.stock,
          category: product.category
        })
      };

      console.log('🛒 Created cart item:', {
        productId: cartItem.productId,
        name: cartItem.name,
        imageUrl: cartItem.imageUrl,
        images: cartItem.images,
        hasImages: !!cartItem.images,
        imagesLength: cartItem.images?.length || 0
      });

      // Apply optimistic update immediately for instant UI response
      const optimisticResult = this.applyOptimisticAddToCart(cartItem);
      this.dispatchCartUpdate(optimisticResult.cart);

      // Try to sync with backend in background
      if (currentUserId) {
        this.syncAddToCartWithBackend(cartItem, optimisticResult);
      } else {
        console.warn('⚠️ No user ID found, using local storage only');
      }

      return { success: true, cart: optimisticResult.cart };
    } catch (error) {
      console.error('Error adding to cart:', error);
      return { success: false, error: error.message };
    }
  }

  applyOptimisticAddToCart(cartItem) {
    const currentCart = this.getCartFromLocalStorage();
    const existingItem = currentCart.find(item => item.productId === cartItem.productId);
    
    if (existingItem) {
      existingItem.quantity += cartItem.quantity;
      // Update product details if provided
      if (typeof cartItem === 'object') {
        Object.assign(existingItem, {
          name: cartItem.name,
          price: cartItem.price,
          imageUrl: cartItem.imageUrl,
          images: cartItem.images,
          brand: cartItem.brand,
          stock: cartItem.stock,
          category: cartItem.category
        });
      }
    } else {
      currentCart.push(cartItem);
    }

    this.updateLocalStorage(currentCart);
    return { cart: currentCart, item: existingItem || cartItem };
  }

  async syncAddToCartWithBackend(cartItem, optimisticResult) {
    try {
      const headers = this.getHeaders();
      const response = await fetch(`${this.baseURL}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(cartItem)
      });

      if (response.ok) {
        console.log('✅ Item synced to backend');
        // Invalidate cache to force refresh on next request
        this.invalidateCache(cartItem.userId);
      } else {
        console.warn('❌ Backend sync failed, keeping local changes');
      }
    } catch (error) {
      console.warn('❌ Backend sync failed:', error);
    }
  }

  invalidateCache(userId) {
    if (userId) {
      const cacheKey = `cart_${userId}`;
      this.cache.delete(cacheKey);
    }
  }


  async updateCartItem(productId, quantity, userId = null) {
    try {
      const currentUserId = userId || this.getCurrentUserId();
      
      // Apply optimistic update immediately
      const optimisticResult = this.applyOptimisticUpdate(productId, quantity);
      if (!optimisticResult.success) {
        return optimisticResult;
      }

      this.dispatchCartUpdate(optimisticResult.cart);

      // Debounce backend sync to avoid too many requests
      this.debouncedBackendUpdate(productId, quantity, currentUserId);

      return { success: true, cart: optimisticResult.cart };
    } catch (error) {
      console.error('Error updating quantity:', error);
      return { success: false, error: error.message };
    }
  }

  applyOptimisticUpdate(productId, quantity) {
    const currentCart = this.getCartFromLocalStorage();
    const item = currentCart.find(item => item.productId === productId);
    
    if (!item) {
      return { success: false, error: 'Item not found in cart' };
    }

    if (quantity <= 0) {
      // Remove item optimistically
      const filteredCart = currentCart.filter(item => item.productId !== productId);
      this.updateLocalStorage(filteredCart);
      return { success: true, cart: filteredCart, action: 'remove' };
    }
    
    item.quantity = quantity;
    this.updateLocalStorage(currentCart);
    return { success: true, cart: currentCart, action: 'update' };
  }

  debouncedBackendUpdate(productId, quantity, userId) {
    const debounceKey = `update_${productId}`;
    
    // Clear existing timer
    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey));
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.syncUpdateWithBackend(productId, quantity, userId);
      this.debounceTimers.delete(debounceKey);
    }, 300); // 300ms debounce

    this.debounceTimers.set(debounceKey, timer);
  }

  async syncUpdateWithBackend(productId, quantity, userId) {
    if (!userId) return;

    try {
      const headers = this.getHeaders();
      const response = await fetch(`${this.baseURL}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ 
          productId, 
          quantity, 
          userId 
        })
      });

      if (response.ok) {
        console.log('✅ Cart item synced to backend');
        this.invalidateCache(userId);
      } else {
        console.warn('❌ Backend update failed:', response.status);
      }
    } catch (error) {
      console.warn('❌ Backend sync failed:', error);
    }
  }

  // Alias for backward compatibility
  async updateQuantity(productId, quantity, userId = null) {
    return this.updateCartItem(productId, quantity, userId);
  }

  async removeFromCart(productId, userId = null) {
    try {
      const currentUserId = userId || this.getCurrentUserId();
      
      // Apply optimistic update immediately
      const optimisticResult = this.applyOptimisticRemove(productId);
      this.dispatchCartUpdate(optimisticResult.cart);

      // Sync with backend in background
      if (currentUserId) {
        this.syncRemoveWithBackend(productId, currentUserId);
      }

      return { success: true, cart: optimisticResult.cart };
    } catch (error) {
      console.error('Error removing item:', error);
      return { success: false, error: error.message };
    }
  }

  applyOptimisticRemove(productId) {
    const currentCart = this.getCartFromLocalStorage();
    const filteredCart = currentCart.filter(item => item.productId !== productId);
    this.updateLocalStorage(filteredCart);
    return { cart: filteredCart };
  }

  async syncRemoveWithBackend(productId, userId) {
    try {
      const headers = this.getHeaders();
      const response = await fetch(`${this.baseURL}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ 
          productId, 
          userId 
        })
      });

      if (response.ok) {
        console.log('✅ Item removed from backend');
        this.invalidateCache(userId);
      } else {
        console.warn('❌ Backend remove failed:', response.status);
      }
    } catch (error) {
      console.warn('❌ Backend sync failed:', error);
    }
  }

  // Alias for backward compatibility
  async removeItem(productId, userId = null) {
    return this.removeFromCart(productId, userId);
  }

  async clearCart(userId = null) {
    try {
      const currentUserId = userId || this.getCurrentUserId();
      this.updateLocalStorage([]);

      // Try to sync with backend - clear all items for user
      if (currentUserId) {
        try {
          // Get all cart items first
          const cartItems = await this.getCartItems(currentUserId);
          
          // Remove each item from backend
          for (const item of cartItems) {
            const headers = this.getHeaders();
            await fetch(`${this.baseURL}`, {
              method: 'DELETE',
              headers,
              body: JSON.stringify({ 
                productId: item.productId, 
                userId: currentUserId 
              })
            });
          }
          
          console.log('Cart cleared on backend');
        } catch (error) {
          console.warn('Backend sync failed:', error);
        }
      }

      this.dispatchCartUpdate([]);
      return { success: true };
    } catch (error) {
      console.error('Error clearing cart:', error);
      return { success: false, error: error.message };
    }
  }

  async syncCartWithBackend(userId = null) {
    try {
      const localCart = this.getCartFromLocalStorage();
      if (localCart.length === 0) return;

      const headers = this.getHeaders();
      
      // Send entire cart to server
      await fetch(`${this.baseURL}/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          items: localCart
        })
      });

      console.log('Cart synced with backend');
    } catch (error) {
      console.warn('Failed to sync cart with backend:', error);
    }
  }

  async checkBackendAvailability() {
    try {
      // Try to make a simple GET request to check if backend is available
      const currentUserId = this.getCurrentUserId();
      if (!currentUserId) {
        return false; // No user ID means we can't test backend
      }
      
      const response = await fetch(`${this.baseURL}?userId=${currentUserId}`, { 
        method: 'GET',
        headers: this.getHeaders()
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Local storage methods
  getCartFromLocalStorage() {
    try {
      const cart = localStorage.getItem('petverse_cart');
      return cart ? JSON.parse(cart) : [];
    } catch (error) {
      console.error('Error reading cart from localStorage:', error);
      return [];
    }
  }

  updateLocalStorage(cart) {
    try {
      localStorage.setItem('petverse_cart', JSON.stringify(cart));
    } catch (error) {
      console.error('Error writing cart to localStorage:', error);
    }
  }

  dispatchCartUpdate(cart) {
    try {
      // Dispatch custom event to notify components of cart changes
      const event = new CustomEvent('cartUpdated', {
        detail: cart
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error dispatching cart update event:', error);
    }
  }

  // Helper methods
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    // Try to get auth token if available
    try {
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Could not get auth token:', error);
    }

    return headers;
  }

  getAuthToken() {
    try {
      // Try to get from Cognito - look for any access token
      const localStorageKeys = Object.keys(localStorage);
      const cognitoKeys = localStorageKeys.filter(key => 
        key.includes('CognitoIdentityServiceProvider') && key.includes('accessToken')
      );
      
      for (const key of cognitoKeys) {
        const token = localStorage.getItem(key);
        if (token) {
          return token;
        }
      }

      // Fallback to any stored token
      return localStorage.getItem('authToken') || localStorage.getItem('accessToken');
    } catch (error) {
      console.warn('Error getting auth token:', error);
      return null;
    }
  }

  getCurrentUserId() {
    try {
      // Try to get from Cognito first (for authenticated users)
      // Look for any Cognito client ID in localStorage
      const localStorageKeys = Object.keys(localStorage);
      const cognitoKeys = localStorageKeys.filter(key => key.includes('CognitoIdentityServiceProvider'));
      
      for (const key of cognitoKeys) {
        if (key.includes('LastAuthUser')) {
          const lastAuthUser = localStorage.getItem(key);
          if (lastAuthUser) {
            console.log('Found Cognito user ID:', lastAuthUser);
            return lastAuthUser;
          }
        }
      }
      
      // Try to get from other auth sources
      const userId = localStorage.getItem('userId') || 
                    localStorage.getItem('user_id') || 
                    localStorage.getItem('currentUser');
      
      if (userId) {
        console.log('Found localStorage user ID:', userId);
        return userId;
      }

      // Try to get from user object in localStorage (like userService does)
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id || user.userId || user.username) {
        const extractedUserId = user.id || user.userId || user.username;
        console.log('Found user ID from user object:', extractedUserId);
        return extractedUserId;
      }

      // Try to extract from JWT token if available
      const token = this.getAuthToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const extractedUserId = payload.sub || payload.user_id || payload.userId;
          if (extractedUserId) {
            console.log('Found user ID from token:', extractedUserId);
            return extractedUserId;
          }
        } catch (e) {
          console.warn('Could not parse token for userId:', e);
        }
      }

      console.warn('No user ID found, returning null');
      return null;
    } catch (error) {
      console.warn('Error getting current user ID:', error);
      return null;
    }
  }

  // Utility methods
  getCartItemCount() {
    const cart = this.getCartFromLocalStorage();
    return cart.reduce((total, item) => total + item.quantity, 0);
  }

  // Alias for backward compatibility
  getCartCount() {
    return this.getCartItemCount();
  }

  getCartTotal() {
    const cart = this.getCartFromLocalStorage();
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  isInCart(productId) {
    const cart = this.getCartFromLocalStorage();
    return cart.some(item => item.productId === productId);
  }

  getItemQuantity(productId) {
    const cart = this.getCartFromLocalStorage();
    const item = cart.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  }
}

// Create and export a single instance
const cartService = new CartService();
export default cartService;