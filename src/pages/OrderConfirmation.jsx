import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon, HomeIcon, ShoppingBagIcon, EyeIcon, PrinterIcon, ShareIcon } from '@heroicons/react/24/outline';
import Footer from '../components/Footer';
import Swal from 'sweetalert2';

const OrderConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  const { orderSuccess, orderId, orderData } = location.state || {};

  useEffect(() => {
    if (orderSuccess) {
      setShowConfetti(true);
      // Hide confetti after 3 seconds
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [orderSuccess]);

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
      return new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getProductImageUrl = (item) => {
    if (item.imageUrl) return item.imageUrl;
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      const firstImage = item.images[0];
      return typeof firstImage === 'string' ? firstImage : firstImage.imageUrl;
    }
    if (item.image) return item.image;
    return 'https://placehold.co/80x80?text=No%20Image';
  };

  const handlePrintOrder = () => {
    window.print();
  };

  const handleShareOrder = async () => {
    const shareData = {
      title: 'PetVerse Order Confirmation',
      text: `My order #${orderId} has been confirmed! Total: ₹${orderData?.total || 0}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Fallback to copying to clipboard
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    const text = `Order #${orderId} confirmed! Total: ₹${orderData?.total || 0} - ${window.location.href}`;
    navigator.clipboard.writeText(text).then(() => {
      Swal.fire({
        icon: 'success',
        title: 'Copied!',
        text: 'Order details copied to clipboard',
        timer: 2000,
        showConfirmButton: false
      });
    });
  };

  // Handle case when no order data is available
  if (!orderSuccess && !orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-6">📦</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Order Found</h1>
          <p className="text-gray-600 mb-8">
            We couldn't find any order information. This might happen if you accessed this page directly.
          </p>
          <div className="space-y-3">
            <Link to="/">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center">
                <HomeIcon className="w-5 h-5 mr-2" />
                Go to Home
              </button>
            </Link>
            <Link to="/store">
              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center">
                <ShoppingBagIcon className="w-5 h-5 mr-2" />
                Continue Shopping
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Handle failed orders
  if (!orderSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6">
            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Failed</h1>
          <p className="text-gray-600 mb-8">
            Something went wrong with your order. Please try again or contact support if the problem persists.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Try Again
            </button>
            <Link to="/">
              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center">
                <HomeIcon className="w-5 h-5 mr-2" />
                Go to Home
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          <div className="confetti-animation">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][Math.floor(Math.random() * 5)]
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <CheckCircleIcon className="h-20 w-20 text-green-500 mx-auto animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🎉 Order Confirmed!</h1>
          <p className="text-xl text-gray-600">Thank you for shopping with PetVerse!</p>
        </div>

        {/* Order Summary Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          {/* Header */}
          <div className="bg-green-50 px-6 py-4 border-b border-green-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Order #{orderId}</h2>
                <p className="text-sm text-gray-600">Placed on {formatDate(new Date())}</p>
              </div>
              <div className="mt-2 sm:mt-0 flex space-x-2">
                <button
                  onClick={handlePrintOrder}
                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                >
                  <PrinterIcon className="w-4 h-4 mr-1" />
                  Print
                </button>
                <button
                  onClick={handleShareOrder}
                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                >
                  <ShareIcon className="w-4 h-4 mr-1" />
                  Share
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Order Items */}
            {orderData?.items && orderData.items.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Items Ordered</h3>
                <div className="space-y-4">
                  {orderData.items.map((item, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <img
                        src={getProductImageUrl(item)}
                        alt={item.name || 'Product'}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.src = 'https://placehold.co/80x80?text=No%20Image';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                        {item.brand && <p className="text-sm text-gray-500">{item.brand}</p>}
                        <div className="flex items-center mt-1 space-x-4">
                          <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
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
            )}

            {/* Order Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Payment Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Payment Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium capitalize">
                      {orderData?.paymentMethod === 'cod' ? 'Cash on Delivery' : 
                       orderData?.paymentMethod === 'razorpay' ? 'Online Payment' : 
                       orderData?.paymentMethod || 'Not specified'}
                    </span>
                  </div>
                  {orderData?.paymentId && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Payment ID:</span>
                      <span className="font-mono text-xs">{orderData.paymentId}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Status:</span>
                    <span className={`font-medium ${
                      orderData?.paymentStatus === 'completed' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {orderData?.paymentStatus === 'completed' ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Delivery Address</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {orderData?.deliveryAddress ? (
                    <div className="text-sm text-gray-700">
                      <p className="font-medium">{orderData.deliveryAddress.name}</p>
                      <p>{orderData.deliveryAddress.phone}</p>
                      <p>{orderData.deliveryAddress.email}</p>
                      <div className="mt-2">
                        <p>{orderData.deliveryAddress.addressLine1}</p>
                        {orderData.deliveryAddress.addressLine2 && (
                          <p>{orderData.deliveryAddress.addressLine2}</p>
                        )}
                        <p>{orderData.deliveryAddress.city}, {orderData.deliveryAddress.state} {orderData.deliveryAddress.pincode}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Address information not available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Order Total */}
            <div className="border-t border-gray-200 pt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>₹{orderData?.subtotal || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping:</span>
                    <span>{(orderData?.shipping || 0) === 0 ? 'Free' : `₹${orderData?.shipping || 0}`}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-blue-200 pt-2">
                    <span>Total:</span>
                    <span className="text-blue-600">₹{orderData?.total || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Notes */}
            {orderData?.orderNotes && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Order Notes</h3>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {orderData.orderNotes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">What's Next?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xs">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Order Processing</p>
                <p className="text-gray-600">We're preparing your order for shipment</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xs">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Shipping Updates</p>
                <p className="text-gray-600">You'll receive tracking information via email</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xs">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Delivery</p>
                <p className="text-gray-600">Estimated delivery in 3-5 business days</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xs">4</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Enjoy!</p>
                <p className="text-gray-600">Your pets will love their new products</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center">
              <HomeIcon className="w-5 h-5 mr-2" />
              Go to Home
            </button>
          </Link>
          
          <Link to="/orders">
            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center">
              <EyeIcon className="w-5 h-5 mr-2" />
              View My Orders
            </button>
          </Link>
          
          <Link to="/store">
            <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center">
              <ShoppingBagIcon className="w-5 h-5 mr-2" />
              Continue Shopping
            </button>
          </Link>
        </div>
      </div>
      
      <Footer />

      {/* CSS for Confetti Animation */}
      <style jsx>{`
        .confetti-animation {
          position: relative;
          height: 100%;
          width: 100%;
        }
        
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #3B82F6;
          animation: confetti-fall 3s linear infinite;
        }
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default OrderConfirmation;
