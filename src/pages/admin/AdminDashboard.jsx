import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';

const AdminDashboard = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    revenue: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // API URLs
  const API_BASE_URL = 'https://m3hoptm1hi.execute-api.us-east-1.amazonaws.com/prod';
  const USER_API_URL = 'https://rihfgmk2k1.execute-api.us-east-1.amazonaws.com/prod';
  const COGNITO_API_URL = 'https://zgjffueud8.execute-api.us-east-1.amazonaws.com/prod';
  const PRODUCT_API_URL = 'https://ykqbrht440.execute-api.us-east-1.amazonaws.com/prod';

  useEffect(() => {
    if (isAdmin()) {
      loadDashboardData();
    }
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load all data in parallel
      const [ordersResponse, productsResponse, usersResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/orders`).catch(() => null),
        fetch(`${PRODUCT_API_URL}/products`).catch(() => null),
        fetch(`${COGNITO_API_URL}/admin/users`).catch(() => null)
      ]);

      // Process orders data
      let orders = [];
      let totalRevenue = 0;
      
      if (ordersResponse && ordersResponse.ok) {
        orders = await ordersResponse.json();
        totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      }

      // Process products data
      let products = [];
      if (productsResponse && productsResponse.ok) {
        products = await productsResponse.json();
      }

      // Users data
      let users = [];
      if (usersResponse && usersResponse.ok) {
        users = await usersResponse.json();
      }

      // Get recent orders (last 5)
      const sortedOrders = orders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(order => ({
          id: order.orderId,
          customer: order.deliveryAddress?.name || order.customerName || 'Unknown',
          product: order.items?.[0]?.name || 'Multiple items',
          amount: `₹${order.total || 0}`,
          status: order.status || 'Pending',
          paymentStatus: order.paymentStatus || 'Pending',
          paymentMethod: order.paymentMethod || 'Unknown',
          createdAt: order.createdAt,
          itemCount: order.items?.length || 0
        }));

      // Update stats
      setStats({
        totalUsers: Array.isArray(users) ? users.length : 0,
        totalProducts: Array.isArray(products) ? products.length : 0,
        totalOrders: Array.isArray(orders) ? orders.length : 0,
        revenue: totalRevenue
      });

      setRecentOrders(sortedOrders);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Some features may not be available.');
    } finally {
      setLoading(false);
    }
  };   

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 sm:p-6 text-white">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">Welcome back! 👋</h1>
          <p className="text-sm sm:text-base text-blue-100">Here's what's happening with your store today.</p>
          {error && (
            <div className="mt-2 text-sm text-yellow-200">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <span className="text-lg sm:text-2xl">👥</span>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Users</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {loading ? (
                    <span className="inline-block animate-pulse bg-gray-200 h-6 w-12 rounded"></span>
                  ) : (
                    stats.totalUsers > 0 ? stats.totalUsers.toLocaleString() : 'N/A'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-green-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <span className="text-lg sm:text-2xl">📦</span>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Products</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {loading ? (
                    <span className="inline-block animate-pulse bg-gray-200 h-6 w-12 rounded"></span>
                  ) : (
                    stats.totalProducts.toLocaleString()
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-purple-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <span className="text-lg sm:text-2xl">🛒</span>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Orders</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {loading ? (
                    <span className="inline-block animate-pulse bg-gray-200 h-6 w-12 rounded"></span>
                  ) : (
                    stats.totalOrders.toLocaleString()
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <span className="text-lg sm:text-2xl">💰</span>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Revenue</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">
                  {loading ? (
                    <span className="inline-block animate-pulse bg-gray-200 h-6 w-16 rounded"></span>
                  ) : (
                    `₹${stats.revenue.toLocaleString()}`
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{order.customer}</p>
                      <p className="text-sm text-gray-600">{order.product}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{order.amount}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/admin/orders')} className="w-full mt-4 text-primary-600 hover:text-primary-700 font-medium transition-colors">
                View All Orders →
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <button className="flex flex-col items-center p-4 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors">
                  <span className="text-3xl mb-2">➕</span>
                  <span className="text-sm font-medium text-gray-900">Add Product</span>
                </button>
                <button className="flex flex-col items-center p-4 bg-secondary-50 hover:bg-secondary-100 rounded-lg transition-colors">
                  <span className="text-3xl mb-2">👥</span>
                  <span className="text-sm font-medium text-gray-900">Manage Users</span>
                </button>
                <button className="flex flex-col items-center p-4 bg-accent-50 hover:bg-accent-100 rounded-lg transition-colors">
                  <span className="text-3xl mb-2">📊</span>
                  <span className="text-sm font-medium text-gray-900">View Analytics</span>
                </button>
                <button className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                  <span className="text-3xl mb-2">⚙️</span>
                  <span className="text-sm font-medium text-gray-900">Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Features */}
        <div className="mt-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl p-8 text-white">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Need Help Managing Your Store?</h3>
            <p className="text-primary-100 mb-6">
              Access our comprehensive admin tools and analytics to grow your pet business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-primary-600 hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold transition-colors">
                📚 View Documentation
              </button>
              <button className="bg-accent-500 hover:bg-accent-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                💬 Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;