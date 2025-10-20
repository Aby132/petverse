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
  const [modWarning, setModWarning] = useState('');
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

  // Perspective API moderation
  const PERSPECTIVE_API_KEY = 'AIzaSyBn-Ohv5CRYEiIwslcFiwI_o6oN-qMxYiY';
  const PERSPECTIVE_API_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

  const moderateText = async (text) => {
    if (!text || !text.trim()) return '';
    
    try {
      // Check if API key is available
      if (!PERSPECTIVE_API_KEY || PERSPECTIVE_API_KEY === 'YOUR_API_KEY') {
        console.warn('Perspective API key not configured, skipping text moderation');
        return ''; // Allow text if API key not configured
      }

      const response = await fetch(`${PERSPECTIVE_API_URL}?key=${PERSPECTIVE_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: {
            text: text
          },
          requestedAttributes: {
            TOXICITY: {},
            SEVERE_TOXICITY: {},
            IDENTITY_ATTACK: {},
            INSULT: {},
            PROFANITY: {},
            THREAT: {},
            SPAM: {}
          },
          languages: ['en']
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Perspective API error:', response.status, errorText);
        return ''; // Fallback: allow message if API fails
      }

      const data = await response.json();
      const scores = data.attributeScores || {};

      // Check for violations with thresholds
      const violations = [];
      
      if (scores.TOXICITY?.summaryScore?.value > 0.7) {
        violations.push('toxic content');
      }
      if (scores.SEVERE_TOXICITY?.summaryScore?.value > 0.5) {
        violations.push('severely toxic content');
      }
      if (scores.IDENTITY_ATTACK?.summaryScore?.value > 0.6) {
        violations.push('identity-based attacks');
      }
      if (scores.INSULT?.summaryScore?.value > 0.7) {
        violations.push('insulting language');
      }
      if (scores.PROFANITY?.summaryScore?.value > 0.6) {
        violations.push('profanity');
      }
      if (scores.THREAT?.summaryScore?.value > 0.6) {
        violations.push('threatening language');
      }
      if (scores.SPAM?.summaryScore?.value > 0.7) {
        violations.push('spam content');
      }

      if (violations.length > 0) {
        return `Please avoid ${violations.join(', ')}. Your message contains inappropriate content.`;
      }

      return '';
    } catch (error) {
      console.error('Moderation API error:', error);
      return ''; // Fallback: allow message if API fails
    }
  };

  // Sightengine API configuration
  const SIGHTENGINE_API_USER = '1203424303';
  const SIGHTENGINE_API_SECRET = 'dGSCi43vWvrkrLFk4tXEZ62SFJ4Gc9Cp';
  const SIGHTENGINE_API_URL = 'https://api.sightengine.com/1.0/check.json';
  
  // Models to check for content moderation
  const SIGHTENGINE_MODELS = [
    'nudity-2.1',
    'weapon',
    'alcohol',
    'recreational_drug',
    'medical',
    'offensive-2.0',
    'faces',
    'scam',
    'text-content',
    'face-attributes',
    'gore-2.0',
    'qr-content',
    'tobacco',
    'violence',
    'self-harm'
  ].join(',');

  // Content moderation for images and videos using Sightengine API
  const moderateMediaWithSightengine = async (mediaFile) => {
    try {
      // Create FormData for the API request
      const formData = new FormData();
      formData.append('media', mediaFile);
      formData.append('models', SIGHTENGINE_MODELS);
      formData.append('api_user', SIGHTENGINE_API_USER);
      formData.append('api_secret', SIGHTENGINE_API_SECRET);

      const response = await fetch(SIGHTENGINE_API_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Sightengine API error:', response.status, errorText);
        return ''; // Fallback: allow media if API fails
      }

      const data = await response.json();
      console.log('Sightengine response:', data);

      // Check for violations based on actual API response structure
      const violations = [];

      // Check nudity (multiple categories)
      if (data.nudity) {
        if (data.nudity.sexual_activity > 0.7) violations.push('sexual activity');
        if (data.nudity.sexual_display > 0.7) violations.push('sexual display');
        if (data.nudity.erotica > 0.7) violations.push('erotic content');
        if (data.nudity.very_suggestive > 0.7) violations.push('very suggestive content');
        if (data.nudity.suggestive > 0.7) violations.push('suggestive content');
        if (data.nudity.mildly_suggestive > 0.7) violations.push('mildly suggestive content');
      }

      // Check weapons (detailed categories)
      if (data.weapon) {
        const weaponClasses = data.weapon.classes || {};
        if (weaponClasses.firearm > 0.7) violations.push('firearms');
        if (weaponClasses.firearm_gesture > 0.7) violations.push('firearm gestures');
        if (weaponClasses.firearm_toy > 0.7) violations.push('toy firearms');
        if (weaponClasses.knife > 0.7) violations.push('knives');
      }

      // Check alcohol
      if (data.alcohol?.prob > 0.7) {
        violations.push('alcohol');
      }

      // Check recreational drugs
      if (data.recreational_drug?.prob > 0.7) {
        const drugClasses = data.recreational_drug.classes || {};
        if (drugClasses.cannabis > 0.7) violations.push('cannabis');
        if (drugClasses.cannabis_plant > 0.7) violations.push('cannabis plants');
        if (drugClasses.cannabis_drug > 0.7) violations.push('cannabis drugs');
        if (drugClasses.recreational_drugs_not_cannabis > 0.7) violations.push('other recreational drugs');
      }

      // Check medical content
      if (data.medical?.prob > 0.7) {
        const medicalClasses = data.medical.classes || {};
        if (medicalClasses.pills > 0.7) violations.push('pills/medication');
        if (medicalClasses.paraphernalia > 0.7) violations.push('medical paraphernalia');
      }

      // Check offensive content (hate symbols, gestures)
      if (data.offensive) {
        if (data.offensive.nazi > 0.7) violations.push('Nazi symbols');
        if (data.offensive.asian_swastika > 0.7) violations.push('Asian swastika');
        if (data.offensive.confederate > 0.7) violations.push('Confederate symbols');
        if (data.offensive.supremacist > 0.7) violations.push('supremacist symbols');
        if (data.offensive.terrorist > 0.7) violations.push('terrorist symbols');
        if (data.offensive.middle_finger > 0.7) violations.push('offensive gestures');
      }

      // Check gore/violence
      if (data.gore?.prob > 0.7) {
        const goreClasses = data.gore.classes || {};
        if (goreClasses.very_bloody > 0.7) violations.push('very bloody content');
        if (goreClasses.slightly_bloody > 0.7) violations.push('bloody content');
        if (goreClasses.body_organ > 0.7) violations.push('body organs');
        if (goreClasses.serious_injury > 0.7) violations.push('serious injuries');
        if (goreClasses.superficial_injury > 0.7) violations.push('injuries');
        if (goreClasses.corpse > 0.7) violations.push('corpses');
        if (goreClasses.skull > 0.7) violations.push('skulls');
        if (goreClasses.unconscious > 0.7) violations.push('unconscious people');
        if (goreClasses.body_waste > 0.7) violations.push('body waste');
      }

      // Check tobacco
      if (data.tobacco?.prob > 0.7) {
        const tobaccoClasses = data.tobacco.classes || {};
        if (tobaccoClasses.regular_tobacco > 0.7) violations.push('tobacco products');
        if (tobaccoClasses.ambiguous_tobacco > 0.7) violations.push('tobacco-related content');
      }

      // Check violence
      if (data.violence?.prob > 0.7) {
        const violenceClasses = data.violence.classes || {};
        if (violenceClasses.physical_violence > 0.7) violations.push('physical violence');
        if (violenceClasses.firearm_threat > 0.7) violations.push('firearm threats');
        if (violenceClasses.combat_sport > 0.7) violations.push('combat sports');
      }

      // Check self-harm
      if (data.self_harm?.prob > 0.7) {
        violations.push('self-harm content');
      }

      // Check scam content
      if (data.scam?.prob > 0.7) {
        violations.push('scam content');
      }

      // Check text content for inappropriate text
      if (data.text) {
        const textViolations = [];
        if (data.text.profanity?.length > 0) textViolations.push('profanity');
        if (data.text.personal?.length > 0) textViolations.push('personal information');
        if (data.text.link?.length > 0) textViolations.push('suspicious links');
        if (data.text.social?.length > 0) textViolations.push('social media content');
        if (data.text.extremism?.length > 0) textViolations.push('extremist content');
        if (data.text.medical?.length > 0) textViolations.push('medical claims');
        if (data.text.drug?.length > 0) textViolations.push('drug-related text');
        if (data.text.weapon?.length > 0) textViolations.push('weapon-related text');
        if (data.text.violence?.length > 0) textViolations.push('violent text');
        if (data.text.self_harm?.length > 0) textViolations.push('self-harm text');
        if (data.text.spam?.length > 0) textViolations.push('spam text');
        if (textViolations.length > 0) {
          violations.push(`inappropriate text (${textViolations.join(', ')})`);
        }
      }

      // Check QR codes for inappropriate content
      if (data.qr) {
        const qrViolations = [];
        if (data.qr.personal?.length > 0) qrViolations.push('personal information');
        if (data.qr.link?.length > 0) qrViolations.push('suspicious links');
        if (data.qr.social?.length > 0) qrViolations.push('social media');
        if (data.qr.spam?.length > 0) qrViolations.push('spam');
        if (data.qr.profanity?.length > 0) qrViolations.push('profanity');
        if (data.qr.blacklist?.length > 0) qrViolations.push('blacklisted content');
        if (qrViolations.length > 0) {
          violations.push(`inappropriate QR codes (${qrViolations.join(', ')})`);
        }
      }

      if (violations.length > 0) {
        return `This ${mediaFile.type.startsWith('video') ? 'video' : 'image'} contains inappropriate content: ${violations.join(', ')}. Please upload different content.`;
      }

      return '';
    } catch (error) {
      console.error('Sightengine moderation error:', error);
      return ''; // Fallback: allow media if API fails
    }
  };


  useEffect(() => {
    // Clear moderation warning when user edits message
    if (modWarning) {
      setModWarning('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newMessage]);

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

    setProcessing(true);

    try {
      // Run Perspective API moderation on text
      if (newMessage.trim()) {
        const violation = await moderateText(newMessage);
        if (violation) {
          setModWarning(violation);
          setProcessing(false);
          return;
        }
      }

      // Run content moderation on images and videos using Sightengine API
      if (mediaFile && (mediaType === 'image' || mediaType === 'video')) {
        const mediaViolation = await moderateMediaWithSightengine(mediaFile);
        if (mediaViolation) {
          setModWarning(mediaViolation);
          setProcessing(false);
          return;
        }
      }

      let uploaded = { mediaUrl: '', mediaType: 'none' };
      if (mediaFile) {
        setUploading(true);
        const up = await communityService.uploadMedia(selectedCommunity.id, mediaFile);
        uploaded = { mediaUrl: up.mediaUrl, mediaType };
      }
      const sent = await communityService.sendMessage(selectedCommunity.id, { text: newMessage, userId: currentUserId, ...uploaded });
      const msg = {
        id: sent.messageId || Date.now(),
        user: 'You',
        userName: sent.userName,
        userId: sent.userId,
        userAvatar: 'YO',
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
      setModWarning('');
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
      setProcessing(false);
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
    user: m.userId === currentUserId ? 'You' : 'Member',
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
                  messages: (c.messages || []).map(m => m.userName || !nameById.get(m.userId) ? m : { ...m, userName: nameById.get(m.userId), user: m.userId === currentUserId ? 'You' : nameById.get(m.userId) })
                } : c));
                setSelectedCommunity(prev => prev ? {
                  ...prev,
                  messages: (prev.messages || []).map(m => m.userName || !nameById.get(m.userId) ? m : { ...m, userName: nameById.get(m.userId), user: m.userId === currentUserId ? 'You' : nameById.get(m.userId) })
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
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col lg:flex-row overflow-hidden">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm">
            {error}
          </div>
        )}
        
        {/* Left Sidebar - Communities */}
        <div className="w-full lg:w-80 xl:w-96 bg-white/80 backdrop-blur-md flex flex-col border-r-0 lg:border-r border-gray-200/50 shadow-xl lg:shadow-2xl">
          {/* Header */}
          <div className="p-4 lg:p-6 border-b border-gray-200/50 bg-white/90 backdrop-blur-sm sticky top-0 z-10">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Pet Communities
            </h1>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search communities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 border border-gray-200 text-gray-900 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-500 shadow-sm"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  🔍
                </div>
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-3 bg-white/80 border border-gray-200 text-gray-900 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Scrollable Communities List */}
          <div className="flex-1 overflow-y-auto">
            {/* My Communities Section */}
            <div className="p-4 lg:p-6 border-b border-gray-200/50">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                My Communities ({joinedCommunities.length})
              </h2>
              <div className="space-y-3">
                  {joinedCommunities.map((community) => (
                    <div
                      key={community.id}
                      onClick={() => selectCommunity(community)}
                      className={`p-3 lg:p-4 rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-[1.02] ${
                        selectedCommunity?.id === community.id
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg border-2 border-blue-300'
                          : 'bg-white/60 border border-gray-200 hover:bg-white hover:shadow-md text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3 lg:space-x-4">
                        <div className={`text-2xl lg:text-3xl p-2 rounded-lg ${
                          selectedCommunity?.id === community.id ? 'bg-white/20' : 'bg-gray-100'
                        }`}>
                          {community.image}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-base lg:text-lg">{community.name}</p>
                          <p className={`text-xs lg:text-sm ${
                            selectedCommunity?.id === community.id ? 'text-white/80' : 'text-gray-500'
                          }`}>
                            {community.memberCount} members
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLeaveCommunity(community.id);
                          }}
                          className={`text-xs font-medium px-2 lg:px-3 py-1 rounded-lg transition-colors ${
                            selectedCommunity?.id === community.id 
                              ? 'text-white/80 hover:text-white hover:bg-white/20' 
                              : 'text-red-500 hover:text-red-600 hover:bg-red-50'
                          }`}
                        >
                          Leave
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Available Communities Section */}
            <div className="p-4 lg:p-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Available Communities ({availableCommunities.length})
              </h2>
              <div className="space-y-3">
                  {availableCommunities.map((community) => (
                  <div
                      key={community.id}
                      className="p-3 lg:p-4 rounded-xl bg-white/60 border border-gray-200 text-gray-700 hover:bg-white hover:shadow-md transition-all duration-200 transform hover:scale-[1.02]"
                    >
                      <div className="flex items-center space-x-3 lg:space-x-4">
                        <div className="text-2xl lg:text-3xl p-2 rounded-lg bg-gray-100">
                          {community.image}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-base lg:text-lg">{community.name}</p>
                          <p className="text-xs lg:text-sm text-gray-500">{community.memberCount} members</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => selectCommunity(community)}
                            className="text-xs text-gray-600 hover:text-gray-800 px-2 lg:px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleJoinCommunity(community.id); }}
                            className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-3 lg:px-4 py-1 lg:py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            Join
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Chat Area */}
        <div className="flex-1 flex flex-col bg-white/90 backdrop-blur-sm min-h-0">
          {selectedCommunity ? (
            <>
              {/* Header */}
              <div className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 p-4 lg:p-6 flex-shrink-0 shadow-sm">
                <div className="flex items-center space-x-3 lg:space-x-4">
                  <div className="text-3xl lg:text-4xl p-2 lg:p-3 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100">
                    {selectedCommunity.image}
                  </div>
                  <div>
                    <h2 className="text-lg lg:text-2xl font-bold text-gray-900">{selectedCommunity.name}</h2>
                    <p className="text-xs lg:text-sm text-gray-600 flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      {selectedCommunity.memberCount} members online
                    </p>
                  </div>
                </div>
              </div>

              {selectedCommunity.isJoined ? (
                <>
                  {/* Messages container */}
                  <div className="flex-1 bg-gradient-to-b from-gray-50/50 to-blue-50/30 p-3 lg:p-6 overflow-hidden">
                    <div ref={messagesEndRef} className="h-full overflow-y-auto space-y-3 lg:space-y-4 pr-1 lg:pr-2">
                      {(selectedCommunity.messages || []).map((m) => {
                        const isMe = m.userId === currentUserId || m.user === 'You';
                        const displayName = isMe ? 'You' : (m.userName || 'Member');
                        return (
                          <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] lg:max-w-[75%] ${isMe ? 'text-right' : 'text-left'}`}>
                              <div className="flex items-center mb-2 gap-2 lg:gap-3">
                                {!isMe && (
                                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs lg:text-sm font-bold shadow-md">
                                    {m.userAvatar}
                                  </div>
                                )}
                                <span className="text-xs text-gray-500 font-medium">{displayName} • {m.time}</span>
                                {isMe && (
                                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs lg:text-sm font-bold shadow-md">
                                    {m.userAvatar}
                                  </div>
                                )}
                              </div>
                              <div className={`rounded-2xl px-4 lg:px-6 py-2 lg:py-3 shadow-md ${
                                isMe 
                                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                                  : 'bg-white text-gray-900 border border-gray-200'
                              }`}>
                                {m.mediaUrl && m.mediaType === 'image' && (
                                  <img src={m.mediaUrl} alt="upload" className="rounded-xl mb-2 lg:mb-3 max-h-60 lg:max-h-80 object-contain shadow-sm" />
                                )}
                                {m.mediaUrl && m.mediaType === 'video' && (
                                  <video controls className="rounded-xl mb-2 lg:mb-3 max-h-60 lg:max-h-80 shadow-sm"> 
                                    <source src={m.mediaUrl} />
                                  </video>
                                )}
                                {m.message && <div className="whitespace-pre-wrap break-words leading-relaxed text-sm lg:text-base">{m.message}</div>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="bg-white/95 backdrop-blur-md border-t border-gray-200/50 p-3 lg:p-6 flex-shrink-0 shadow-lg">
                    <div className="flex flex-col gap-3 lg:gap-4">
                      {modWarning && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-lg">
                          {modWarning}
                        </div>
                      )}
                      <div className="flex flex-col lg:flex-row space-y-3 lg:space-y-0 lg:space-x-4 items-end">
                        {mediaPreview && (
                          <div className="flex items-center gap-3 bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                            {mediaType === 'image' ? (
                              <img src={mediaPreview} alt="preview" className="h-10 w-10 lg:h-12 lg:w-12 object-cover rounded-lg" />
                            ) : (
                              <div className="h-10 w-10 lg:h-12 lg:w-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                <span className="text-xs text-gray-600">📹</span>
                              </div>
                            )}
                            <button 
                              onClick={() => { setMediaFile(null); setMediaPreview(''); setMediaType('none'); }} 
                              className="text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        <div className="flex-1 relative w-full">
                          <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !processing && !uploading) handleSendMessage(); }}
                            placeholder={`Message #${selectedCommunity.name}`}
                            disabled={processing || uploading}
                            className="w-full px-4 lg:px-6 py-3 lg:py-4 bg-white border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed shadow-sm text-sm lg:text-base placeholder-gray-500"
                          />
                        </div>
                        <div className="flex space-x-2 lg:space-x-4 w-full lg:w-auto">
                          <label className="flex-1 lg:flex-none px-4 lg:px-6 py-3 lg:py-4 border border-gray-200 rounded-xl text-gray-700 cursor-pointer hover:bg-gray-50 text-xs lg:text-sm font-medium transition-colors shadow-sm">
                            {processing ? 'Checking...' : uploading ? 'Uploading...' : '📎 Media'}
                            <input type="file" accept="image/*,video/*" className="hidden" onChange={handleUploadMedia} disabled={uploading || processing} />
                          </label>
                          <button
                            onClick={handleSendMessage}
                            disabled={processing || uploading}
                            className="flex-1 lg:flex-none bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-6 lg:px-8 py-3 lg:py-4 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg text-sm lg:text-base"
                          >
                            {processing ? 'Checking...' : 'Send'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 lg:p-8 flex items-center justify-center">
                  <div className="max-w-2xl w-full bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 lg:p-8 shadow-xl">
                    <div className="flex flex-col lg:flex-row items-center lg:items-start mb-6 lg:mb-8">
                      <div className="text-4xl lg:text-5xl mb-4 lg:mb-0 lg:mr-4 p-3 lg:p-4 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100">
                        {selectedCommunity.image}
                      </div>
                      <div className="text-center lg:text-left">
                        <h3 className="text-xl lg:text-2xl font-bold text-gray-900">{selectedCommunity.name}</h3>
                        <p className="text-sm lg:text-base text-gray-600 flex items-center justify-center lg:justify-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          {selectedCommunity.memberCount} members
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-6 lg:mb-8 text-base lg:text-lg leading-relaxed text-center lg:text-left">
                      {selectedCommunity.description || 'Join this community to start chatting with members and share your pet experiences.'}
                    </p>
                    <div className="flex justify-center">
                      <button
                        onClick={() => handleJoinCommunity(selectedCommunity.id)}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 lg:px-8 py-3 lg:py-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl text-base lg:text-lg"
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
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50/30">
              <div className="text-center max-w-2xl mx-auto px-4 lg:px-8">
                <div className="text-6xl lg:text-8xl mb-6 lg:mb-8">🏘️</div>
                <h2 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Welcome to Pet Communities
                </h2>
                <p className="text-lg lg:text-xl text-gray-600 mb-6 lg:mb-8 leading-relaxed">
                  {loading ? 'Loading communities...' : 'Select a community from the sidebar to start chatting with fellow pet lovers'}
                </p>
                <div className="text-base lg:text-lg text-gray-500 space-y-3">
                  <div className="flex items-center justify-center space-x-3">
                    <span className="text-xl lg:text-2xl">🐕</span>
                    <p>Join communities to connect with fellow pet owners</p>
                  </div>
                  <div className="flex items-center justify-center space-x-3">
                    <span className="text-xl lg:text-2xl">💬</span>
                    <p>Share experiences and get expert advice</p>
                  </div>
                  <div className="flex items-center justify-center space-x-3">
                    <span className="text-xl lg:text-2xl">⚡</span>
                    <p>Chat in real-time with community members</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  );
};

export default Community;
