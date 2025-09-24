import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import communityService from '../../services/communityService';

const AdminCommunity = () => {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  const [newCommunity, setNewCommunity] = useState({
    name: '',
    description: '',
    category: 'Dogs',
    image: '🐕'
  });

  const categories = ['All', 'Dogs', 'Cats', 'Birds', 'Fish', 'Exotic', 'General'];

  const filteredCommunities = communities.filter(community => {
    const matchesSearch = community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         community.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || community.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateCommunity = async () => {
    if (!newCommunity.name || !newCommunity.description) return;
    try {
      setLoading(true);
      setError('');
      const created = await communityService.createCommunity(newCommunity);
      setCommunities(prev => [created, ...prev]);
      setNewCommunity({ name: '', description: '', category: 'Dogs', image: '🐕' });
      setShowCreateModal(false);
    } catch (e) {
      console.error(e);
      setError('Failed to create community');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCommunity = (community) => {
    setEditingCommunity(community);
    setNewCommunity({
      name: community.name,
      description: community.description,
      category: community.category,
      image: community.image
    });
    setShowCreateModal(true);
  };

  const handleUpdateCommunity = async () => {
    if (!newCommunity.name || !newCommunity.description || !editingCommunity) return;
    try {
      setLoading(true);
      setError('');
      const updated = await communityService.updateCommunity(editingCommunity.id, newCommunity);
      setCommunities(prev => prev.map(c => (c.id === editingCommunity.id ? updated : c)));
      setEditingCommunity(null);
      setNewCommunity({ name: '', description: '', category: 'Dogs', image: '🐕' });
      setShowCreateModal(false);
    } catch (e) {
      console.error(e);
      setError('Failed to update community');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCommunity = async (id) => {
    if (!window.confirm('Are you sure you want to delete this community?')) return;
    try {
      setLoading(true);
      setError('');
      await communityService.deleteCommunity(id);
      setCommunities(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error(e);
      setError('Failed to delete community');
    } finally {
      setLoading(false);
    }
  };

  const toggleCommunityStatus = async (id) => {
    try {
      const target = communities.find(c => c.id === id);
      if (!target) return;
      const updated = await communityService.toggleCommunityStatus(id, !target.isActive);
      setCommunities(prev => prev.map(c => (c.id === id ? updated : c)));
    } catch (e) {
      console.error(e);
      setError('Failed to toggle status');
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const list = await communityService.getCommunities();
        // Ensure array
        setCommunities(Array.isArray(list) ? list.sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||'')) : []);
      } catch (e) {
        console.error(e);
        setError('Failed to load communities');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getEmojiOptions = () => {
    return ['🐕', '🐱', '🐰', '🐹', '🐦', '🐠', '🦎', '🐢', '🐍', '🐸', '🦜', '🐀', '🐿️', '🦔', '🐾'];
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Management</h1>
          <p className="text-gray-600 mt-1">Create and manage pet communities for your users</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="mt-4 sm:mt-0 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
        >
          <span className="mr-2">+</span>
          Create Community
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="bg-primary-100 p-3 rounded-lg">
              <span className="text-2xl">🏘️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Communities</p>
              <p className="text-2xl font-bold text-gray-900">{communities.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Communities</p>
              <p className="text-2xl font-bold text-gray-900">{communities.filter(c => c.isActive).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">{communities.reduce((sum, c) => sum + c.memberCount, 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Members</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(communities.reduce((sum, c) => sum + c.memberCount, 0) / communities.length) || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search communities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Communities List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Communities ({filteredCommunities.length})</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {filteredCommunities.map((community) => (
            <div key={community.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">{community.image}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900">{community.name}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        community.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {community.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1">{community.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>Category: {community.category}</span>
                      <span>Members: {community.memberCount}</span>
                      <span>Created: {community.createdAt}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleCommunityStatus(community.id)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      community.isActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {community.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleEditCommunity(community)}
                    className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCommunity(community.id)}
                    className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingCommunity ? 'Edit Community' : 'Create New Community'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Community Name</label>
                <input
                  type="text"
                  value={newCommunity.name}
                  onChange={(e) => setNewCommunity({...newCommunity, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter community name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newCommunity.description}
                  onChange={(e) => setNewCommunity({...newCommunity, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows="3"
                  placeholder="Enter community description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newCommunity.category}
                  onChange={(e) => setNewCommunity({...newCommunity, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {categories.filter(cat => cat !== 'All').map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {getEmojiOptions().map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setNewCommunity({...newCommunity, image: emoji})}
                      className={`p-2 text-2xl rounded-lg border-2 transition-colors ${
                        newCommunity.image === emoji 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingCommunity(null);
                  setNewCommunity({ name: '', description: '', category: 'Dogs', image: '🐕' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingCommunity ? handleUpdateCommunity : handleCreateCommunity}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
              >
                {editingCommunity ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
};

export default AdminCommunity;
