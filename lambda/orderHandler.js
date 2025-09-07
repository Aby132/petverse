const AWS = require('aws-sdk');

// Configure AWS - hardcoded region
AWS.config.update({ region: 'us-east-1' });
const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.ORDERS_TABLE || 'petverse-orders';

// Razorpay configuration
const RAZORPAY_KEY_ID = 'rzp_test_R79jO6N4F99QLG';
const RAZORPAY_KEY_SECRET = 'HgKjdH7mCViwebMQTIFmbx7R';

// Helper function to generate order ID
function generateOrderId() {
  return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Create order
async function createOrder(event) {
  try {
    const orderData = JSON.parse(event.body);
    
    // Generate unique order ID
    const orderId = generateOrderId();
    
    // Prepare order item for DynamoDB
    const orderItem = {
      orderId: orderId,
      userId: orderData.userId,
      items: orderData.items,
      deliveryAddress: orderData.deliveryAddress,
      paymentMethod: orderData.paymentMethod,
      orderNotes: orderData.orderNotes || '',
      subtotal: orderData.subtotal,
      shipping: orderData.shipping,
      total: orderData.total,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store order in DynamoDB
    await dynamodb.put({
      TableName: TABLE_NAME,
      Item: orderItem
    }).promise();

    console.log('Order created successfully:', orderId);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        orderId: orderId,
        message: 'Order created successfully'
      })
    };

  } catch (error) {
    console.error('Error creating order:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        message: 'Failed to create order',
        error: error.message
      })
    };
  }
}

// Create Razorpay order
async function createRazorpayOrder(event) {
  try {
    const { amount, currency, receipt, notes } = JSON.parse(event.body);
    
    // For now, return a mock response since Razorpay package might cause issues
    console.log('Creating Razorpay order:', { amount, currency, receipt, notes });
    
    const mockOrderId = 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        id: mockOrderId,
        amount: amount,
        currency: currency,
        receipt: receipt,
        message: 'Mock Razorpay order created (package not loaded)'
      })
    };

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        message: 'Failed to create Razorpay order',
        error: error.message
      })
    };
  }
}

// Verify payment
async function verifyPayment(event) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderData } = JSON.parse(event.body);
    
    console.log('Verifying payment:', { razorpay_payment_id, razorpay_order_id, razorpay_signature });
    
    // For now, always return success (mock verification)
    const orderId = orderData.orderId || razorpay_order_id;
    
    // Update order status in DynamoDB
    await dynamodb.update({
      TableName: TABLE_NAME,
      Key: { orderId: orderId },
      UpdateExpression: 'SET paymentStatus = :paymentStatus, status = :status, paymentDetails = :paymentDetails, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':paymentStatus': 'completed',
        ':status': 'confirmed',
        ':paymentDetails': {
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature,
          verifiedAt: new Date().toISOString(),
          mock: true
        },
        ':updatedAt': new Date().toISOString()
      }
    }).promise();

    console.log('Payment verified successfully for order:', orderId);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        message: 'Payment verified successfully (mock verification)',
        order: {
          orderId: orderId,
          paymentId: razorpay_payment_id,
          status: 'confirmed'
        }
      })
    };

  } catch (error) {
    console.error('Error verifying payment:', error);
    
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        message: 'Payment verification failed',
        error: error.message
      })
    };
  }
}

// Update order status
async function updateOrderStatus(event) {
  try {
    const orderId = event.pathParameters.orderId;
    const { status, paymentDetails, updatedAt } = JSON.parse(event.body);
    
    await dynamodb.update({
      TableName: TABLE_NAME,
      Key: { orderId: orderId },
      UpdateExpression: 'SET status = :status, paymentDetails = :paymentDetails, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':status': status,
        ':paymentDetails': paymentDetails,
        ':updatedAt': updatedAt
      }
    }).promise();

    console.log('Order status updated successfully:', orderId);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'PUT,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        message: 'Order status updated successfully'
      })
    };

  } catch (error) {
    console.error('Error updating order status:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'PUT,OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        message: 'Failed to update order status',
        error: error.message
      })
    };
  }
}

// Health check
async function healthCheck() {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify({
      success: true,
      message: 'Order service is healthy',
      timestamp: new Date().toISOString()
    })
  };
}

// Main handler
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: ''
    };
  }

  try {
    const { httpMethod, path } = event;
    
    if (httpMethod === 'GET') {
      if (path === '/orders/health') {
        return await healthCheck();
      }
    } else if (httpMethod === 'POST') {
      if (path.includes('/orders/create')) {
        return await createOrder(event);
      } else if (path.includes('/razorpay/create-order')) {
        return await createRazorpayOrder(event);
      } else if (path.includes('/razorpay/verify-payment')) {
        return await verifyPayment(event);
      }
    } else if (httpMethod === 'PUT') {
      if (path.includes('/orders/') && path.includes('/status')) {
        return await updateOrderStatus(event);
      }
    }

    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        message: 'Invalid endpoint'
      })
    };

  } catch (error) {
    console.error('Handler error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message
      })
    };
  }
};
