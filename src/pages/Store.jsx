import React, { useState } from 'react';

const Store = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { id: 'all', name: 'All Products', icon: '🛍️' },
    { id: 'food', name: 'Food & Treats', icon: '🍖' },
    { id: 'toys', name: 'Toys', icon: '🧸' },
    { id: 'health', name: 'Health & Care', icon: '💊' },
    { id: 'accessories', name: 'Accessories', icon: '🎀' },
  ];

  const products = [
    {
      id: 1,
      name: 'Premium Dog Food',
      price: 25,
      category: 'food',
      image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=400&h=400',
      rating: 4.8,
      reviews: 124,
      description: 'High-quality nutrition for your beloved dog'
    },
    {
      id: 2,
      name: 'Cat Scratching Post',
      price: 40,
      category: 'accessories',
      image: 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?auto=format&fit=crop&w=400&h=400',
      rating: 4.6,
      reviews: 89,
      description: 'Keep your cat entertained and your furniture safe'
    },
    {
      id: 3,
      name: 'Bird Cage',
      price: 60,
      category: 'accessories',
      image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=400&h=400',
      rating: 4.9,
      reviews: 67,
      description: 'Spacious and comfortable home for your feathered friend'
    },
    {
      id: 4,
      name: 'Interactive Dog Toy',
      price: 18,
      category: 'toys',
      image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=400&h=400',
      rating: 4.7,
      reviews: 156,
      description: 'Keep your dog mentally stimulated and active'
    },
    {
      id: 5,
      name: 'Pet Vitamins',
      price: 22,
      category: 'health',
      image: 'https://images.unsplash.com/photo-1559181567-c3190ca9959b?auto=format&fit=crop&w=400&h=400',
      rating: 4.5,
      reviews: 93,
      description: 'Essential vitamins for your pet\'s health'
    },
    {
      id: 6,
      name: 'Cat Treats',
      price: 12,
      category: 'food',
      image: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=400&h=400',
      rating: 4.8,
      reviews: 201,
      description: 'Delicious and healthy treats your cat will love'
    },
  ];

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">
            Pet Store 🛍️
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover premium products for your beloved pets. Quality guaranteed, happiness delivered.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <span className="text-gray-400">🔍</span>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg">
                  <button className="text-red-500 hover:text-red-600 transition-colors">
                    <span className="text-xl">❤️</span>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-display font-bold text-gray-900 mb-2">
                  {product.name}
                </h3>
                <p className="text-gray-600 mb-4">{product.description}</p>
                
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}>
                        ⭐
                      </span>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 ml-2">({product.reviews} reviews)</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary-600">${product.price}</span>
                  <button className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-full font-semibold transition-all duration-300 transform hover:scale-105">
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No products found */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">😔</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria</p>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl p-8 text-white text-center">
          <h2 className="text-3xl font-display font-bold mb-4">Need Help Choosing?</h2>
          <p className="text-xl mb-6 text-blue-100">
            Our AI pet expert is here to help you find the perfect products for your furry friends!
          </p>
          <button className="bg-accent-500 hover:bg-accent-600 text-white px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105">
            🤖 Ask Pet Expert
          </button>
        </div>
      </div>
    </div>
  );
};

export default Store;
