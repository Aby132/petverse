import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/Footer';
import Swal from 'sweetalert2';

// Direct API configuration - no services needed
const API_BASE_URL = 'https://m3hoptm1hi.execute-api.us-east-1.amazonaws.com/prod';
const USER_API_URL = 'https://rihfgmk2k1.execute-api.us-east-1.amazonaws.com/prod';
const PRODUCT_API_URL = 'https://ykqbrht440.execute-api.us-east-1.amazonaws.com/prod';
const RAZORPAY_KEY_ID = 'rzp_test_R79jO6N4F99QLG';
const RAZORPAY_KEY_SECRET = 'HgKjdH7mCViwebMQTIFmbx7R';

const Checkout = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [orderNotes, setOrderNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddressUpdating, setIsAddressUpdating] = useState(false);
  const [enrichedCartItems, setEnrichedCartItems] = useState([]);

  // Edit address state
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    addressType: 'home'
  });

  const [addressForm, setAddressForm] = useState({
    name: '',
    phone: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false,
    addressType: 'home'
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }
    loadCheckoutData();
  }, [isAuthenticated, navigate]);

  const loadCheckoutData = async () => {
    try {
      setLoading(true);
      
      // Load cart items from localStorage
      const cartData = localStorage.getItem('petverse_cart');
      const items = cartData ? JSON.parse(cartData) : [];
      setCartItems(items);
      
      // Enrich cart items with product details if images are missing
      const enriched = await Promise.all(
        items.map(async (item) => {
          if (!item.imageUrl && (!item.images || item.images.length === 0)) {
            try {
              const response = await fetch(`${PRODUCT_API_URL}/products/${item.productId}`);
              if (response.ok) {
                const productDetails = await response.json();
                return {
                  ...item,
                  imageUrl: productDetails.images && productDetails.images.length > 0 
                    ? productDetails.images[0].imageUrl 
                    : null,
                  images: productDetails.images || []
                };
              }
            } catch (error) {
              console.warn('Failed to fetch product details for image:', error);
            }
          }
          return item;
        })
      );
      
      setEnrichedCartItems(enriched);
      
      // Try to load addresses from backend
      try {
        await reloadAddresses();
      } catch (error) {
        console.warn('Could not load addresses (backend not available):', error);
        // Set default test address
        setAddresses([{
          addressId: 'test-address',
          name: 'Test User',
          phone: '+91 98765 43210',
          email: 'test@example.com',
          addressLine1: '123 Test Street',
          addressLine2: 'Test Area',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
          isDefault: true,
          addressType: 'home'
        }]);
        setSelectedAddress({
          addressId: 'test-address',
          name: 'Test User',
          phone: '+91 98765 43210',
          email: 'test@example.com',
          addressLine1: '123 Test Street',
          addressLine2: 'Test Area',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
          isDefault: true,
          addressType: 'home'
        });
      }
    } catch (error) {
      console.error('Error loading checkout data:', error);
    } finally {
      setLoading(false);
    }
  };

  const reloadAddresses = async () => {
    try {
      const response = await fetch(`${USER_API_URL}/user/addresses?userId=${user?.username || user?.sub}`);
      if (response.ok) {
        const userAddresses = await response.json();
        
        // Ensure only one address is marked as default (backend should handle this, but let's be safe)
        const addressesWithSingleDefault = userAddresses.map((addr, index) => ({
          ...addr,
          isDefault: index === 0 ? true : false // For now, just make the first one default if multiple are marked
        }));
        
        // If multiple addresses are marked as default, fix it
        const defaultAddresses = userAddresses.filter(addr => addr.isDefault);
        if (defaultAddresses.length > 1) {
          // Keep only the first default address, set others to false
          const fixedAddresses = userAddresses.map((addr, index) => ({
            ...addr,
            isDefault: addr.addressId === defaultAddresses[0].addressId
          }));
          setAddresses(fixedAddresses);
        } else {
          setAddresses(userAddresses);
        }
        
        const defaultAddress = userAddresses.find(addr => addr.isDefault);
        if (defaultAddress) {
          setSelectedAddress(defaultAddress);
        } else if (userAddresses.length > 0) {
          setSelectedAddress(userAddresses[0]);
        } else {
          setSelectedAddress(null);
        }
        
        if (userAddresses.length === 0) {
          setShowAddressForm(true);
        }
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
      throw error;
    }
  };

  const startEditAddress = (address) => {
    setEditingAddressId(address.addressId);
    setEditForm({
      name: address.name || '',
      phone: address.phone || '',
      email: address.email || '',
      addressLine1: address.addressLine1 || '',
      addressLine2: address.addressLine2 || '',
      city: address.city || '',
      state: address.state || '',
      pincode: address.pincode || '',
      addressType: address.addressType || 'home'
    });
  };

  const cancelEditAddress = () => {
    setEditingAddressId(null);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const submitEditAddress = async (e) => {
    e.preventDefault();
    if (!editingAddressId) return;
    try {
      setIsAddressUpdating(true);
      const response = await fetch(`${USER_API_URL}/user/addresses`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressId: editingAddressId, ...editForm })
      });
      
      if (response.ok) {
        await reloadAddresses();
        setEditingAddressId(null);
      } else {
        throw new Error('Failed to update address');
      }
    } catch (error) {
      console.error('Error updating address:', error);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Failed to update address. Please try again.',
        confirmButtonColor: '#3B82F6'
      });
    } finally {
      setIsAddressUpdating(false);
    }
  };

  const handleAddressFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      // If setting as default, we need to ensure only one address is default
      const addressData = { ...addressForm, userId: user?.username || user?.sub };
      
      const response = await fetch(`${USER_API_URL}/user/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressData)
      });
      
      if (response.ok) {
        const newAddress = await response.json();
        
        // If this address is set as default, reload addresses to update the UI
        if (addressForm.isDefault) {
          await reloadAddresses();
        } else {
          // Just add the new address to the list
          setAddresses(prev => [...prev, newAddress]);
        }
        
        setAddressForm({
          name: '', phone: '', email: '', addressLine1: '', addressLine2: '',
          city: '', state: '', pincode: '', isDefault: false, addressType: 'home'
        });
        setShowAddressForm(false);
      } else {
        throw new Error('Failed to add address');
      }
    } catch (error) {
      console.error('Error adding address:', error);
      Swal.fire({
        icon: 'error',
        title: 'Add Address Failed',
        text: 'Failed to add address. Please try again.',
        confirmButtonColor: '#3B82F6'
      });
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      setIsAddressUpdating(true);
      
      // Optimistically update the UI to show immediate feedback
      setAddresses(prev => 
        prev.map(addr => ({
          ...addr,
          isDefault: addr.addressId === addressId
        }))
      );
      
      const response = await fetch(`${USER_API_URL}/user/addresses/default`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressId, userId: user?.username || user?.sub })
      });
      
      if (response.ok) {
        // Reload addresses to ensure consistency with backend
        await reloadAddresses();
      } else {
        // Revert optimistic update on failure
        await reloadAddresses();
        throw new Error('Failed to set default address');
      }
    } catch (error) {
      console.error('Error setting default address:', error);
      Swal.fire({
        icon: 'error',
        title: 'Set Default Failed',
        text: 'Failed to set default address. Please try again.',
        confirmButtonColor: '#3B82F6'
      });
      // Ensure we reload addresses to get the correct state
      await reloadAddresses();
    } finally {
      setIsAddressUpdating(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    const result = await Swal.fire({
      title: 'Delete Address',
      text: 'Are you sure you want to delete this address permanently?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) return;
    try {
      setIsAddressUpdating(true);
      const response = await fetch(`${USER_API_URL}/user/addresses`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressId, userId: user?.username || user?.sub })
      });
      
      if (response.ok) {
        await reloadAddresses();
      } else {
        throw new Error('Failed to delete address');
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: 'Failed to delete address. Please try again.',
        confirmButtonColor: '#3B82F6'
      });
    } finally {
      setIsAddressUpdating(false);
    }
  };

  const calculateSubtotal = () => {
    return enrichedCartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateShipping = () => {
    const subtotal = calculateSubtotal();
    return subtotal >= 200 ? 0 : 50;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping();
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay script'));
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress || enrichedCartItems.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please select a delivery address and ensure your cart is not empty.',
        confirmButtonColor: '#3B82F6'
      });
      return;
    }

    setIsProcessing(true);
    try {
      const orderData = {
        userId: user?.username || user?.sub || 'guest',
        items: enrichedCartItems,
        deliveryAddress: selectedAddress,
        paymentMethod,
        orderNotes,
        subtotal: calculateSubtotal(),
        shipping: calculateShipping(),
        total: calculateTotal()
      };

      console.log('Placing order:', orderData);

      // Handle different payment methods
      if (paymentMethod === 'razorpay') {
        try {
          // Load Razorpay script
          await loadRazorpayScript();

          // Create Razorpay order first
          const totalAmount = calculateTotal();
          console.log('Creating Razorpay order for amount:', totalAmount);
          
          let createOrderResponse = await fetch(`${API_BASE_URL}/razorpay/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: Math.round(totalAmount * 100), // Razorpay expects amount in paise, ensure it's an integer
              currency: 'INR',
              orderData
            })
          });

          // Simple one-time retry on failure
          if (!createOrderResponse.ok) {
            console.warn('Create Razorpay order failed, retrying once...');
            createOrderResponse = await fetch(`${API_BASE_URL}/razorpay/create-order`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount: Math.round(totalAmount * 100),
                currency: 'INR',
                orderData
              })
            });
            if (!createOrderResponse.ok) {
              const errText = await createOrderResponse.text().catch(() => '');
              throw new Error(`Failed to create Razorpay order: ${errText || createOrderResponse.status}`);
            }
          }

          const razorpayOrder = await createOrderResponse.json();
          console.log('Razorpay order created:', razorpayOrder);

          // Open Razorpay payment gateway
          const options = {
            key: RAZORPAY_KEY_ID,
            amount: Math.round(totalAmount * 100),
            currency: 'INR',
            name: 'PetVerse',
            description: `Order for ${enrichedCartItems.length} items`,
            order_id: razorpayOrder.id,
            handler: async (response) => {
              try {
                console.log('Payment successful:', response);
                
                // Create order in DynamoDB
                const orderResponse = await fetch(`${API_BASE_URL}/orders/create`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...orderData,
                    paymentId: response.razorpay_payment_id,
                    razorpayOrderId: response.razorpay_order_id,
                    paymentStatus: 'completed'
                  })
                });

                if (!orderResponse.ok) {
                  throw new Error('Failed to create order in database');
                }

                const orderResult = await orderResponse.json();
                console.log('Order created in database:', orderResult);

                // Verify payment on backend
                const verifyResponse = await fetch(`${API_BASE_URL}/razorpay/verify-payment`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    paymentId: response.razorpay_payment_id,
                    orderId: response.razorpay_order_id,
                    signature: response.razorpay_signature,
                    orderData
                  })
                });

                const verificationResult = await verifyResponse.json();
                console.log('Payment verification:', verificationResult);

                // Show success message
                await Swal.fire({
                  icon: 'success',
                  title: 'Payment Successful!',
                  text: `Your order #${orderResult.orderId} has been placed successfully. Payment ID: ${response.razorpay_payment_id}`,
                  confirmButtonColor: '#10B981'
                });

                // Clear cart
                localStorage.removeItem('petverse_cart');
                
                // Navigate to success page
                navigate('/order-confirmation', { 
                  state: { 
                    orderSuccess: true,
                    orderId: orderResult.orderId,
                    orderData: {
                      ...orderData,
                      orderId: orderResult.orderId,
                      paymentId: response.razorpay_payment_id,
                      razorpayOrderId: response.razorpay_order_id,
                      paymentVerified: verificationResult.isSignatureValid
                    }
                  } 
                });
              } catch (error) {
                console.error('Error processing successful payment:', error);
                Swal.fire({
                  icon: 'warning',
                  title: 'Payment Successful',
                  text: 'Payment successful but order creation failed. Please contact support.',
                  confirmButtonColor: '#3B82F6'
                });
              } finally {
                setIsProcessing(false);
              }
            },
            prefill: {
              name: selectedAddress.name,
              email: selectedAddress.email,
              contact: selectedAddress.phone
            },
            theme: {
              color: '#3B82F6'
            }
          };

          const razorpay = new window.Razorpay(options);
          razorpay.open();
        } catch (error) {
          console.error('Razorpay payment error:', error);
          Swal.fire({
            icon: 'error',
            title: 'Payment Failed',
            text: (error && error.message) ? error.message : 'Failed to initialize payment. Please try again.',
            confirmButtonColor: '#3B82F6'
          });
          setIsProcessing(false);
        }
      } else {
        // For COD and other payment methods
        try {
          const orderResponse = await fetch(`${API_BASE_URL}/orders/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
          });

          if (orderResponse.ok) {
            const orderResult = await orderResponse.json();
            
            // Show success message for COD
            await Swal.fire({
              icon: 'success',
              title: 'Order Placed Successfully!',
              text: `Your order #${orderResult.orderId} has been placed. You will pay cash on delivery.`,
              confirmButtonColor: '#10B981'
            });
            
            // Clear cart
            localStorage.removeItem('petverse_cart');
            
            navigate('/order-confirmation', { 
              state: { 
                orderSuccess: true,
                orderId: orderResult.orderId,
                orderData: {
                  ...orderData,
                  orderId: orderResult.orderId
                }
              } 
            });
          } else {
            throw new Error('Failed to create order');
          }
        } catch (error) {
          console.error('Error creating order:', error);
          Swal.fire({
            icon: 'error',
            title: 'Order Failed',
            text: 'Failed to place order. Please try again.',
            confirmButtonColor: '#3B82F6'
          });
        } finally {
          setIsProcessing(false);
        }
      }
    } catch (error) {
      console.error('Error placing order:', error);
      Swal.fire({
        icon: 'error',
        title: 'Order Failed',
        text: 'Failed to place order. Please try again.',
        confirmButtonColor: '#3B82F6'
      });
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">Complete your order and provide delivery details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery Address</h2>
              
              {addresses.length > 0 && (
                <div className="space-y-3 mb-4">
                  {addresses.map((address) => (
                    <div
                      key={address.addressId}
                      className={`border rounded-lg p-4 transition-colors ${
                        selectedAddress?.addressId === address.addressId
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {editingAddressId === address.addressId ? (
                        <form onSubmit={submitEditAddress} className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input className="w-full px-3 py-2 border rounded-lg" name="name" value={editForm.name} onChange={handleEditFormChange} placeholder="Full Name" required/>
                            <input className="w-full px-3 py-2 border rounded-lg" name="phone" value={editForm.phone} onChange={handleEditFormChange} placeholder="Phone" required/>
                            <input className="w-full px-3 py-2 border rounded-lg md:col-span-2" type="email" name="email" value={editForm.email} onChange={handleEditFormChange} placeholder="Email" required/>
                            <input className="w-full px-3 py-2 border rounded-lg md:col-span-2" name="addressLine1" value={editForm.addressLine1} onChange={handleEditFormChange} placeholder="Address Line 1" required/>
                            <input className="w-full px-3 py-2 border rounded-lg md:col-span-2" name="addressLine2" value={editForm.addressLine2} onChange={handleEditFormChange} placeholder="Address Line 2"/>
                            <input className="w-full px-3 py-2 border rounded-lg" name="city" value={editForm.city} onChange={handleEditFormChange} placeholder="City" required/>
                            <input className="w-full px-3 py-2 border rounded-lg" name="state" value={editForm.state} onChange={handleEditFormChange} placeholder="State" required/>
                            <input className="w-full px-3 py-2 border rounded-lg" name="pincode" value={editForm.pincode} onChange={handleEditFormChange} placeholder="Pincode" required/>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button type="button" onClick={cancelEditAddress} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200">Cancel</button>
                            <button type="submit" disabled={isAddressUpdating} className={`px-4 py-2 rounded-md text-white ${isAddressUpdating ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}>Save</button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <label className="flex-1 cursor-pointer" onClick={() => setSelectedAddress(address)}>
                            <div className="flex items-center space-x-2 mb-2">
                              <input
                                type="radio"
                                name="selectedAddress"
                                checked={selectedAddress?.addressId === address.addressId}
                                onChange={() => setSelectedAddress(address)}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <span className="font-medium text-gray-900">{address.name}</span>
                              {address.isDefault && (
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                                  ✓ Default
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm">{address.phone}</p>
                            <p className="text-gray-600 text-sm">{address.email}</p>
                            <p className="text-gray-800 mt-2">
                              {address.addressLine1}
                              {address.addressLine2 && <br />}
                              {address.addressLine2}
                              <br />
                              {address.city}, {address.state} {address.pincode}
                            </p>
                          </label>
                          <div className="flex flex-col items-end gap-2">
                            {!address.isDefault && (
                              <button
                                onClick={() => handleSetDefaultAddress(address.addressId)}
                                disabled={isAddressUpdating}
                                className={`text-sm px-3 py-1 rounded-md border transition-colors ${
                                  isAddressUpdating 
                                    ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200' 
                                    : 'hover:bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300'
                                }`}
                                title="Make this your default address"
                              >
                                Set Default
                              </button>
                            )}
                            <button
                              onClick={() => startEditAddress(address)}
                              disabled={isAddressUpdating}
                              className={`text-sm px-3 py-1 rounded-md border ${isAddressUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-50 text-yellow-700 border-yellow-200'}`}
                              title="Edit address"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(address.addressId)}
                              disabled={isAddressUpdating}
                              className={`text-sm px-3 py-1 rounded-md border ${isAddressUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50 text-red-700 border-red-200'}`}
                              title="Delete address"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!showAddressForm && (
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add New Address</span>
                  </div>
                </button>
              )}

              {showAddressForm && (
                <form onSubmit={handleAddAddress} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={addressForm.name}
                        onChange={handleAddressFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={addressForm.phone}
                        onChange={handleAddressFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={addressForm.email}
                        onChange={handleAddressFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
                    <input
                      type="text"
                      name="addressLine1"
                      value={addressForm.addressLine1}
                      onChange={handleAddressFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                    <input
                      type="text"
                      name="addressLine2"
                      value={addressForm.addressLine2}
                      onChange={handleAddressFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                      <input
                        type="text"
                        name="city"
                        value={addressForm.city}
                        onChange={handleAddressFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                      <input
                        type="text"
                        name="state"
                        value={addressForm.city}
                        onChange={handleAddressFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                      <input
                        type="text"
                        name="pincode"
                        value={addressForm.pincode}
                        onChange={handleAddressFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isDefault"
                      checked={addressForm.isDefault}
                      onChange={handleAddressFormChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      Set as default address
                      {addresses.length > 0 && (
                        <span className="text-xs text-gray-500 block">
                          (This will replace your current default address)
                        </span>
                      )}
                    </label>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Add Address
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddressForm(false);
                        setAddressForm({
                          name: '', phone: '', email: '', addressLine1: '', addressLine2: '',
                          city: '', state: '', pincode: '', isDefault: false, addressType: 'home'
                        });
                      }}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Payment Method Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Method</h2>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Cash on Delivery</span>
                    <p className="text-sm text-gray-600">Pay when you receive your order</p>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="razorpay"
                    checked={paymentMethod === 'razorpay'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Razorpay (Cards, UPI, Net Banking)</span>
                    <p className="text-sm text-gray-600">Secure online payment with multiple options</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                {enrichedCartItems.map((item) => {
                  // Determine the best image source
                  let imageSrc = 'https://placehold.co/50x50?text=No%20Image';
                  
                  if (item.imageUrl) {
                    imageSrc = item.imageUrl;
                  } else if (item.images && Array.isArray(item.images) && item.images.length > 0) {
                    if (typeof item.images[0] === 'string') {
                      imageSrc = item.images[0];
                    } else if (item.images[0].imageUrl) {
                      imageSrc = item.images[0].imageUrl;
                    }
                  }
                  
                  return (
                    <div key={item.productId} className="flex items-center space-x-3">
                      <img
                        src={imageSrc}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded-lg"
                        onError={(e) => {
                          console.warn('Image failed to load:', imageSrc);
                          e.target.src = 'https://placehold.co/50x50?text=Error';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{item.name}</h3>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-sm font-medium text-gray-900">₹{item.price * item.quantity}</span>
                    </div>
                  );
                })}
              </div>
              
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({enrichedCartItems.length} items)</span>
                  <span className="font-medium">₹{calculateSubtotal()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {calculateShipping() === 0 ? 'Free' : `₹${calculateShipping()}`}
                  </span>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>₹{calculateTotal()}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={!selectedAddress || enrichedCartItems.length === 0 || isProcessing}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors mt-6 ${
                  !selectedAddress || enrichedCartItems.length === 0 || isProcessing
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing Order...</span>
                  </div>
                ) : (
                  `Place Order - ₹${calculateTotal()}`
                )}
              </button>

              <button
                onClick={() => navigate('/store')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold transition-colors mt-3"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Checkout;