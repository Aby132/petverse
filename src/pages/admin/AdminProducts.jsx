import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import productService from '../../services/productService';



const AdminProducts = () => {
  const { user, isAdmin } = useAuth();
  const [products, setProducts] = useState([]); // Initialize as empty array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removedImages, setRemovedImages] = useState([]);

  // Pet product categories
  const petCategories = [
    { value: 'food', label: 'Food & Treats', hasWeight: true },
    { value: 'toys', label: 'Toys & Entertainment', hasWeight: false },
    { value: 'accessories', label: 'Accessories & Clothing', hasWeight: false },
    { value: 'health', label: 'Health & Wellness', hasWeight: false },
    { value: 'grooming', label: 'Grooming & Care', hasWeight: false },
    { value: 'housing', label: 'Housing & Bedding', hasWeight: false },
    { value: 'training', label: 'Training & Behavior', hasWeight: false },
    { value: 'travel', label: 'Travel & Carriers', hasWeight: false }
  ];

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      window.location.href = '/';
      return;
    }
  }, [isAdmin]);

  // Load products on component mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const productsData = await productService.getAllProducts();
      // Ensure we always have a valid array
      setProducts(Array.isArray(productsData) ? productsData : []);
      setError('');
    } catch (err) {
      setError('Failed to load products: ' + err.message);
      console.error('Error loading products:', err);
      // Set empty array on error to prevent undefined issues
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await productService.deleteProduct(productId);
      setProducts(products.filter(p => p.productId !== productId));
    } catch (err) {
      setError('Failed to delete product: ' + err.message);
    }
  };

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setError('Some files were skipped. Only image files under 10MB are allowed.');
    }

    setSelectedImages(prev => [...prev, ...validFiles]);
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (productId) => {
    if (selectedImages.length === 0) return [];

    setUploadingImages(true);
    try {
      const uploadedImages = await productService.uploadMultipleImages(selectedImages, productId);
      return uploadedImages;
    } catch (error) {
      console.error('Error uploading images:', error);
      setError('Failed to upload some images: ' + error.message);
      return [];
    } finally {
      setUploadingImages(false);
    }
  };

  const handleFormSubmit = async (productData) => {
    try {
      setIsSubmitting(true);
      let updatedProduct;

      if (editingProduct) {
        // productData already includes current images from editingProduct state
        let allImages = [...(productData.images || [])];

        // Upload new images if any
        if (selectedImages.length > 0) {
          const uploadedImages = await uploadImages(editingProduct.productId);
          allImages = [...allImages, ...uploadedImages];
        }

        // Update product with all images (current + new)
        const productDataWithImages = {
          ...productData,
          images: allImages
        };

        console.log('Updating product with images:', productDataWithImages);

        updatedProduct = await productService.updateProduct(editingProduct.productId, productDataWithImages);
        console.log('Product updated successfully:', updatedProduct);

        // Reload the product from database to ensure we have the latest data
        const reloadedProduct = await productService.getProduct(editingProduct.productId);
        console.log('Reloaded product from database:', reloadedProduct);
        
        setProducts(products.map(p =>
          p.productId === editingProduct.productId ? reloadedProduct : p
        ));
      } else {
        // Create new product
        updatedProduct = await productService.createProduct(productData);

        // Upload images after product creation
        if (selectedImages.length > 0) {
          const uploadedImages = await uploadImages(updatedProduct.productId);
          updatedProduct.images = uploadedImages;

          // Update product with image URLs
          await productService.updateProduct(updatedProduct.productId, {
            images: uploadedImages
          });
        }

        setProducts([...products, updatedProduct]);
      }

      setShowForm(false);
      setEditingProduct(null);
      setSelectedImages([]);
      setSelectedCategory('');
      setRemovedImages([]);
      setError('');
    } catch (err) {
      setError('Failed to save product: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
    setSelectedImages([]);
    setSelectedCategory('');
    setRemovedImages([]);
  };

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    // Safety check to ensure product exists
    if (!product) {
      return false;
    }

    // Search filter - check name, description, brand, and category
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch = searchTerm === '' || 
      (product.name && product.name.toLowerCase().includes(searchLower)) ||
      (product.description && product.description.toLowerCase().includes(searchLower)) ||
      (product.brand && product.brand.toLowerCase().includes(searchLower)) ||
      (product.category && product.category.toLowerCase().includes(searchLower));

    // Category filter
    const matchesCategory = filterCategory === 'all' || 
      (product.category && product.category === filterCategory);

    return matchesSearch && matchesCategory;
  });

  // Get unique categories for filter dropdown
  const categories = [...new Set(products
    .filter(p => p && p.category && p.category.trim() !== '')
    .map(p => p.category)
    .sort()
  )];

  // Get filter statistics
  const totalProducts = products.length;
  const filteredCount = filteredProducts.length;
  const hasFilters = searchTerm.trim() !== '' || filterCategory !== 'all';

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">


        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Product Management</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage your pet store products</p>
          </div>
          <button
            onClick={handleCreateProduct}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Product
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Products
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, description, brand, or category..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterCategory('all');
                }}
                disabled={!hasFilters}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
          
          {/* Filter Results Summary */}
          {hasFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {filteredCount} of {totalProducts} products
                  {searchTerm.trim() !== '' && (
                    <span className="ml-2">
                      • Search: "{searchTerm}"
                    </span>
                  )}
                  {filterCategory !== 'all' && (
                    <span className="ml-2">
                      • Category: {filterCategory.charAt(0).toUpperCase() + filterCategory.slice(1)}
                    </span>
                  )}
                </span>
                <span className="text-blue-600 font-medium">
                  {filteredCount === 0 ? 'No results found' : `${Math.round((filteredCount / totalProducts) * 100)}% of products`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Products List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-3 sm:px-6 text-sm font-medium text-gray-900">Product</th>
                    <th className="text-left py-3 px-3 sm:px-6 text-sm font-medium text-gray-900 hidden sm:table-cell">Category</th>
                    <th className="text-left py-3 px-3 sm:px-6 text-sm font-medium text-gray-900">Price</th>
                    <th className="text-left py-3 px-3 sm:px-6 text-sm font-medium text-gray-900 hidden md:table-cell">Stock</th>
                    <th className="text-left py-3 px-3 sm:px-6 text-sm font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-3 sm:px-6 text-sm font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.productId} className="hover:bg-gray-50">
                      <td className="py-4 px-3 sm:px-6">
                        <div className="flex items-center">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0 overflow-hidden">
                            {product.images && product.images.length > 0 ? (
                              <img 
                                src={product.images[0].imageUrl} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <span className="text-sm sm:text-lg" style={{ display: product.images && product.images.length > 0 ? 'none' : 'flex' }}>
                              📦
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{product.name}</p>
                            <p className="text-xs sm:text-sm text-gray-500 truncate">{product.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3 sm:px-6 text-sm text-gray-900 hidden sm:table-cell capitalize">{product.category}</td>
                      <td className="py-4 px-3 sm:px-6 text-sm font-medium text-gray-900">₹{product.price}</td>
                      <td className="py-4 px-3 sm:px-6 text-sm text-gray-900 hidden md:table-cell">{product.stock}</td>
                      <td className="py-4 px-3 sm:px-6">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          product.isActive && product.stock > 10 ? 'bg-green-100 text-green-800' :
                          product.isActive && product.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {product.isActive && product.stock > 10 ? 'In Stock' :
                           product.isActive && product.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="py-4 px-3 sm:px-6">
                        <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-1 sm:space-y-0">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.productId)}
                            className="text-red-600 hover:text-red-800 text-xs sm:text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {hasFilters ? 'No products match your filters' : 'No products found'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {hasFilters 
                ? 'Try adjusting your search terms or category filter to find what you\'re looking for.'
                : 'Get started by creating your first product.'
              }
            </p>
            {hasFilters ? (
              <div className="mt-6">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterCategory('all');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="mt-6">
                <button
                  onClick={handleCreateProduct}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Product
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            {/* Loading Overlay */}
            {isSubmitting && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                <div className="text-center">
                  <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-lg font-medium text-gray-900">
                    {editingProduct ? 'Updating Product...' : 'Creating Product...'}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Please wait while we save your product and upload images...
                  </p>
                </div>
              </div>
            )}
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button
                  onClick={handleFormCancel}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const productData = {
                  name: formData.get('name'),
                  description: formData.get('description'),
                  price: parseFloat(formData.get('price')),
                  category: formData.get('category'),
                  stock: parseInt(formData.get('stock')),
                  brand: formData.get('brand'),
                  weight: formData.get('weight'),
                  isFeatured: formData.get('isFeatured') === 'on'
                };
                
                // Include current images from editingProduct state if editing
                if (editingProduct) {
                  productData.images = editingProduct.images || [];
                }
                
                console.log('Form submission - productData:', productData);
                handleFormSubmit(productData);
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name*
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      defaultValue={editingProduct?.name || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category*
                    </label>
                    <select
                      name="category"
                      required
                      value={selectedCategory || editingProduct?.category || ''}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled>Select a category</option>
                      {petCategories.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price (₹)*
                    </label>
                    <input
                      type="number"
                      name="price"
                      required
                      min="1"
                      step="1"
                      defaultValue={editingProduct?.price || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock*
                    </label>
                    <input
                      type="number"
                      name="stock"
                      required
                      min="0"
                      defaultValue={editingProduct?.stock || '0'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand
                    </label>
                    <input
                      type="text"
                      name="brand"
                      defaultValue={editingProduct?.brand || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Conditional Weight Field - Only show for Food category */}
                  {(selectedCategory === 'food' || (!selectedCategory && editingProduct?.category === 'food')) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Weight*
                      </label>
                      <input
                        type="text"
                        name="weight"
                        required
                        placeholder="e.g., 500g, 1kg, 5kg"
                        defaultValue={editingProduct?.weight || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description*
                    </label>
                    <textarea
                      name="description"
                      required
                      rows="4"
                      defaultValue={editingProduct?.description || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    ></textarea>
                  </div>

                  {/* Image Upload Section */}
                  <div className="md:col-span-2 mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Images
                      {uploadingImages && (
                        <span className="ml-2 inline-flex items-center text-blue-600">
                          <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading images...
                        </span>
                      )}
                    </label>

                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                            <span>Upload images</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              multiple
                              accept="image/*"
                              className="sr-only"
                              onChange={handleImageSelect}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF up to 10MB each
                        </p>
                      </div>
                    </div>

                    {/* Selected Images Preview */}
                    {selectedImages.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Images ({selectedImages.length}):</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {selectedImages.map((image, index) => (
                            <div key={index} className="relative group">
                              <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200">
                                <img
                                  src={URL.createObjectURL(image)}
                                  alt={`Preview ${index}`}
                                  className="h-24 w-full object-cover object-center rounded-lg"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                              <p className="mt-1 text-xs text-gray-500 truncate">{image.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Existing Images (for edit mode) */}
                    {editingProduct?.images && editingProduct.images.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Existing Images ({editingProduct.images.length}):</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {editingProduct.images.map((image, index) => (
                            <div key={index} className="relative group">
                              <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200">
                                <img
                                  src={image.imageUrl}
                                  alt={`Product ${index}`}
                                  className="h-24 w-full object-cover object-center rounded-lg"
                                  onError={(e) => {
                                    e.target.src = 'https://via.placeholder.com/150x150/cccccc/666666?text=Image+Error';
                                  }}
                                />
                              </div>
                              <p className="mt-1 text-xs text-gray-500 truncate">{image.originalName || 'Image ' + (index + 1)}</p>
                              <button
                                type="button"
                                onClick={() => {
                                  // Remove image from existing images
                                  const imageToRemove = editingProduct.images[index];
                                  const updatedImages = editingProduct.images.filter((_, i) => i !== index);
                                  
                                  console.log('Removing image:', imageToRemove);
                                  console.log('Updated images array:', updatedImages);
                                  
                                  // Track removed images for potential cleanup
                                  setRemovedImages(prev => [...prev, imageToRemove]);
                                  
                                  setEditingProduct({
                                    ...editingProduct,
                                    images: updatedImages
                                  });
                                }}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isFeatured"
                        id="isFeatured"
                        defaultChecked={editingProduct?.isFeatured || false}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isFeatured" className="ml-2 block text-sm text-gray-900">
                        Featured Product
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleFormCancel}
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {editingProduct ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingProduct ? 'Update Product' : 'Create Product'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminProducts;
