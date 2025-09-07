// Debug script to help identify cart image issues
// Run this in your browser console

console.log('🖼️ Debugging Cart Image Issues...');

// Test 1: Check current cart items
console.log('\n1. Checking current cart items...');
try {
  if (typeof cartService !== 'undefined') {
    const cartItems = await cartService.getCartItems();
    console.log('Current cart items:', cartItems);
    
    cartItems.forEach((item, index) => {
      console.log(`Item ${index + 1}:`, {
        productId: item.productId,
        name: item.name,
        imageUrl: item.imageUrl,
        images: item.images,
        hasImages: !!item.images,
        imagesLength: item.images?.length || 0,
        fullItem: item
      });
    });
  } else {
    console.log('❌ cartService is not available');
  }
} catch (error) {
  console.log('❌ Error getting cart items:', error);
}

// Test 2: Check localStorage cart data
console.log('\n2. Checking localStorage cart data...');
try {
  const cartData = localStorage.getItem('petverse_cart');
  if (cartData) {
    const cart = JSON.parse(cartData);
    console.log('LocalStorage cart:', cart);
    
    cart.forEach((item, index) => {
      console.log(`LocalStorage Item ${index + 1}:`, {
        productId: item.productId,
        name: item.name,
        imageUrl: item.imageUrl,
        images: item.images,
        hasImages: !!item.images,
        imagesLength: item.images?.length || 0
      });
    });
  } else {
    console.log('No cart data in localStorage');
  }
} catch (error) {
  console.log('❌ Error reading localStorage:', error);
}

// Test 3: Test adding a mock product with images
console.log('\n3. Testing addToCart with mock product...');
try {
  if (typeof cartService !== 'undefined') {
    const mockProduct = {
      productId: 'debug-image-test-123',
      name: 'Debug Image Test Product',
      price: 29.99,
      brand: 'Debug Brand',
      stock: 10,
      category: 'debug',
      imageUrl: 'https://placehold.co/300x300?text=Test+Image',
      images: [
        { imageUrl: 'https://placehold.co/300x300?text=Image+1' },
        { imageUrl: 'https://placehold.co/300x300?text=Image+2' }
      ]
    };
    
    console.log('Adding mock product with images...');
    const result = await cartService.addToCart(mockProduct, 1);
    console.log('Add to cart result:', result);
    
    // Check if the item was added with images
    const updatedCart = await cartService.getCartItems();
    const addedItem = updatedCart.find(item => item.productId === 'debug-image-test-123');
    if (addedItem) {
      console.log('✅ Item added successfully:', {
        productId: addedItem.productId,
        name: addedItem.name,
        imageUrl: addedItem.imageUrl,
        images: addedItem.images,
        hasImages: !!addedItem.images,
        imagesLength: addedItem.images?.length || 0
      });
    } else {
      console.log('❌ Item was not added to cart');
    }
  } else {
    console.log('❌ cartService is not available');
  }
} catch (error) {
  console.log('❌ Error testing addToCart:', error);
}

console.log('\n🎯 Debug Summary:');
console.log('1. Check the console logs above to see what image data is available');
console.log('2. Look for items with missing imageUrl or images arrays');
console.log('3. The debug info in the Cart component will show the actual data structure');
console.log('4. If images are missing, the issue is in how products are being added to cart');
