import config from '../config/environment.js';

class UserService {
  constructor() {
    // Using hardcoded REST API base URL as requested
    this.baseURL = 'https://rihfgmk2k1.execute-api.us-east-1.amazonaws.com/prod';
    this.cache = new Map();
    this.cacheTimeout = config.features.cacheTimeout;
  }

  // Get current user ID from localStorage or Cognito
  getCurrentUserId() {
    try {
      // Try to get from Cognito first (for authenticated users)
      const clientId = config.aws.cognito.clientId;
      const lastAuthUser = localStorage.getItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`);
      
      if (lastAuthUser) {
        return lastAuthUser;
      }
      
      // Fallback to localStorage user
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id || user.userId || user.username || 'guest';
    } catch (error) {
      console.warn('Error getting user ID:', error);
      return 'guest';
    }
  }

  // Get authentication token if available
  getAuthToken() {
    try {
      const clientId = config.aws.cognito.clientId;
      const lastAuthUser = localStorage.getItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`);
      
      if (lastAuthUser) {
        const accessToken = localStorage.getItem(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.accessToken`);
        return accessToken;
      }
      return null;
    } catch (error) {
      console.warn('Error getting auth token:', error);
      return null;
    }
  }

  // Get user profile
  async getUserProfile() {
    try {
      const userId = this.getCurrentUserId();
      const cacheKey = `profile_${userId}`;
      
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const headers = { 'Content-Type': 'application/json' };
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.baseURL}/user/profile?userId=${userId}`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          // User profile doesn't exist yet
          return null;
        }
        throw new Error(`Failed to fetch user profile: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  // Create or update user profile
  async updateUserProfile(profileData) {
    try {
      const userId = this.getCurrentUserId();
      const headers = { 'Content-Type': 'application/json' };
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.baseURL}/user/profile`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          ...profileData
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update user profile: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Clear cache to force refresh
      this.clearCache(`profile_${userId}`);
      
      return result;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Get user addresses
  async getUserAddresses() {
    try {
      const userId = this.getCurrentUserId();
      const cacheKey = `addresses_${userId}`;
      
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const headers = { 'Content-Type': 'application/json' };
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.baseURL}/user/addresses?userId=${userId}`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Failed to fetch user addresses: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('Error fetching user addresses:', error);
      return [];
    }
  }

  // Add new address
  async addAddress(addressData) {
    try {
      const userId = this.getCurrentUserId();
      const headers = { 'Content-Type': 'application/json' };
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.baseURL}/user/addresses`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          ...addressData
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to add address: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Clear cache to force refresh
      this.clearCache(`addresses_${userId}`);
      
      return result;
    } catch (error) {
      console.error('Error adding address:', error);
      throw error;
    }
  }

  // Update address
  async updateAddress(addressId, addressData) {
    try {
      const userId = this.getCurrentUserId();
      const headers = { 'Content-Type': 'application/json' };
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.baseURL}/user/addresses`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          userId,
          addressId,
          ...addressData
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update address: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Clear cache to force refresh
      this.clearCache(`addresses_${userId}`);
      
      return result;
    } catch (error) {
      console.error('Error updating address:', error);
      throw error;
    }
  }

  // Delete address
  async deleteAddress(addressId) {
    try {
      const userId = this.getCurrentUserId();
      const headers = { 'Content-Type': 'application/json' };
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.baseURL}/user/addresses`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          userId,
          addressId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete address: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Clear cache to force refresh
      this.clearCache(`addresses_${userId}`);
      
      return result;
    } catch (error) {
      console.error('Error deleting address:', error);
      throw error;
    }
  }

  // Set default address
  async setDefaultAddress(addressId) {
    try {
      const userId = this.getCurrentUserId();
      const headers = { 'Content-Type': 'application/json' };
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.baseURL}/user/addresses/default`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          userId,
          addressId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to set default address: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Clear cache to force refresh
      this.clearCache(`addresses_${userId}`);
      
      return result;
    } catch (error) {
      console.error('Error setting default address:', error);
      throw error;
    }
  }

  // Clear cache for a specific key or all
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

export default new UserService();
