import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import communityService from '../services/communityService';
import { useAuth } from '../contexts/AuthContext';

const Community = () => {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [mediaFile, setMediaFile] = useState(null); // Blob/File to upload
  const [mediaPreview, setMediaPreview] = useState('');
  const [mediaType, setMediaType] = useState('none'); // image|video|none
  const [processing, setProcessing] = useState(false);
  const { user } = useAuth();
  const currentUserId = user?.attributes?.sub || user?.username || user?.attributes?.email || 'anonymous';
  const messagesEndRef = useRef(null);

  // debounce searchTerm to reduce re-filtering
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm), 200);
    return () => clearTimeout(id);
  }, [searchTerm]);

  // Local fallback for joined communities persistence
  const storageKey = `pv_joined_${currentUserId}`;
  const getJoinedLocal = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const setJoinedLocal = (ids) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(new Set(ids))));
    } catch {}
  };

  const categories = ['All', 'Dogs', 'Cats', 'Birds', 'Fish', 'Exotic', 'General'];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const list = await communityService.getCommunities();
        // Try to fetch user's joined communities (ids)
        let joinedIds = [];
        try {
          if (currentUserId && currentUserId !== 'anonymous') {
            const joined = await communityService.getUserCommunities(currentUserId);
            joinedIds = Array.isArray(joined)
              ? joined.map(j => (typeof j === 'string' ? j : (j?.communityId || j?.id))).filter(Boolean)
              : [];
          }
        } catch (e) {
          // non-fatal: fallback to local storage below
        }
        // Merge with local fallback
        const localJoined = getJoinedLocal();
        if (localJoined.length) {
          joinedIds = Array.from(new Set([...(joinedIds || []), ...localJoined]));
        }
        const safeList = Array.isArray(list) ? list : [];
        const enriched = safeList.map(item => ({
          ...item,
          id: item.id ?? item.communityId ?? String(item.name || Math.random()),
          name: String(item.name || 'Community'),
          description: String(item.description || ''),
          category: item.category || 'General',
          isJoined: joinedIds.includes(item.id),
          messages: [],
          image: item.image || '🐾',
          memberCount: typeof item.memberCount === 'number' ? item.memberCount : 0,
          isActive: item.isActive !== false
        }));
        if (cancelled) return;
        setCommunities(enriched);
        if (!selectedCommunity && enriched.length > 0) {
          setSelectedCommunity(enriched[0]);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('Failed to load communities');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCommunities = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    const list = (communities || []).filter(community => {
      const name = String(community.name || '').toLowerCase();
      const desc = String(community.description || '').toLowerCase();
      const matchesSearch = !term || name.includes(term) || desc.includes(term);
      const matchesCategory = filterCategory === 'All' || community.category === filterCategory;
      return matchesSearch && matchesCategory && community.isActive;
    });
    return list;
  }, [communities, debouncedSearch, filterCategory]);

  const joinedCommunities = useMemo(() => filteredCommunities.filter(c => c.isJoined), [filteredCommunities]);
  const availableCommunities = useMemo(() => filteredCommunities.filter(c => !c.isJoined), [filteredCommunities]);

  const handleJoinCommunity = async (communityId) => {
    try {
      const updated = await communityService.joinCommunity(communityId, currentUserId);
      setCommunities(prev => prev.map(c => (c.id === communityId ? { ...c, ...updated, isJoined: true } : c)));
      setSelectedCommunity(prev => prev && prev.id === communityId ? { ...prev, ...updated, isJoined: true } : prev);
      // persist locally as fallback
      const ids = getJoinedLocal();
      ids.push(communityId);
      setJoinedLocal(ids);
    } catch (e) {
      console.error(e);
      // Fallback optimistic update if backend join endpoint not yet deployed
      setCommunities(prev => prev.map(community => 
        community.id === communityId 
          ? { ...community, isJoined: true, memberCount: (community.memberCount || 0) + 1 }
          : community
      ));
      const joined = communities.find(c => c.id === communityId);
      if (joined) {
        setSelectedCommunity({ ...joined, isJoined: true, memberCount: (joined.memberCount || 0) + 1 });
      }
      const ids = getJoinedLocal();
      ids.push(communityId);
      setJoinedLocal(ids);
    }
  };

  const handleLeaveCommunity = async (communityId) => {
    try {
      const updated = await communityService.leaveCommunity(communityId, currentUserId);
      setCommunities(prev => prev.map(c => (c.id === communityId ? { ...c, ...updated, isJoined: false } : c)));
      if (selectedCommunity && selectedCommunity.id === communityId) {
        const remainingJoined = communities.filter(c => c.isJoined && c.id !== communityId);
        setSelectedCommunity(remainingJoined.length > 0 ? remainingJoined[0] : null);
      }
      // remove from local fallback
      const ids = getJoinedLocal().filter(id => id !== communityId);
      setJoinedLocal(ids);
    } catch (e) {
      console.error(e);
      // Fallback optimistic update
      setCommunities(prev => prev.map(community => 
        community.id === communityId 
          ? { ...community, isJoined: false, memberCount: Math.max(0, (community.memberCount || 0) - 1) }
          : community
      ));
      if (selectedCommunity && selectedCommunity.id === communityId) {
        const remainingJoined = communities.filter(c => c.isJoined && c.id !== communityId);
        setSelectedCommunity(remainingJoined.length > 0 ? remainingJoined[0] : null);
      }
      const ids = getJoinedLocal().filter(id => id !== communityId);
      setJoinedLocal(ids);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedCommunity) return;
    if (!newMessage.trim() && !mediaFile) return;
    try {
      let uploaded = { mediaUrl: '', mediaType: 'none' };
      if (mediaFile) {
        setUploading(true);
        const up = await communityService.uploadMedia(selectedCommunity.id, mediaFile);
        uploaded = { mediaUrl: up.mediaUrl, mediaType };
      }
      const sent = await communityService.sendMessage(selectedCommunity.id, { text: newMessage, userId: currentUserId, ...uploaded });
      const msg = {
        id: sent.messageId || Date.now(),
        user: sent.userId === currentUserId ? 'You' : (sent.userId || 'Member'),
        userName: sent.userName,
        userId: sent.userId,
        userAvatar: (sent.userId === currentUserId ? 'YO' : (sent.userId || 'MB')).slice(0,2).toUpperCase(),
        message: sent.text || newMessage,
        time: new Date().toLocaleTimeString(),
        timestamp: new Date(sent.createdAt || Date.now()),
        mediaUrl: sent.mediaUrl || uploaded.mediaUrl,
        mediaType: sent.mediaType || uploaded.mediaType || 'none'
      };
      setCommunities(prev => prev.map(c => c.id === selectedCommunity.id ? { ...c, messages: [...(c.messages || []), msg] } : c));
      setSelectedCommunity(prev => prev ? { ...prev, messages: [...(prev.messages || []), msg] } : prev);
      setNewMessage('');
      setMediaFile(null);
      setMediaPreview('');
      setMediaType('none');
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadMedia = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video');
    const isImage = file.type.startsWith('image');
    if (isImage) {
      // Compress image in browser (downscale + WebP/JPEG)
      compressImage(file, 1280, 0.7).then(({ blob, previewUrl, type }) => {
        setMediaFile(new File([blob], file.name.replace(/\.[^.]+$/, type === 'image/webp' ? '.webp' : '.jpg'), { type }));
        setMediaType('image');
        setMediaPreview(previewUrl);
      }).catch(() => {
        // Fallback: use original file
        const url = URL.createObjectURL(file);
        setMediaFile(file);
        setMediaType('image');
        setMediaPreview(url);
      });
    } else if (isVideo) {
      // Validate video under 60 seconds, then compress
      const url = URL.createObjectURL(file);
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.src = url;
      vid.onloadedmetadata = () => {
        window.URL.revokeObjectURL(vid.src);
        const dur = vid.duration || 0;
        if (dur > 60) {
          alert('Please upload a video of 60 seconds or less.');
          e.target.value = '';
          return;
        }
        compressVideo(file)
          .then(({ blob, previewUrl, type }) => {
            setMediaFile(new File([blob], file.name.replace(/\.[^.]+$/, '.webm'), { type }));
            setMediaType('video');
            setMediaPreview(previewUrl);
          })
          .catch(() => {
            setMediaFile(file);
            setMediaType('video');
            setMediaPreview(url);
          });
      };
      vid.onerror = () => {
        setMediaFile(null);
        setMediaPreview('');
        setMediaType('none');
      };
    } else {
      alert('Unsupported file type. Please upload an image or a video.');
      e.target.value = '';
    }
  };

  // Helper: compress image using canvas (returns Blob/WebP)
  const compressImage = (file, maxSize = 1600, quality = 0.8) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const ratio = Math.min(1, maxSize / Math.max(width, height));
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      // Prefer WebP if supported
      const useWebp = canvas.toDataURL('image/webp', 0.1).indexOf('data:image/webp') === 0;
      const mime = useWebp ? 'image/webp' : 'image/jpeg';
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Compression failed')); return; }
        const previewUrl = URL.createObjectURL(blob);
        resolve({ blob, previewUrl, type: mime });
      }, mime, quality);
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });

  // Helper: compress video with ffmpeg.wasm → webm with balanced bitrate/size
  const compressVideo = async (file, { maxWidth = 480, crf = 38, audioBitrate = '64k' } = {}) => {
    try {
      setProcessing(true);
      const { createFFmpeg, fetchFile } = await import('@ffmpeg/ffmpeg');
      const ffmpeg = createFFmpeg({ log: false });
      if (!ffmpeg.isLoaded()) await ffmpeg.load();
      const inputName = 'input.mp4';
      const outputName = 'output.webm';
      ffmpeg.FS('writeFile', inputName, await fetchFile(file));
      await ffmpeg.run(
        '-i', inputName,
        '-vf', `scale='min(${maxWidth},iw)':-2`,
        '-crf', String(crf),
        '-b:v', '0',
        '-b:a', audioBitrate,
        '-c:v', 'libvpx-vp9',
        '-c:a', 'libopus',
        '-row-mt', '1',
        '-deadline', 'good',
        'output.webm'
      );
      const data = ffmpeg.FS('readFile', outputName);
      const blob = new Blob([data.buffer], { type: 'video/webm' });
      const previewUrl = URL.createObjectURL(blob);
      return { blob, previewUrl, type: 'video/webm' };
    } catch (err) {
      console.error('Video compression failed:', err);
      const previewUrl = URL.createObjectURL(file);
      return { blob: file, previewUrl, type: file.type || 'video/mp4' };
    } finally {
      setProcessing(false);
    }
  };

  // Convert API message item to UI message object
  const mapApiMessage = (m) => ({
    id: m.messageId || `${m.communityId}-${m.createdAt}`,
    user: m.userId === currentUserId ? 'You' : (m.userId || 'Member'),
    userName: m.userName,
    userId: m.userId,
    userAvatar: (m.userId === currentUserId ? 'YO' : (m.userId || 'MB')).slice(0,2).toUpperCase(),
    message: m.text || '',
    time: new Date(m.createdAt || Date.now()).toLocaleTimeString(),
    timestamp: new Date(m.createdAt || Date.now()),
    mediaUrl: m.mediaUrl,
    mediaType: m.mediaType || 'none'
  });

  // Load messages whenever a joined community is selected
  useEffect(() => {
    let cancelled = false;
    const loadMessages = async () => {
      if (!selectedCommunity || !selectedCommunity.id || !selectedCommunity.isJoined) return;
      try {
        const payload = await communityService.getCommunityMessages(selectedCommunity.id, { limit: 50 });
        const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
        let uiMessages = items.map(mapApiMessage).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        // show only last 100 to keep DOM light; older kept in memory if needed later
        if (uiMessages.length > 100) uiMessages = uiMessages.slice(-100);
        // Resolve usernames for messages missing userName (best-effort in background)
        const uniqueUserIds = Array.from(new Set(uiMessages.map(m => m.userName ? null : m.userId).filter(Boolean)));
        if (uniqueUserIds.length) {
          Promise.all(uniqueUserIds.map(async (uid) => ({ uid, name: await communityService.getUsername(uid) })))
            .then(results => {
              const nameById = new Map(results.filter(r => r.name).map(r => [r.uid, r.name]));
              if (nameById.size) {
                setCommunities(prev => prev.map(c => c.id === selectedCommunity.id ? {
                  ...c,
                  messages: (c.messages || []).map(m => m.userName || !nameById.get(m.userId) ? m : { ...m, userName: nameById.get(m.userId) })
                } : c));
                setSelectedCommunity(prev => prev ? {
                  ...prev,
                  messages: (prev.messages || []).map(m => m.userName || !nameById.get(m.userId) ? m : { ...m, userName: nameById.get(m.userId) })
                } : prev);
              }
            })
            .catch(() => {});
        }
        if (!cancelled) {
          setCommunities(prev => prev.map(c => c.id === selectedCommunity.id ? { ...c, messages: uiMessages } : c));
          setSelectedCommunity(prev => prev ? { ...prev, messages: uiMessages } : prev);
        }
      } catch (e) {
        // silently ignore
      }
    };
    loadMessages();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCommunity?.id, selectedCommunity?.isJoined]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [selectedCommunity?.messages?.length]);

  const selectCommunity = (community) => {
    setSelectedCommunity(community);
  };

  return (
    <div className="h-screen bg-white flex overflow-hidden">
        {error && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded">
            {error}
          </div>
        )}
        {/* Left Sidebar - Communities */}
        <div className="w-80 bg-gray-50 flex flex-col border-r border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="p-2 border-b border-gray-200 bg-white">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Pet Communities</h1>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Search communities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Scrollable Communities List (vertical) */}
          <div className="flex-1 overflow-y-auto">
            {/* My Communities Section */}
            <div className="p-2 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                My Communities ({joinedCommunities.length})
              </h2>
              <div className="space-y-2">
                  {joinedCommunities.map((community) => (
                    <div
                      key={community.id}
                      onClick={() => selectCommunity(community)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedCommunity?.id === community.id
                          ? 'bg-primary-100 border border-primary-200 text-primary-900'
                          : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{community.image}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{community.name}</p>
                          <p className="text-xs text-gray-500">{community.memberCount} members</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLeaveCommunity(community.id);
                          }}
                          className="text-red-500 hover:text-red-600 text-xs font-medium"
                        >
                          Leave
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Available Communities Section */}
            <div className="p-2">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Available Communities ({availableCommunities.length})
              </h2>
              <div className="space-y-2">
                  {availableCommunities.map((community) => (
                  <div
                      key={community.id}
                      onClick={() => selectCommunity(community)}
                      className="p-3 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{community.image}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{community.name}</p>
                          <p className="text-xs text-gray-500">{community.memberCount} members</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedCommunity ? (
            <>
              {/* Header */}
              <div className="bg-white border-b border-gray-200 p-2 flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{selectedCommunity.image}</span>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{selectedCommunity.name}</h2>
                    <p className="text-sm text-gray-500">{selectedCommunity.memberCount} members</p>
                  </div>
                </div>
              </div>

              {selectedCommunity.isJoined ? (
                <>
                  {/* Messages - Fixed height, no scroll */}
                  <div className="flex-1 bg-gray-50 p-2 space-y-2 overflow-hidden">
                    <div ref={messagesEndRef} className="h-full overflow-y-auto space-y-2">
                      {(selectedCommunity.messages || []).map((m) => {
                        const isMe = m.userId === currentUserId || m.user === 'You';
                        const displayName = isMe ? 'You' : (m.userName || m.user || 'Member');
                        return (
                          <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] ${isMe ? 'text-right' : 'text-left'}`}>
                              <div className="flex items-center mb-1 gap-2">
                                {!isMe && (
                                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    {m.userAvatar}
                                  </div>
                                )}
                                <span className="text-xs text-gray-500">{displayName} • {m.time}</span>
                              </div>
                              <div className={`rounded-2xl px-4 py-2 border ${isMe ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-900 border-gray-200'}`}>
                                {m.mediaUrl && m.mediaType === 'image' && (
                                  <img src={m.mediaUrl} alt="upload" className="rounded-lg mb-2 max-h-64 object-contain" />
                                )}
                                {m.mediaUrl && m.mediaType === 'video' && (
                                  <video controls className="rounded-lg mb-2 max-h-64"> 
                                    <source src={m.mediaUrl} />
                                  </video>
                                )}
                                {m.message && <div className="whitespace-pre-wrap break-words">{m.message}</div>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="bg-white border-t border-gray-200 p-2 flex-shrink-0">
                    <div className="flex space-x-3 items-center">
                      {mediaPreview && (
                        <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2">
                          {mediaType === 'image' ? (
                            <img src={mediaPreview} alt="preview" className="h-10 w-10 object-cover rounded" />
                          ) : (
                            <span className="text-xs text-gray-600">Video attached</span>
                          )}
                          <button onClick={() => { setMediaFile(null); setMediaPreview(''); setMediaType('none'); }} className="text-xs text-red-600 hover:text-red-700">Remove</button>
                        </div>
                      )}
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                        placeholder={`Message #${selectedCommunity.name}`}
                        className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      <label className="px-2 py-1 border border-gray-300 rounded-lg text-gray-700 cursor-pointer hover:bg-gray-50 text-sm">
                        {processing ? 'Processing...' : uploading ? 'Uploading...' : 'Upload'}
                        <input type="file" accept="image/*,video/*" className="hidden" onChange={handleUploadMedia} disabled={uploading} />
                      </label>
                      <button
                        onClick={handleSendMessage}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 bg-gray-50 p-6 flex items-center justify-center">
                  <div className="max-w-xl w-full bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center mb-4">
                      <span className="text-3xl mr-3">{selectedCommunity.image}</span>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{selectedCommunity.name}</h3>
                        <p className="text-sm text-gray-500">{selectedCommunity.memberCount} members</p>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-6">{selectedCommunity.description || 'Join this community to start chatting with members.'}</p>
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleJoinCommunity(selectedCommunity.id)}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-lg font-medium"
                      >
                        Join Community
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* No Community Selected */
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="text-6xl mb-4">🏘️</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Pet Communities</h2>
                <p className="text-gray-600 mb-6">{loading ? 'Loading communities...' : 'Select a community from the sidebar to start chatting'}</p>
                <div className="text-sm text-gray-500">
                  <p>• Join communities to connect with fellow pet owners</p>
                  <p>• Share experiences and get expert advice</p>
                  <p>• Chat in real-time with community members</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  );
};

export default Community;
