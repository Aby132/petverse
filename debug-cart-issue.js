// Debug script to help identify why products aren't being added to DynamoDB
// Run this in your browser console

console.log('🔍 Debugging Cart DynamoDB Integration...');

// Test 1: Check localStorage for Cognito data
console.log('\n1. Checking localStorage for Cognito data...');
const localStorageKeys = Object.keys(localStorage);
const cognitoKeys = localStorageKeys.filter(key => key.includes('CognitoIdentityServiceProvider'));
console.log('Cognito keys found:', cognitoKeys);

if (cognitoKeys.length > 0) {
  console.log('✅ Cognito data found in localStorage');
  cognitoKeys.forEach(key => {
    console.log(`  ${key}:`, localStorage.getItem(key));
  });
} else {
  console.log('❌ No Cognito data found in localStorage');
}

// Test 2: Check localStorage for user data
console.log('\n2. Checking localStorage for user data...');
console.log('All localStorage keys:', localStorageKeys);

// Check for user-related keys
const userKeys = localStorageKeys.filter(key => 
  key.includes('user') || key.includes('User') || key.includes('auth') || key.includes('Auth')
);
console.log('User/Auth keys found:', userKeys);

// Check for user object
const userData = localStorage.getItem('user');
if (userData) {
  try {
    const user = JSON.parse(userData);
    console.log('User object found:', user);
  } catch (e) {
    console.log('User data found but not valid JSON:', userData);
  }
} else {
  console.log('No user object found in localStorage');
}

// Test 3: Test getCurrentUserId method
console.log('\n3. Testing getCurrentUserId method...');
try {
  if (typeof cartService !== 'undefined') {
    const userId = cartService.getCurrentUserId();
    console.log('Current User ID:', userId);
    
    if (userId) {
      console.log('✅ User ID found');
    } else {
      console.log('❌ No User ID found - this is likely the issue!');
    }
  } else {
    console.log('❌ cartService is not available');
  }
} catch (error) {
  console.log('❌ Error getting user ID:', error);
}

// Test 4: Test backend connectivity
console.log('\n4. Testing backend connectivity...');
async function testBackend() {
  try {
    const API_BASE_URL = 'https://v1o5fpndre.execute-api.us-east-1.amazonaws.com/prod';
    const response = await fetch(`${API_BASE_URL}/cart?userId=test-user`);
    console.log('Backend response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is accessible:', data);
    } else {
      const errorText = await response.text();
      console.log('❌ Backend error:', response.status, errorText);
    }
  } catch (error) {
    console.log('❌ Backend connectivity error:', error);
  }
}

testBackend();

// Test 5: Test adding a product to cart
console.log('\n5. Testing addToCart with debug info...');
async function testAddToCart() {
  try {
    if (typeof cartService !== 'undefined') {
      const mockProduct = {
        productId: 'debug-test-123',
        name: 'Debug Test Product',
        price: 19.99,
        brand: 'Debug Brand',
        stock: 5,
        category: 'debug'
      };
      
      console.log('Adding mock product to cart...');
      const result = await cartService.addToCart(mockProduct, 1);
      console.log('Add to cart result:', result);
    } else {
      console.log('❌ cartService is not available');
    }
  } catch (error) {
    console.log('❌ Error testing addToCart:', error);
  }
}

testAddToCart();

console.log('\n🎯 Debug Summary:');
console.log('If you see "No User ID found", that\'s likely the issue.');
console.log('The cart service needs a valid user ID to sync with DynamoDB.');
console.log('Make sure you are logged in and have user data in localStorage.');
