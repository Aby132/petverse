import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { createHmac } from 'crypto';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const ORDERS_TABLE = process.env.ORDERS_TABLE;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export const handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
    };

    try {
        console.log('Received event:', JSON.stringify(event, null, 2));

        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'CORS preflight' })
            };
        }

        const path = event.path;
        const httpMethod = event.httpMethod;
        
        // Only parse body for POST/PUT requests
        let body = null;
        if (event.body && (httpMethod === 'POST' || httpMethod === 'PUT')) {
            body = JSON.parse(event.body);
        }

        console.log('Request path:', path);
        console.log('Request method:', httpMethod);
        console.log('Request body:', body);

        // Create Razorpay Order (Simplified without Razorpay SDK)
        if (path.includes('/razorpay/create-order')) {
            return await createRazorpayOrderSimplified(body, headers);
        }

        // Verify Razorpay Payment
        if (path.includes('/razorpay/verify-payment')) {
            return await verifyRazorpayPayment(body, headers);
        }

        // Create Order in DynamoDB
        if (path.includes('/orders/create')) {
            return await createOrder(body, headers);
        }

        // Admin: Get All Orders
        if (path.includes('/admin/orders') && httpMethod === 'GET') {
            return await getAllOrdersForAdmin(headers);
        }

        // Admin: Update Order Status
        if (path.includes('/admin/orders/') && path.includes('/status') && httpMethod === 'PUT') {
            const pathParts = path.split('/');
            const orderIndex = pathParts.indexOf('orders');
            const orderId = pathParts[orderIndex + 1];
            return await updateOrderStatusInDB(orderId, body, headers);
        }

        // Admin: Update Payment Status
        if (path.includes('/admin/orders/') && path.includes('/payment') && httpMethod === 'PUT') {
            const pathParts = path.split('/');
            const orderIndex = pathParts.indexOf('orders');
            const orderId = pathParts[orderIndex + 1];
            return await updatePaymentStatusInDB(orderId, body, headers);
        }

        // Get User Orders
        if (path.includes('/orders/user/')) {
            // Extract userId from path or pathParameters
            let userId = event.pathParameters?.userId;
            
            // If pathParameters doesn't work, try extracting from path directly
            if (!userId && path.includes('/orders/user/')) {
                const pathParts = path.split('/');
                const userIndex = pathParts.indexOf('user');
                if (userIndex !== -1 && userIndex + 1 < pathParts.length) {
                    userId = pathParts[userIndex + 1];
                }
            }
            
            console.log('Extracted userId:', userId);
            console.log('Full path:', path);
            console.log('PathParameters:', event.pathParameters);
            
            return await getUserOrders(userId, headers);
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Endpoint not found' })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};

async function createRazorpayOrderSimplified(body, headers) {
    try {
        // Make actual Razorpay API call using fetch
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET || RAZORPAY_KEY_SECRET;
        if (!keyId || !keySecret) {
            console.error('Razorpay credentials missing:', { hasKeyId: !!keyId, hasKeySecret: !!keySecret });
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'Failed to create Razorpay order',
                    message: 'Server misconfiguration: Razorpay credentials are missing.'
                })
            };
        }
        const razorpayAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        
        const razorpayOrderData = {
            amount: body.amount, // amount in paise
            currency: body.currency || 'INR',
            receipt: `order_${Date.now()}`,
            payment_capture: 1
        };

        console.log('Creating Razorpay order with data:', razorpayOrderData);

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        // Basic retry for transient 5xx and network failures
        const maxAttempts = 2;
        let attempt = 0;
        let response;
        let lastError;
        while (attempt < maxAttempts) {
            attempt += 1;
            try {
                response = await fetch('https://api.razorpay.com/v1/orders', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${razorpayAuth}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(razorpayOrderData),
                    signal: controller.signal
                });
                if (response.ok) break;
                // Retry only for 5xx
                if (response.status >= 500) {
                    const text = await response.text();
                    console.warn(`Razorpay API 5xx on attempt ${attempt}:`, response.status, text);
                    if (attempt < maxAttempts) continue;
                }
                break;
            } catch (err) {
                lastError = err;
                console.warn(`Razorpay fetch error on attempt ${attempt}:`, err?.name || err?.message || err);
                if (attempt >= maxAttempts) throw err;
            }
        }

        clearTimeout(timeoutId);

        if (!response || !response.ok) {
            const errorText = response ? await response.text() : (lastError?.message || 'Unknown network error');
            const status = response?.status || 502;
            console.error('Razorpay API error:', status, errorText);
            throw new Error(`Razorpay API error: ${status} - ${errorText}`);
        }

        const razorpayOrder = await response.json();
        console.log('Razorpay order created successfully:', razorpayOrder);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(razorpayOrder)
        };

    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        
        // Handle different types of errors
        let errorMessage = error.message;
        let statusCode = 500;
        
        if (error.name === 'AbortError') {
            errorMessage = 'Request timed out while connecting to Razorpay';
            statusCode = 408;
        } else if (error.message.includes('fetch')) {
            errorMessage = 'Network error while connecting to Razorpay';
            statusCode = 502;
        }
        
        return {
            statusCode,
            headers,
            body: JSON.stringify({ 
                error: 'Failed to create Razorpay order',
                message: errorMessage,
                details: error.name 
            })
        };
    }
}

async function verifyRazorpayPayment(body, headers) {
    const { paymentId, orderId, signature } = body;
    
    console.log('Verifying payment:', { paymentId, orderId, signature });
    
    // Create signature for verification
    const text = orderId + '|' + paymentId;
    const expectedSignature = createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(text)
        .digest('hex');

    const isSignatureValid = expectedSignature === signature;

    console.log('Payment verification result:', { isSignatureValid, expectedSignature, receivedSignature: signature });

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            isSignatureValid,
            paymentId,
            orderId
        })
    };
}

async function createOrder(orderData, headers) {
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();
    
    console.log('Creating order with ID:', orderId);
    
    const order = {
        orderId,
        userId: orderData.userId,
        items: orderData.items || [],
        deliveryAddress: orderData.deliveryAddress || {},
        paymentMethod: orderData.paymentMethod,
        orderNotes: orderData.orderNotes || '',
        subtotal: orderData.subtotal || 0,
        shipping: orderData.shipping || 0,
        total: orderData.total || 0,
        status: orderData.paymentMethod === 'cod' ? 'confirmed' : 'pending',
        paymentStatus: orderData.paymentStatus || (orderData.paymentMethod === 'cod' ? 'pending' : 'completed'),
        paymentId: orderData.paymentId || null,
        razorpayOrderId: orderData.razorpayOrderId || null,
        createdAt,
        updatedAt: createdAt
    };

    const params = {
        TableName: ORDERS_TABLE,
        Item: order
    };

    console.log('DynamoDB params:', JSON.stringify(params, null, 2));

    try {
        await dynamodb.send(new PutCommand(params));
        
        console.log('Order created successfully:', orderId);
        
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                success: true,
                orderId,
                order
            })
        };
    } catch (error) {
        console.error('DynamoDB error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Failed to create order',
                message: error.message 
            })
        };
    }
}

async function getUserOrders(userId, headers) {
    console.log('getUserOrders called with userId:', userId);
    console.log('ORDERS_TABLE:', ORDERS_TABLE);
    
    if (!userId) {
        console.log('No userId provided');
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'User ID is required', receivedUserId: userId })
        };
    }

    // Check if DynamoDB table name is configured
    if (!ORDERS_TABLE) {
        console.error('ORDERS_TABLE environment variable not set');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Database configuration error' })
        };
    }

    console.log('Getting orders for user:', userId);

    const params = {
        TableName: ORDERS_TABLE,
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId
        },
        ScanIndexForward: false // Sort by createdAt descending
    };

    console.log('DynamoDB query params:', JSON.stringify(params, null, 2));

    try {
        const result = await dynamodb.send(new QueryCommand(params));
        
        console.log('DynamoDB query successful');
        console.log('Found orders:', result.Items?.length || 0);
        console.log('Orders data:', JSON.stringify(result.Items, null, 2));
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result.Items || [])
        };
    } catch (error) {
        console.error('DynamoDB query error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            statusCode: error.statusCode,
            stack: error.stack
        });
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Failed to fetch orders',
                message: error.message,
                errorName: error.name,
                errorCode: error.code
            })
        };
    }
}

async function getAllOrdersForAdmin(headers) {
    console.log('getAllOrdersForAdmin called');
    
    if (!ORDERS_TABLE) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Database configuration error' })
        };
    }

    try {
        // Scan the entire table to get all orders for admin
        const params = {
            TableName: ORDERS_TABLE
        };

        console.log('DynamoDB scan params for admin:', JSON.stringify(params, null, 2));

        const result = await dynamodb.send(new ScanCommand(params));
        
        console.log('Admin orders scan successful');
        console.log('Found total orders:', result.Items?.length || 0);
        
        // Sort orders by creation date (newest first)
        const sortedOrders = (result.Items || []).sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(sortedOrders)
        };
    } catch (error) {
        console.error('DynamoDB admin scan error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Failed to fetch admin orders',
                message: error.message,
                errorName: error.name
            })
        };
    }
}

async function updateOrderStatusInDB(orderId, body, headers) {
    console.log('updateOrderStatusInDB called:', orderId, body);
    
    if (!orderId || !body || !body.status) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Order ID and status are required' })
        };
    }

    try {
        const params = {
            TableName: ORDERS_TABLE,
            Key: { orderId },
            UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': body.status,
                ':updatedAt': new Date().toISOString()
            },
            ReturnValues: 'ALL_NEW'
        };

        console.log('Updating order status with params:', JSON.stringify(params, null, 2));

        const result = await dynamodb.send(new UpdateCommand(params));
        
        console.log('Order status updated successfully:', orderId);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                orderId,
                updatedOrder: result.Attributes
            })
        };
    } catch (error) {
        console.error('Error updating order status:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Failed to update order status',
                message: error.message
            })
        };
    }
}

async function updatePaymentStatusInDB(orderId, body, headers) {
    console.log('updatePaymentStatusInDB called:', orderId, body);
    
    if (!orderId || !body || !body.paymentStatus) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Order ID and payment status are required' })
        };
    }

    try {
        const params = {
            TableName: ORDERS_TABLE,
            Key: { orderId },
            UpdateExpression: 'SET paymentStatus = :paymentStatus, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':paymentStatus': body.paymentStatus,
                ':updatedAt': new Date().toISOString()
            },
            ReturnValues: 'ALL_NEW'
        };

        console.log('Updating payment status with params:', JSON.stringify(params, null, 2));

        const result = await dynamodb.send(new UpdateCommand(params));
        
        console.log('Payment status updated successfully:', orderId);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                orderId,
                updatedOrder: result.Attributes
            })
        };
    } catch (error) {
        console.error('Error updating payment status:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Failed to update payment status',
                message: error.message
            })
        };
    }
}
