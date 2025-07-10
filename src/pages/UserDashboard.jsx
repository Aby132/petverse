import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const UserDashboard = () => {
  const [user] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    memberSince: 'January 2024',
    totalOrders: 12,
    favoriteProducts: 5
  });

  const [pets] = useState([
    { id: 1, name: 'Buddy', type: 'Dog', breed: 'Golden Retriever', age: '3 years', image: '🐕' },
    { id: 2, name: 'Whiskers', type: 'Cat', breed: 'Persian', age: '2 years', image: '🐱' },
  ]);

  const [recentOrders] = useState([
    { id: '#001', product: 'Premium Dog Food', date: '2024-01-15', status: 'Delivered', amount: '$25' },
    { id: '#002', product: 'Cat Scratching Post', date: '2024-01-10', status: 'Shipped', amount: '$40' },
    { id: '#003', product: 'Pet Vitamins', date: '2024-01-05', status: 'Processing', amount: '$18' },
  ]);

  const [recommendations] = useState([
    { name: 'Dental Chews for Dogs', price: '$15', image: '🦴', rating: 4.8 },
    { name: 'Interactive Cat Toy', price: '$22', image: '🧸', rating: 4.6 },
    { name: 'Pet Grooming Kit', price: '$35', image: '✂️', rating: 4.9 },
  ]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
            Welcome back, {user.name}! 👋
          </h1>
          <p className="text-gray-600">Here's what's happening with your pets and orders today.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-primary-100 p-3 rounded-lg">
                <span className="text-2xl">🐾</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">My Pets</p>
                <p className="text-2xl font-bold text-gray-900">{pets.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-secondary-100 p-3 rounded-lg">
                <span className="text-2xl">📦</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{user.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="bg-accent-100 p-3 rounded-lg">
                <span className="text-2xl">❤️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Favorites</p>
                <p className="text-2xl font-bold text-gray-900">{user.favoriteProducts}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* My Pets */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">My Pets</h2>
                  <button className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
                    + Add Pet
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pets.map((pet) => (
                    <div key={pet.id} className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-lg p-6">
                      <div className="flex items-center mb-4">
                        <span className="text-4xl mr-4">{pet.image}</span>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{pet.name}</h3>
                          <p className="text-sm text-gray-600">{pet.breed}</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Type:</span> {pet.type}</p>
                        <p><span className="font-medium">Age:</span> {pet.age}</p>
                      </div>
                      <button className="mt-4 w-full bg-white hover:bg-gray-50 text-gray-900 py-2 px-4 rounded-lg font-medium transition-colors border border-gray-200">
                        View Profile
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{order.product}</p>
                        <p className="text-sm text-gray-600">Order {order.id} • {order.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{order.amount}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                          order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/orders" className="block w-full mt-4 text-center text-primary-600 hover:text-primary-700 font-medium transition-colors">
                  View All Orders →
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <Link to="/chatbot" className="flex items-center p-3 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors">
                    <span className="text-2xl mr-3">🤖</span>
                    <span className="font-medium text-gray-900">Ask Pet Expert</span>
                  </Link>
                  <Link to="/store" className="flex items-center p-3 bg-secondary-50 hover:bg-secondary-100 rounded-lg transition-colors">
                    <span className="text-2xl mr-3">🛒</span>
                    <span className="font-medium text-gray-900">Shop Products</span>
                  </Link>
                  <button className="flex items-center w-full p-3 bg-accent-50 hover:bg-accent-100 rounded-lg transition-colors">
                    <span className="text-2xl mr-3">📅</span>
                    <span className="font-medium text-gray-900">Schedule Vet Visit</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Recommended for You</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recommendations.map((product, idx) => (
                    <div key={idx} className="flex items-center space-x-3">
                      <span className="text-2xl">{product.image}</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-primary-600 font-semibold">{product.price}</span>
                          <div className="flex items-center">
                            <span className="text-yellow-400 text-sm">⭐</span>
                            <span className="text-xs text-gray-600 ml-1">{product.rating}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/store" className="block w-full mt-4 text-center text-primary-600 hover:text-primary-700 font-medium transition-colors">
                  View More →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;