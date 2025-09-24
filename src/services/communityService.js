
const API_COMMUNITIES_BASE = process.env.REACT_APP_COMMUNITIES_API_URL || 'https://8fdvmzphij.execute-api.us-east-1.amazonaws.com/prod';
const API_RT_BASE = process.env.REACT_APP_COMMUNITY_RT_API_URL || 'https://6hwmn5qbwk.execute-api.us-east-1.amazonaws.com/prod';

class CommunityService {
  // internal caches and inflight maps
  constructor() {
    this.cache = new Map(); // key -> { data, expiresAt }
    this.inflight = new Map(); // key -> Promise
    this.DEFAULT_TTL_MS = 60 * 1000; // 1 minute
    this.DEFAULT_TIMEOUT_MS = 10 * 1000; // 10 seconds
  }

  // helpers
  _cacheGet(key) {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data;
  }

  _cacheSet(key, data, ttlMs = this.DEFAULT_TTL_MS) {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  async _fetchWithTimeout(url, options = {}, timeoutMs = this.DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(new Error('Request timeout')), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } finally {
      clearTimeout(id);
    }
  }

  async _dedup(key, fn) {
    if (this.inflight.has(key)) {
      return this.inflight.get(key);
    }
    const p = (async () => {
      try {
        return await fn();
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, p);
    return p;
  }

  // Get all communities
  async getCommunities() {
    const cacheKey = 'communities:list';
    const cached = this._cacheGet(cacheKey);
    if (cached) return cached;

    return this._dedup(cacheKey, async () => {
      try {
        const response = await this._fetchWithTimeout(`${API_COMMUNITIES_BASE}/communities`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch communities');
        }

        const data = await response.json();
        // normalize to array
        const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
        this._cacheSet(cacheKey, list);
        return list;
      } catch (error) {
        console.error('Error fetching communities:', error);
        throw error;
      }
    });
  }

  // List communities the user has joined (expects backend route)
  async getUserCommunities(userId) {
    const safeId = encodeURIComponent(String(userId || ''));
    const cacheKey = `user:${safeId}:communities`;
    const cached = this._cacheGet(cacheKey);
    if (cached) return cached;

    return this._dedup(cacheKey, async () => {
      try {
        const response = await this._fetchWithTimeout(`${API_RT_BASE}/users/${safeId}/communities`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Failed to fetch user communities');
        const data = await response.json();
        this._cacheSet(cacheKey, data, 30 * 1000); // shorter TTL as it can change more often
        return data; // expected: array of communityId or items
      } catch (error) {
        console.error('Error fetching user joined communities:', error);
        throw error;
      }
    });
  }

  // Join community (increments memberCount on server)
  async joinCommunity(communityId, userId) {
    // invalidate caches possibly affected
    this.cache.delete('communities:list');
    this.cache.delete(`user:${encodeURIComponent(String(userId || ''))}:communities`);

    try {
      const response = await this._fetchWithTimeout(`${API_RT_BASE}/communities/${communityId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Failed to join community');
      }

      return await response.json();
    } catch (error) {
      console.error('Error joining community:', error);
      throw error;
    }
  }

  // Leave community (decrements memberCount on server)
  async leaveCommunity(communityId, userId) {
    // invalidate caches possibly affected
    this.cache.delete('communities:list');
    this.cache.delete(`user:${encodeURIComponent(String(userId || ''))}:communities`);

    try {
      const response = await this._fetchWithTimeout(`${API_RT_BASE}/communities/${communityId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Failed to leave community');
      }

      return await response.json();
    } catch (error) {
      console.error('Error leaving community:', error);
      throw error;
    }
  }

  // Messages
  async getCommunityMessages(communityId, { limit = 50, cursor } = {}) {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    const url = `${API_RT_BASE}/communities/${communityId}/messages${params.toString() ? `?${params}` : ''}`;

    const cacheKey = `community:${communityId}:messages:${params.toString()}`;
    const cached = this._cacheGet(cacheKey);
    if (cached) return cached;

    return this._dedup(cacheKey, async () => {
      const response = await this._fetchWithTimeout(url, { headers: { 'Content-Type': 'application/json' } }, 10000);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      this._cacheSet(cacheKey, data, 10 * 1000); // short TTL
      return data;
    });
  }

  async sendMessage(communityId, { text = '', mediaUrl = '', mediaType = 'none', userId = 'anon' }) {
    const response = await this._fetchWithTimeout(`${API_RT_BASE}/communities/${communityId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, mediaUrl, mediaType, userId })
    }, 15000);
    if (!response.ok) throw new Error('Failed to send message');
    // invalidate message cache for this community
    for (const key of this.cache.keys()) {
      if (key.startsWith(`community:${communityId}:messages`)) this.cache.delete(key);
    }
    return await response.json();
  }

  // Best-effort: resolve a username for a given userId
  async getUsername(userId) {
    if (!userId) return null;
    const safeId = encodeURIComponent(String(userId));
    const cacheKey = `user:${safeId}:profile`;
    const cached = this._cacheGet(cacheKey);
    if (cached) return (
      cached.userName || cached.username || cached.name || cached.displayName || (cached.email ? String(cached.email).split('@')[0] : null)
    );

    try {
      const res = await this._fetchWithTimeout(`${API_RT_BASE}/users/${safeId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, 8000);
      if (!res.ok) return null;
      const data = await res.json();
      this._cacheSet(cacheKey, data, 5 * 60 * 1000);
      return (
        data.userName || data.username || data.name || data.displayName || (data.email ? String(data.email).split('@')[0] : null)
      );
    } catch (e) {
      return null;
    }
  }

  // Media upload via pre-signed URL flow
  async getUploadPresign(communityId, contentType) {
    const response = await this._fetchWithTimeout(`${API_RT_BASE}/uploads/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ communityId, contentType })
    }, 15000);
    if (!response.ok) throw new Error('Failed to get presigned url');
    return await response.json(); // { uploadUrl, key, mediaUrl }
  }

  async uploadMedia(communityId, file) {
    const presign = await this.getUploadPresign(communityId, file.type || 'application/octet-stream');
    const put = await this._fetchWithTimeout(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
      mode: 'cors'
    }, 60 * 1000);
    if (!put.ok) throw new Error('Failed to upload to S3');
    return { mediaUrl: presign.mediaUrl, key: presign.key };
  }

  // Get community by ID
  async getCommunityById(communityId) {
    const cacheKey = `community:${communityId}:detail`;
    const cached = this._cacheGet(cacheKey);
    if (cached) return cached;

    return this._dedup(cacheKey, async () => {
      try {
        const response = await this._fetchWithTimeout(`${API_COMMUNITIES_BASE}/communities/${communityId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch community');
        }

        const data = await response.json();
        this._cacheSet(cacheKey, data);
        return data;
      } catch (error) {
        console.error('Error fetching community:', error);
        throw error;
      }
    });
  }

  // Create new community (Admin only)
  async createCommunity(communityData) {
    // invalidate list cache
    this.cache.delete('communities:list');

    try {
      const response = await this._fetchWithTimeout(`${API_COMMUNITIES_BASE}/communities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(communityData)
      });

      if (!response.ok) {
        throw new Error('Failed to create community');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating community:', error);
      throw error;
    }
  }

  // Update community (Admin only)
  async updateCommunity(communityId, communityData) {
    // invalidate caches
    this.cache.delete('communities:list');
    this.cache.delete(`community:${communityId}:detail`);

    try {
      const response = await this._fetchWithTimeout(`${API_COMMUNITIES_BASE}/communities/${communityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(communityData)
      });

      if (!response.ok) {
        throw new Error('Failed to update community');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating community:', error);
      throw error;
    }
  }

  // Delete community (Admin only)
  async deleteCommunity(communityId) {
    // invalidate caches
    this.cache.delete('communities:list');
    this.cache.delete(`community:${communityId}:detail`);

    try {
      const response = await this._fetchWithTimeout(`${API_COMMUNITIES_BASE}/communities/${communityId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete community');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting community:', error);
      throw error;
    }
  }

  // Toggle community status (Admin only)
  async toggleCommunityStatus(communityId, isActive) {
    // invalidate caches
    this.cache.delete('communities:list');
    this.cache.delete(`community:${communityId}:detail`);

    try {
      const response = await this._fetchWithTimeout(`${API_COMMUNITIES_BASE}/communities/${communityId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle community status');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error toggling community status:', error);
      throw error;
    }
  }

  // Get community analytics (Admin only)
  async getCommunityAnalytics(communityId) {
    try {
      const response = await this._fetchWithTimeout(`${API_COMMUNITIES_BASE}/admin/communities/${communityId}/analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch community analytics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching community analytics:', error);
      throw error;
    }
  }
}

export default new CommunityService();
