  import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import Swal from 'sweetalert2';

const AdminOrders = () => {
  const { user, isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    paymentStatus: 'all',
    paymentMethod: 'all',
    dateRange: '7days',
    orderType: 'all' // all, products, animals
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  // API URL for orders
  const API_BASE_URL = 'https://m3hoptm1hi.execute-api.us-east-1.amazonaws.com/prod';

  useEffect(() => {
    if (isAdmin()) {
      loadAllOrders();
    }
  }, []);

  const loadAllOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${API_BASE_URL}/admin/orders`);
      
      if (response.ok) {
        const allOrders = await response.json();
        setOrders(Array.isArray(allOrders) ? allOrders : []);
        console.log('Loaded admin orders:', allOrders.length);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setError(`Failed to load orders: ${error.message}`);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setUpdating(true);
      
      // Update local state optimistically
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.orderId === orderId 
            ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
            : order
        )
      );

      // Make API call to update the order in DynamoDB
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Status Updated',
          text: `Order status changed to ${newStatus}`,
          timer: 2000,
          showConfirmButton: false
        });
        console.log(`Order ${orderId} status updated to ${newStatus}`);
      } else {
        // Revert optimistic update on failure
        await loadAllOrders();
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Failed to update order status. Please try again.',
        confirmButtonColor: '#3B82F6'
      });
      // Revert optimistic update
      await loadAllOrders();
    } finally {
      setUpdating(false);
    }
  };

  const updatePaymentStatus = async (orderId, newPaymentStatus) => {
    try {
      setUpdating(true);
      
      // Update local state optimistically
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.orderId === orderId 
            ? { ...order, paymentStatus: newPaymentStatus, updatedAt: new Date().toISOString() }
            : order
        )
      );

      // Make API call to update the payment status in DynamoDB
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: newPaymentStatus })
      });

      if (response.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Payment Status Updated',
          text: `Payment status changed to ${newPaymentStatus}`,
          timer: 2000,
          showConfirmButton: false
        });
        console.log(`Order ${orderId} payment status updated to ${newPaymentStatus}`);
      } else {
        // Revert optimistic update on failure
        await loadAllOrders();
        throw new Error('Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Failed to update payment status. Please try again.',
        confirmButtonColor: '#3B82F6'
      });
      // Revert optimistic update
      await loadAllOrders();
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (paymentStatus) => {
    switch (paymentStatus?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
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

  // Helper function to check if an order contains animals
  const isAnimalOrder = (order) => {
    return order.items && order.items.some(item => 
      item.isAnimal === true || 
      item.animalId || 
      (item.type && item.breed) || 
      (item.type && item.ownerName)
    );
  };

  // Helper function to check if an order contains only animals (no products)
  const isAnimalOnlyOrder = (order) => {
    if (!order.items || order.items.length === 0) return false;
    return order.items.every(item => 
      item.isAnimal === true || 
      item.animalId || 
      (item.type && item.breed) || 
      (item.type && item.ownerName)
    );
  };

  const getProductImageUrl = (item) => {
    // For animals, handle imageUrls
    if (item.imageUrls && Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
      return item.imageUrls[0];
    }
    // For products, handle regular image properties
    if (item.imageUrl) return item.imageUrl;
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      const firstImage = item.images[0];
      return typeof firstImage === 'string' ? firstImage : firstImage.imageUrl;
    }
    if (item.image) return item.image;
    return 'https://placehold.co/80x80?text=No%20Image';
  };

  // Filter orders based on current filters - SHOW animal orders (both product and animal orders)
  const filteredOrders = orders.filter(order => {
    // Order type filter
    let matchesOrderType = true;
    if (filters.orderType === 'products') {
      matchesOrderType = !isAnimalOrder(order);
    } else if (filters.orderType === 'animals') {
      matchesOrderType = isAnimalOrder(order);
    }

    const matchesSearch = searchTerm === '' || 
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filters.status === 'all' || order.status === filters.status;
    const matchesPaymentStatus = filters.paymentStatus === 'all' || order.paymentStatus === filters.paymentStatus;
    const matchesPaymentMethod = filters.paymentMethod === 'all' || order.paymentMethod === filters.paymentMethod;

    // Date filter
    const orderDate = new Date(order.createdAt);
    const now = new Date();
    let matchesDate = true;
    
    if (filters.dateRange === '1day') {
      matchesDate = now - orderDate <= 24 * 60 * 60 * 1000;
    } else if (filters.dateRange === '7days') {
      matchesDate = now - orderDate <= 7 * 24 * 60 * 60 * 1000;
    } else if (filters.dateRange === '30days') {
      matchesDate = now - orderDate <= 30 * 24 * 60 * 60 * 1000;
    }

    return matchesOrderType && matchesSearch && matchesStatus && matchesPaymentStatus && matchesPaymentMethod && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ordersPerPage);

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
            <p className="text-gray-600">Loading orders...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
            <p className="text-gray-600">Track and manage customer orders (products and animals)</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <span className="text-sm text-gray-500">
              Total Orders: {filteredOrders.length}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Order ID, Customer name, Email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Order Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Payment Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Methods</option>
                <option value="cod">Cash on Delivery</option>
                <option value="razorpay">Online Payment</option>
              </select>
            </div>

            {/* Order Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
              <select
                value={filters.orderType}
                onChange={(e) => setFilters(prev => ({ ...prev, orderType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Orders</option>
                <option value="products">Product Orders</option>
                <option value="animals">Animal Orders 🐾</option>
              </select>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
            {['1day', '7days', '30days', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setFilters(prev => ({ ...prev, dateRange: range }))}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filters.dateRange === range
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {range === '1day' ? 'Today' : 
                 range === '7days' ? 'Last 7 days' :
                 range === '30days' ? 'Last 30 days' : 'All time'}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        {error ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Orders</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadAllOrders}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Try Again
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
            <p className="text-gray-600">No orders match your current filters.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedOrders.map((order) => (
                    <tr key={order.orderId} className="hover:bg-gray-50">
                      {/* Order Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">#{order.orderId}</div>
                          <div className="text-sm text-gray-500">{formatDate(order.createdAt)}</div>
                          <div className="text-sm font-medium text-green-600">₹{order.total}</div>
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{order.customerName || order.deliveryAddress?.name}</div>
                          <div className="text-sm text-gray-500">{order.customerEmail || order.deliveryAddress?.email}</div>
                          <div className="text-sm text-gray-500">{order.deliveryAddress?.phone}</div>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {order.items.slice(0, 2).map((item, index) => {
                            const isAnimalItem = item.isAnimal === true || 
                              item.animalId || 
                              (item.type && item.breed) || 
                              (item.type && item.ownerName);
                            
                            return (
                              <div key={index} className={`flex items-center space-x-2 rounded-lg p-2 mb-1 ${
                                isAnimalItem ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                              }`}>
                                <img
                                  src={getProductImageUrl(item)}
                                  alt={item.name}
                                  className="w-8 h-8 object-cover rounded"
                                  onError={(e) => {
                                    e.target.src = 'https://placehold.co/32x32?text=?';
                                  }}
                                />
                                <div>
                                  <div className="text-xs font-medium text-gray-900 truncate max-w-20 flex items-center">
                                    {item.name}
                                    {isAnimalItem && (
                                      <span className="ml-1 text-xs text-blue-600 font-bold">🐾</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {isAnimalItem ? 'Animal' : `Qty: ${item.quantity}`}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {order.items.length > 2 && (
                            <div className={`text-xs text-gray-500 rounded-lg p-2 ${
                              isAnimalOrder(order) ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              +{order.items.length - 2} more
                              {isAnimalOrder(order) && (
                                <span className="ml-1">🐾</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Payment Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm capitalize font-medium text-gray-900">
                            {order.paymentMethod === 'cod' ? 'COD' : order.paymentMethod}
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                            {order.paymentStatus}
                          </span>
                          {order.paymentId && (
                            <div className="text-xs text-gray-500 font-mono mt-1">{order.paymentId}</div>
                          )}
                        </div>
                      </td>

                      {/* Order Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-2">
                          {/* Update Order Status */}
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.orderId, e.target.value)}
                            disabled={updating}
                            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>

                          {/* Update Payment Status */}
                          <select
                            value={order.paymentStatus}
                            onChange={(e) => updatePaymentStatus(order.orderId, e.target.value)}
                            disabled={updating}
                            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="pending">Payment Pending</option>
                            <option value="completed">Payment Complete</option>
                            <option value="failed">Payment Failed</option>
                          </select>
                        </div>
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
                    Showing {startIndex + 1} to {Math.min(startIndex + ordersPerPage, filteredOrders.length)} of {filteredOrders.length} orders
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
              <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
              <div className="text-sm text-gray-600">Total Orders</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {orders.filter(o => o.status === 'delivered').length}
              </div>
              <div className="text-sm text-gray-600">Delivered</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {orders.filter(o => o.paymentStatus === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending Payment</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                ₹{orders.reduce((total, order) => total + order.total, 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Revenue</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
