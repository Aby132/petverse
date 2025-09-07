// Test file to verify cart functionality
// Run this in your browser console to test cart operations

// Test cart service functionality
async function testCartService() {
  console.log('🧪 Testing Cart Service Functionality...');
  
  // Test 1: Check if cartService is available
  console.log('1. Checking cartService availability...');
  if (typeof cartService === 'undefined') {
    console.error('❌ cartService is not available');
    return;
  }
  console.log('✅ cartService is available');
  
  // Test 2: Check getCartCount method
  console.log('2. Testing getCartCount method...');
  try {
    const count = cartService.getCartCount();
    console.log(`✅ getCartCount works: ${count} items`);
  } catch (error) {
    console.error('❌ getCartCount failed:', error);
  }
  
  // Test 3: Check getCurrentUserId method
  console.log('3. Testing getCurrentUserId method...');
  try {
    const userId = cartService.getCurrentUserId();
    console.log(`✅ getCurrentUserId works: ${userId || 'No user ID'}`);
  } catch (error) {
    console.error('❌ getCurrentUserId failed:', error);
  }
  
  // Test 4: Check getCartItems method
  console.log('4. Testing getCartItems method...');
  try {
    const items = await cartService.getCartItems();
    console.log(`✅ getCartItems works: ${items.length} items`);
    console.log('Items:', items);
  } catch (error) {
    console.error('❌ getCartItems failed:', error);
  }
  
  // Test 5: Test adding a mock product
  console.log('5. Testing addToCart with mock product...');
  try {
    const mockProduct = {
      productId: 'test-product-123',
      name: 'Test Product',
      price: 29.99,
      brand: 'Test Brand',
      stock: 10,
      category: 'test'
    };
    
    const result = await cartService.addToCart(mockProduct, 2);
    console.log('✅ addToCart works:', result);
  } catch (error) {
    console.error('❌ addToCart failed:', error);
  }
  
  // Test 6: Test updating quantity
  console.log('6. Testing updateCartItem...');
  try {
    const result = await cartService.updateCartItem('test-product-123', 5);
    console.log('✅ updateCartItem works:', result);
  } catch (error) {
    console.error('❌ updateCartItem failed:', error);
  }
  
  // Test 7: Test removing item
  console.log('7. Testing removeFromCart...');
  try {
    const result = await cartService.removeFromCart('test-product-123');
    console.log('✅ removeFromCart works:', result);
  } catch (error) {
    console.error('❌ removeFromCart failed:', error);
  }
  
  console.log('🎉 Cart service testing completed!');
}

// Test backend connectivity
async function testBackendConnectivity() {
  console.log('🌐 Testing Backend Connectivity...');
  
  const API_BASE_URL = 'https://v1o5fpndre.execute-api.us-east-1.amazonaws.com/prod';
  
  try {
    // Test GET request
    const response = await fetch(`${API_BASE_URL}/cart?userId=test-user`);
    console.log(`Backend GET response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is accessible:', data);
    } else {
      console.log('⚠️ Backend returned error status:', response.status);
    }
  } catch (error) {
    console.error('❌ Backend connectivity test failed:', error);
  }
}

// Run tests
console.log('🚀 Starting Cart Service Tests...');
testCartService().then(() => {
  console.log('\n');
  testBackendConnectivity();
});
