import React, { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';

const AdminProducts = () => {
  const [products] = useState([
    { id: 1, name: 'Premium Dog Food', category: 'Food', price: '$25.99', stock: 150, status: 'Active' },
    { id: 2, name: 'Cat Scratching Post', category: 'Toys', price: '$39.99', stock: 45, status: 'Active' },
    { id: 3, name: 'Bird Cage Large', category: 'Housing', price: '$89.99', stock: 12, status: 'Low Stock' },
    { id: 4, name: 'Fish Tank Filter', category: 'Accessories', price: '$19.99', stock: 0, status: 'Out of Stock' },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Products Management</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage your store inventory and product catalog</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center sm:justify-start"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <span className="text-lg sm:text-2xl">📦</span>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Products</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">247</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Stock</p>
                <p className="text-2xl font-bold text-gray-900">189</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900">23</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-red-100 p-3 rounded-lg">
                <span className="text-2xl">❌</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-gray-900">35</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option>All Categories</option>
              <option>Food</option>
              <option>Toys</option>
              <option>Housing</option>
              <option>Accessories</option>
            </select>

            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option>All Status</option>
              <option>Active</option>
              <option>Low Stock</option>
              <option>Out of Stock</option>
            </select>

            <input
              type="text"
              placeholder="Search products..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-0"
            />

            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap">
              Export
            </button>
          </div>
        </div>

        {/* Products Table */}
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
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="py-4 px-3 sm:px-6">
                      <div className="flex items-center">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                          <span className="text-sm sm:text-lg">📦</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{product.name}</p>
                          <p className="text-xs sm:text-sm text-gray-500 sm:hidden">ID: {product.id}</p>
                          <p className="text-xs sm:hidden text-gray-500">{product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 sm:px-6 text-sm text-gray-900 hidden sm:table-cell">{product.category}</td>
                    <td className="py-4 px-3 sm:px-6 text-sm font-medium text-gray-900">{product.price}</td>
                    <td className="py-4 px-3 sm:px-6 text-sm text-gray-900 hidden md:table-cell">{product.stock}</td>
                    <td className="py-4 px-3 sm:px-6">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        product.status === 'Active' ? 'bg-green-100 text-green-800' :
                        product.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        <span className="hidden sm:inline">{product.status}</span>
                        <span className="sm:hidden">
                          {product.status === 'Active' ? '✅' :
                           product.status === 'Low Stock' ? '⚠️' : '❌'}
                        </span>
                      </span>
                    </td>
                    <td className="py-4 px-3 sm:px-6">
                      <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-1 sm:space-y-0">
                        <button className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm">Edit</button>
                        <button className="text-red-600 hover:text-red-800 text-xs sm:text-sm">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">Showing 1 to 4 of 247 products</p>
          <div className="flex justify-center space-x-1 sm:space-x-2">
            <button className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm hover:bg-gray-50">Prev</button>
            <button className="px-2 sm:px-3 py-2 bg-primary-600 text-white rounded-lg text-xs sm:text-sm">1</button>
            <button className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm hover:bg-gray-50 hidden sm:inline-block">2</button>
            <button className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm hover:bg-gray-50 hidden sm:inline-block">3</button>
            <button className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm hover:bg-gray-50">Next</button>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add New Product</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Product Name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option>Select Category</option>
                <option>Food</option>
                <option>Toys</option>
                <option>Housing</option>
                <option>Accessories</option>
              </select>
              <input
                type="number"
                placeholder="Price"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="number"
                placeholder="Stock Quantity"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <textarea
                placeholder="Description"
                rows="3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              ></textarea>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminProducts;
