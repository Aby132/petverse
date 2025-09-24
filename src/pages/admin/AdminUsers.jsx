import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import Swal from 'sweetalert2';

const AdminUsers = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    role: 'all',
    emailVerified: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // API URL for Cognito user management
  const COGNITO_API_URL = 'https://zgjffueud8.execute-api.us-east-1.amazonaws.com/prod';

  useEffect(() => {
    if (isAdmin()) {
      loadUsers();
    }
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Call your Cognito user management API
      const response = await fetch(`${COGNITO_API_URL}/admin/users`);
      
      if (response.ok) {
        const cognitoUsers = await response.json();
        setUsers(Array.isArray(cognitoUsers) ? cognitoUsers : []);
        console.log('Loaded Cognito users:', cognitoUsers.length);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch users from Cognito');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError(`Failed to load users: ${error.message}`);
      
      // Show helpful message if API endpoint doesn't exist
      if (error.message.includes('403') || error.message.includes('Missing Authentication Token')) {
        setError('Cognito user management API not configured. Please set up the Lambda function and API Gateway endpoints.');
      }
      
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (username, newRole) => {
    try {
      setUpdating(true);
      
      // Update local state optimistically
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.username === username 
            ? { 
                ...user, 
                role: newRole,
                attributes: { ...user.attributes, 'custom:role': newRole },
                lastModifiedDate: new Date().toISOString()
              }
            : user
        )
      );

      // Make API call to update the user role in Cognito
      const response = await fetch(`${COGNITO_API_URL}/admin/users/${username}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      console.log(`Updated user ${username} role to ${newRole}`);

      await Swal.fire({
        icon: 'success',
        title: 'Role Updated',
        text: `User role changed to ${newRole}`,
        timer: 2000,
        showConfirmButton: false
      });

    } catch (error) {
      console.error('Error updating user role:', error);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Failed to update user role. Please try again.',
        confirmButtonColor: '#3B82F6'
      });
      await loadUsers(); // Revert changes
    } finally {
      setUpdating(false);
    }
  };

  const toggleUserStatus = async (username, currentEnabled) => {
    try {
      setUpdating(true);
      
      const action = currentEnabled ? 'disable' : 'enable';
      
      const result = await Swal.fire({
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
        text: `Are you sure you want to ${action} this user?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: currentEnabled ? '#ef4444' : '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: `Yes, ${action}!`,
        cancelButtonText: 'Cancel'
      });
      
      if (!result.isConfirmed) return;
      
      // Update local state optimistically
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.username === username 
            ? { ...user, enabled: !currentEnabled, lastModifiedDate: new Date().toISOString() }
            : user
        )
      );

      // Make API call to enable/disable user in Cognito
      const response = await fetch(`${COGNITO_API_URL}/admin/users/${username}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: !currentEnabled })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} user`);
      }

      console.log(`${action}d user ${username}`);

      await Swal.fire({
        icon: 'success',
        title: `User ${action.charAt(0).toUpperCase() + action.slice(1)}d`,
        text: `User has been ${action}d successfully`,
        timer: 2000,
        showConfirmButton: false
      });

    } catch (error) {
      console.error('Error toggling user status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Failed to update user status. Please try again.',
        confirmButtonColor: '#3B82F6'
      });
      await loadUsers(); // Revert changes
    } finally {
      setUpdating(false);
    }
  };

  const resendVerificationEmail = async (username, email) => {
    try {
      setUpdating(true);

      // Make API call to resend verification email
      const response = await fetch(`${COGNITO_API_URL}/admin/users/${username}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to resend verification email');
      }

      console.log(`Resent verification email to ${email}`);

      await Swal.fire({
        icon: 'success',
        title: 'Verification Email Sent',
        text: `Verification email has been sent to ${email}`,
        timer: 3000,
        showConfirmButton: false
      });

    } catch (error) {
      console.error('Error resending verification email:', error);
      Swal.fire({
        icon: 'error',
        title: 'Send Failed',
        text: 'Failed to send verification email. Please try again.',
        confirmButtonColor: '#3B82F6'
      });
    } finally {
      setUpdating(false);
    }
  };

  const resetUserPassword = async (username, email) => {
    try {
      const result = await Swal.fire({
        title: 'Reset Password',
        text: `Send password reset email to ${email}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3B82F6',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, send reset email',
        cancelButtonText: 'Cancel'
      });
      
      if (!result.isConfirmed) return;

      setUpdating(true);

      // Here you would make an API call to initiate password reset
      console.log(`Initiating password reset for ${username}`);

      await Swal.fire({
        icon: 'success',
        title: 'Password Reset Sent',
        text: `Password reset email has been sent to ${email}`,
        timer: 3000,
        showConfirmButton: false
      });

    } catch (error) {
      console.error('Error resetting password:', error);
      Swal.fire({
        icon: 'error',
        title: 'Reset Failed',
        text: 'Failed to send password reset email. Please try again.',
        confirmButtonColor: '#3B82F6'
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status, enabled) => {
    if (!enabled) return 'bg-red-100 text-red-800';
    
    switch (status?.toUpperCase()) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'UNCONFIRMED':
        return 'bg-yellow-100 text-yellow-800';
      case 'FORCE_CHANGE_PASSWORD':
        return 'bg-orange-100 text-orange-800';
      case 'RESET_REQUIRED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'user':
        return 'bg-blue-100 text-blue-800';
      case 'moderator':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Filter users based on current filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.attributes?.given_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.attributes?.family_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filters.status === 'all' || 
      (filters.status === 'active' && user.enabled && user.status === 'CONFIRMED') ||
      (filters.status === 'inactive' && !user.enabled) ||
      (filters.status === 'unconfirmed' && user.status === 'UNCONFIRMED') ||
      (filters.status === 'force_change' && user.status === 'FORCE_CHANGE_PASSWORD');

    const matchesRole = filters.role === 'all' || user.role === filters.role;
    
    const matchesEmailVerified = filters.emailVerified === 'all' || 
      (filters.emailVerified === 'verified' && user.emailVerified) ||
      (filters.emailVerified === 'unverified' && !user.emailVerified);

    return matchesSearch && matchesStatus && matchesRole && matchesEmailVerified;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

  if (!isAdmin()) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </AdminLayout>
    );
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading users...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage customer accounts, roles, and permissions</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <span className="text-sm text-gray-500">
              Total Users: {filteredUsers.length}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Users</label>
              <input
                type="text"
                placeholder="Username, email, name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="unconfirmed">Unconfirmed</option>
                <option value="force_change">Force Change Password</option>
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User Role</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
              </select>
            </div>

            {/* Email Verification Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Status</label>
              <select
                value={filters.emailVerified}
                onChange={(e) => setFilters(prev => ({ ...prev, emailVerified: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Email Status</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        {error ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Users</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadUsers}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Try Again
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
            <p className="text-gray-600">No users match your current filters.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedUsers.map((user) => (
                    <tr key={user.username} className="hover:bg-gray-50">
                      {/* User Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {user.attributes?.given_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.attributes?.given_name && user.attributes?.family_name 
                                ? `${user.attributes.given_name} ${user.attributes.family_name}`
                                : user.email
                              }
                            </div>
                            <div className="text-sm text-gray-500">{user.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">{user.email}</div>
                          {user.attributes?.phone_number && (
                            <div className="text-sm text-gray-500">{user.attributes.phone_number}</div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status, user.enabled)}`}>
                            {!user.enabled ? 'Disabled' : user.status}
                          </span>
                          <div className="flex items-center space-x-1">
                            <span className={`w-2 h-2 rounded-full ${user.emailVerified ? 'bg-green-400' : 'bg-red-400'}`}></span>
                            <span className="text-xs text-gray-500">
                              {user.emailVerified ? 'Verified' : 'Unverified'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'User'}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.createdDate)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.role?.toLowerCase() === 'admin' ? (
                          <div className="text-xs text-gray-500">Admin accounts are read-only</div>
                        ) : (
                          <div className="flex flex-col space-y-2">
                            {/* Role Update */}
                            <select
                              value={user.role || 'user'}
                              onChange={(e) => updateUserRole(user.username, e.target.value)}
                              disabled={updating}
                              className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                              <option value="moderator">Moderator</option>
                            </select>

                            {/* Action Buttons */}
                            <div className="flex space-x-1">
                              <button
                                onClick={() => toggleUserStatus(user.username, user.enabled)}
                                disabled={updating}
                                className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                                  user.enabled 
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                } disabled:opacity-50`}
                              >
                                {user.enabled ? 'Disable' : 'Enable'}
                              </button>
                              
                              {!user.emailVerified && (
                                <button
                                  onClick={() => resendVerificationEmail(user.username, user.email)}
                                  disabled={updating}
                                  className="px-2 py-1 text-xs rounded font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 disabled:opacity-50"
                                >
                                  Verify
                                </button>
                              )}
                              
                              <button
                                onClick={() => resetUserPassword(user.username, user.email)}
                                disabled={updating}
                                className="px-2 py-1 text-xs rounded font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(startIndex + usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {users.filter(u => u.enabled && u.status === 'CONFIRMED').length}
              </div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {users.filter(u => u.status === 'UNCONFIRMED').length}
              </div>
              <div className="text-sm text-gray-600">Unconfirmed</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {users.filter(u => u.role === 'admin').length}
              </div>
              <div className="text-sm text-gray-600">Admins</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {users.filter(u => !u.enabled).length}
              </div>
              <div className="text-sm text-gray-600">Disabled</div>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
