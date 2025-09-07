// Test script to check Razorpay Lambda API
const LAMBDA_API_URL = 'https://lszhk8cqwa.execute-api.us-east-1.amazonaws.com/prod';

async function testCreateOrder() {
  try {
    console.log('Testing order creation...');
    const response = await fetch(`${LAMBDA_API_URL}/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 10000, // 100 INR in paise
        currency: 'INR',
        receipt: `test_receipt_${Date.now()}`
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('Success:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

async function testVerifyOrder() {
  try {
    console.log('Testing order verification...');
    const response = await fetch(`${LAMBDA_API_URL}/orders/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'test-user',
        items: [{ name: 'Test Item', price: 100, quantity: 1 }],
        deliveryAddress: { name: 'Test User', addressLine1: 'Test Address' },
        subtotal: 100,
        shipping: 0,
        total: 100,
        payment: {
          order_id: 'test_order_123',
          payment_id: 'test_payment_123',
          signature: 'test_signature'
        }
      })
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('Success:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run tests
testCreateOrder();
testVerifyOrder();
