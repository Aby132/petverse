

class ProductService {
  constructor() {
    // Your API Gateway base URL
    this.apiBaseUrl = 'https://ykqbrht440.execute-api.us-east-1.amazonaws.com/prod';
    
    // Default headers for API requests
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Make API request with error handling
   */
  async makeApiRequest(endpoint, options = {}) {
    try {
      const url = `${this.apiBaseUrl}${endpoint}`;
      const config = {
        headers: this.defaultHeaders,
        ...options
      };

      console.log(`🔄 Making API request to: ${url}`, config);

      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API response:`, data);
      return data;
    } catch (error) {
      console.error(`❌ API request error:`, error);
      throw error;
    }
  }

  /**
   * Get all products
   */
  async getAllProducts() {
    try {
      console.log('📦 Fetching all products...');
      const products = await this.makeApiRequest('/products', {
        method: 'GET'
      });
      
      // Ensure we return an array
      return Array.isArray(products) ? products : [];
    } catch (error) {
      console.error('Failed to fetch products:', error);
      // Return empty array on error to prevent crashes
      return [];
    }
  }

  /**
   * Get single product by ID
   */
  async getProduct(productId) {
    try {
      console.log(`📦 Fetching product: ${productId}`);
      return await this.makeApiRequest(`/products/${productId}`, {
        method: 'GET'
      });
    } catch (error) {
      console.error(`Failed to fetch product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Create new product
   */
  async createProduct(productData) {
    try {
      console.log('📦 Creating new product:', productData);
      
      // Generate a unique product ID if not provided
      if (!productData.productId) {
        productData.productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Ensure required fields
      const product = {
        productId: productData.productId,
        name: productData.name,
        description: productData.description,
        price: parseFloat(productData.price),
        category: productData.category,
        stock: parseInt(productData.stock) || 0,
        brand: productData.brand || '',
        weight: productData.weight || '',
        isFeatured: productData.isFeatured || false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return await this.makeApiRequest('/products', {
        method: 'POST',
        body: JSON.stringify(product)
      });
    } catch (error) {
      console.error('Failed to create product:', error);
      throw error;
    }
  }

  /**
   * Update existing product
   */
  async updateProduct(productId, productData) {
    try {
      console.log(`📦 Updating product: ${productId}`, productData);
      
      // Get existing product first
      const existingProduct = await this.getProduct(productId);
      
      // Merge with existing data
      const updatedProduct = {
        ...existingProduct,
        ...productData,
        productId: productId, // Ensure ID doesn't change
        updatedAt: new Date().toISOString()
      };

      return await this.makeApiRequest(`/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(updatedProduct)
      });
    } catch (error) {
      console.error(`Failed to update product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(productId) {
    try {
      console.log(`📦 Deleting product: ${productId}`);
      return await this.makeApiRequest(`/products/${productId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error(`Failed to delete product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Upload single image to S3
   */
  async uploadImage(file) {
    try {
      console.log('📤 Uploading image:', file.name);
      
      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      
      const uploadData = {
        fileName: file.name,
        fileType: file.type,
        fileContent: base64
      };

      const result = await this.makeApiRequest('/upload', {
        method: 'POST',
        body: JSON.stringify(uploadData)
      });

      console.log('✅ Image uploaded successfully:', result.imageUrl);
      return result.imageUrl;
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw error;
    }
  }

  /**
   * Upload multiple images to S3
   */
  async uploadMultipleImages(files, productId = null) {
    try {
      console.log(`📤 Uploading ${files.length} images...`);
      
      const uploadPromises = files.map(async (file, index) => {
        try {
          const imageUrl = await this.uploadImage(file);
          return {
            imageUrl: imageUrl,
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            order: index
          };
        } catch (error) {
          console.error(`Failed to upload image ${file.name}:`, error);
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(result => result !== null);
      
      console.log(`✅ Successfully uploaded ${successfulUploads.length}/${files.length} images`);
      return successfulUploads;
    } catch (error) {
      console.error('Failed to upload multiple images:', error);
      throw error;
    }
  }

  /**
   * Convert file to base64
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      console.log('🔄 Testing API connection...');
      const response = await this.makeApiRequest('/products', {
        method: 'GET'
      });
      console.log('✅ API connection successful:', response);
      return { 
        success: true, 
        message: 'API connection successful', 
        data: response 
      };
    } catch (error) {
      console.error('❌ API connection failed:', error);
      return { 
        success: false, 
        message: `API connection failed: ${error.message}`,
        fallback: 'Using mock data for development'
      };
    }
  }

  /**
   * Get mock products for development/fallback
   */
  getMockProducts() {
    return [
      {
        productId: 'mock_1',
        name: 'Premium Dog Food',
        description: 'High-quality nutrition for your beloved dog',
        price: 25,
        category: 'food',
        stock: 50,
        brand: 'PetCare',
        weight: '5kg',
        isFeatured: true,
        isActive: true,
        images: [
          {
            imageUrl: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=400&h=400',
            originalName: 'dog-food.jpg',
            uploadedAt: new Date().toISOString(),
            order: 0
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        productId: 'mock_2',
        name: 'Cat Scratching Post',
        description: 'Keep your cat entertained and your furniture safe',
        price: 40,
        category: 'accessories',
        stock: 30,
        brand: 'CatComfort',
        weight: '',
        isFeatured: false,
        isActive: true,
        images: [
          {
            imageUrl: 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?auto=format&fit=crop&w=400&h=400',
            originalName: 'scratching-post.jpg',
            uploadedAt: new Date().toISOString(),
            order: 0
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
}

// Create and export a singleton instance
const productService = new ProductService();
export default productService; 