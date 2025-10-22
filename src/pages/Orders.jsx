import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/Footer';

const Orders = () => {
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // API URL for orders
  const API_BASE_URL = 'https://m3hoptm1hi.execute-api.us-east-1.amazonaws.com/prod';

  useEffect(() => {
    if (isAuthenticated() && user) {
      loadUserOrders();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadUserOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      const userId = user?.username || user?.sub;
      if (!userId) {
        throw new Error('User ID not found');
      }

      const response = await fetch(`${API_BASE_URL}/orders/user/${userId}`);
      
      if (response.ok) {
        const userOrders = await response.json();
        setOrders(Array.isArray(userOrders) ? userOrders : []);
      } else {
        throw new Error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setError('Failed to load orders. Please try again later.');
      setOrders([]);
    } finally {
      setLoading(false);
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
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
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

  // Helper function to check if an item is an animal
  const isAnimalItem = (item) => {
    return item.isAnimal === true || 
           item.animalId || 
           (item.type && item.breed) || 
           (item.type && item.ownerName);
  };

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Please Log In</h2>
          <p className="text-gray-600 mb-6">You need to be logged in to view your orders.</p>
          <a
            href="/login"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={loadUserOrders}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <svg className="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          </div>
          <p className="text-gray-600">
            {orders.length === 0 
              ? 'You haven\'t placed any orders yet' 
              : `You have ${orders.length} order${orders.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>

        {orders.length === 0 ? (
          /* No Orders */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-6">📦</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">No orders yet</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              When you place orders, they'll appear here. Start shopping to find amazing products for your pets!
            </p>
            <a
              href="/store"
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Start Shopping
            </a>
          </div>
        ) : (
          /* Orders List */
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.orderId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Order Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.orderId}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Placed on {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status || 'Pending'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                        Payment: {order.paymentStatus || 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="p-6">
                  {/* Items */}
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Items Ordered</h4>
                    <div className="space-y-4">
                      {order.items && order.items.map((item, index) => (
                        <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                          <img
                            src={getProductImageUrl(item)}
                            alt={item.name || 'Product'}
                            className="w-16 h-16 object-cover rounded-lg"
                            onError={(e) => {
                              if (isAnimalItem(item)) {
                                // Use animal emoji placeholder for animals
                                const animalEmojis = {
                                  'Dog': '🐕', 'Cat': '🐱', 'Bird': '🐦', 
                                  'Fish': '🐠', 'Rabbit': '🐰', 'Hamster': '🐹', 
                                  'Reptile': '🦎', 'Other': '🐾'
                                };
                                const emoji = animalEmojis[item.type] || '🐾';
                                e.target.src = `https://placehold.co/80x80?text=${emoji}`;
                              } else {
                                e.target.src = 'https://placehold.co/80x80?text=No%20Image';
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-medium text-gray-900 truncate">
                              {item.name}
                            </h5>
                            {isAnimalItem(item) ? (
                              <div className="text-sm text-gray-500 space-y-1">
                                {item.type && (
                                  <div className="flex items-center">
                                    <span className="mr-1">
                                      {item.type === 'Dog' ? '🐕' : 
                                       item.type === 'Cat' ? '🐱' : 
                                       item.type === 'Bird' ? '🐦' : 
                                       item.type === 'Fish' ? '🐠' : '🐾'}
                                    </span>
                                    <span>{item.type}</span>
                                  </div>
                                )}
                                {item.breed && <p>Breed: {item.breed}</p>}
                                {item.ownerName && <p>Previous Owner: {item.ownerName}</p>}
                                {/* Show animal order status if available */}
                                {item.orderStatus && (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    item.orderStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                                    item.orderStatus === 'shipped' ? 'bg-purple-100 text-purple-800' :
                                    item.orderStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                                    item.orderStatus === 'confirmed' ? 'bg-green-100 text-green-800' :
                                    item.orderStatus === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    Animal Status: {item.orderStatus}
                                  </span>
                                )}
                              </div>
                            ) : (
                              item.brand && (
                                <p className="text-sm text-gray-500">{item.brand}</p>
                              )
                            )}
                            <div className="flex items-center mt-1 space-x-4">
                              <span className="text-sm text-gray-600">
                                {isAnimalItem(item) ? 'Unique Animal' : `Qty: ${item.quantity}`}
                              </span>
                              <span className="text-sm font-medium text-gray-900">₹{item.price}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              ₹{(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Delivery Address */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Delivery Address</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        {order.deliveryAddress ? (
                          <div className="text-sm text-gray-700">
                            <p className="font-medium">{order.deliveryAddress.name}</p>
                            <p>{order.deliveryAddress.phone}</p>
                            <p>{order.deliveryAddress.email}</p>
                            <div className="mt-2">
                              <p>{order.deliveryAddress.addressLine1}</p>
                              {order.deliveryAddress.addressLine2 && (
                                <p>{order.deliveryAddress.addressLine2}</p>
                              )}
                              <p>{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.pincode}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Address not available</p>
                        )}
                      </div>
                    </div>

                    {/* Payment & Order Summary */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Payment & Summary</h4>
                      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Payment Method:</span>
                          <span className="font-medium capitalize">
                            {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 
                             order.paymentMethod === 'razorpay' ? 'Online Payment' : 
                             order.paymentMethod}
                          </span>
                        </div>
                        
                        {order.paymentId && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Payment ID:</span>
                            <span className="font-mono text-xs">{order.paymentId}</span>
                          </div>
                        )}

                        <div className="border-t border-gray-200 pt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal:</span>
                            <span>₹{order.subtotal || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Shipping:</span>
                            <span>{order.shipping === 0 ? 'Free' : `₹${order.shipping || 0}`}</span>
                          </div>
                          <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-2">
                            <span>Total:</span>
                            <span>₹{order.total || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Notes */}
                  {order.orderNotes && (
                    <div className="mt-6">
                      <h4 className="text-md font-medium text-gray-900 mb-2">Order Notes</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {order.orderNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default Orders;
