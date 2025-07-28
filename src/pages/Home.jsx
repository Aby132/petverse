import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const featuredAnimals = [
  {
    name: 'Dog',
    img: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=400&h=400',
    desc: 'Loyal, playful, and loving companions perfect for families.',
    icon: '🐕'
  },
  {
    name: 'Cat',
    img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&h=400',
    desc: 'Independent, curious, and affectionate feline friends.',
    icon: '🐱'
  },
  {
    name: 'Parrot',
    img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&h=400',
    desc: 'Colorful, intelligent, and talkative feathered companions.',
    icon: '🦜'
  },
];

const products = [
  {
    name: 'Premium Dog Food',
    price: '$25',
    img: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=400&h=400',
    rating: 4.8,
    reviews: 124
  },
  {
    name: 'Cat Scratching Post',
    price: '$40',
    img: 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?auto=format&fit=crop&w=400&h=400',
    rating: 4.6,
    reviews: 89
  },
  {
    name: 'Bird Cage',
    price: '$60',
    img: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=400&h=400',
    rating: 4.9,
    reviews: 67
  },
];

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-primary-700 to-secondary-600 text-white">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">
              Welcome to <span className="text-accent-300">PetVerse</span>
              <span className="inline-block ml-3 animate-bounce-gentle">🐾</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Your one-stop platform for pet care, expert advice, and premium products for your beloved animals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/chatbot">
                <button className="bg-accent-500 hover:bg-accent-600 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg">
                  🤖 Try Pet Care Chatbot
                </button>
              </Link>
              <Link to="/store">
                <button className="bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg">
                  🛍️ Shop Now
                </button>
              </Link>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-6">
            About PetVerse
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            PetVerse is dedicated to making pet care easy and accessible. Get expert advice, shop for quality products,
            and connect with a community of animal lovers—all in one place. We believe every pet deserves the best care possible.
          </p>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💡</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Expert Advice</h3>
              <p className="text-gray-600">Get professional tips and guidance from veterinarians and pet care experts.</p>
            </div>
            <div className="text-center">
              <div className="bg-secondary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🛒</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Quality Products</h3>
              <p className="text-gray-600">Shop premium pet supplies, food, and accessories from trusted brands.</p>
            </div>
            <div className="text-center">
              <div className="bg-accent-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Community</h3>
              <p className="text-gray-600">Connect with fellow pet lovers and share experiences and stories.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Animals */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-6">
              Featured Animals
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover amazing companions and learn about different pets that could be perfect for your family.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredAnimals.map((animal, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-slide-up">
                <div className="relative">
                  <img
                    src={animal.img}
                    alt={animal.name}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
                    <span className="text-2xl">{animal.icon}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-display font-bold text-gray-900 mb-3">{animal.name}</h3>
                  <p className="text-gray-600 leading-relaxed">{animal.desc}</p>
                  <button className="mt-4 text-primary-600 hover:text-primary-700 font-semibold transition-colors">
                    Learn More →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products for Sale */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-6">
              Featured Products
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover our handpicked selection of premium pet products, carefully chosen for quality and value.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {products.map((product, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                <div className="relative">
                  <img
                    src={product.img}
                    alt={product.name}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-accent-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Best Seller
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-display font-bold text-gray-900 mb-2">{product.name}</h3>
                  <div className="flex items-center mb-3">
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
                    <span className="text-2xl font-bold text-primary-600">{product.price}</span>
                    <button className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-full font-semibold transition-all duration-300 transform hover:scale-105">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/store">
              <button className="bg-secondary-500 hover:bg-secondary-600 text-white px-8 py-3 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105">
                View All Products
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Discover Nearby Services */}
      <section className="py-20 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-6">
              Find Nearby Pet Services 🗺️
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover trusted veterinarians, grooming salons, pet boarding, and training facilities in your area.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-5xl mb-4 text-center">🏥</div>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-3 text-center">Veterinary Clinics</h3>
              <p className="text-gray-600 text-center mb-4">Find qualified veterinarians for regular checkups, emergencies, and specialized care.</p>
              <div className="text-center">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">24/7 Emergency Care</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-5xl mb-4 text-center">✂️</div>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-3 text-center">Grooming Salons</h3>
              <p className="text-gray-600 text-center mb-4">Professional grooming services to keep your pets clean, healthy, and looking their best.</p>
              <div className="text-center">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">Full Service Grooming</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-5xl mb-4 text-center">🏠</div>
              <h3 className="text-xl font-display font-bold text-gray-900 mb-3 text-center">Pet Boarding</h3>
              <p className="text-gray-600 text-center mb-4">Safe and comfortable boarding facilities for when you're away from home.</p>
              <div className="text-center">
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">Trusted Care</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link to="/discover">
              <button className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg">
                🗺️ Discover Services Near You
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Chatbot */}
      <section className="py-20 bg-gradient-to-r from-secondary-500 to-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="text-6xl mb-6">🤖</div>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
              Meet Your AI Pet Care Assistant
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Need instant advice? Our AI-powered chatbot is here to help you with pet care tips,
              product recommendations, health guidance, and more—available 24/7!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white bg-opacity-10 rounded-lg p-6">
                <div className="text-3xl mb-3">💬</div>
                <h3 className="font-semibold mb-2">Instant Answers</h3>
                <p className="text-sm text-blue-100">Get immediate responses to your pet care questions</p>
              </div>
              <div className="bg-white bg-opacity-10 rounded-lg p-6">
                <div className="text-3xl mb-3">🏥</div>
                <h3 className="font-semibold mb-2">Health Guidance</h3>
                <p className="text-sm text-blue-100">Receive expert advice on pet health and wellness</p>
              </div>
              <div className="bg-white bg-opacity-10 rounded-lg p-6">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="font-semibold mb-2">Personalized Tips</h3>
                <p className="text-sm text-blue-100">Get customized recommendations for your specific pet</p>
              </div>
            </div>
            <Link to="/chatbot">
              <button className="bg-accent-500 hover:bg-accent-600 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg">
                Start Chatting Now
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 text-2xl font-display font-bold mb-4">
                <span className="text-3xl">🐾</span>
                <span>PetVerse</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                Your trusted companion in pet care. We're dedicated to helping you provide the best care for your beloved animals.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="text-2xl">📘</span>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="text-2xl">🐦</span>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <span className="text-2xl">📷</span>
                </a>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/store" className="hover:text-white transition-colors">Store</Link></li>
                <li><Link to="/chatbot" className="hover:text-white transition-colors">Chatbot</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} PetVerse. All rights reserved. Made with ❤️ for pet lovers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;