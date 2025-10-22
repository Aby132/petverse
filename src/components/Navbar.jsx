import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import cartService from '../services/cartService';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Load cart count from DynamoDB
  useEffect(() => {
    const loadCartCount = async () => {
      try {
        const totalItems = await cartService.getCartCount();
        setCartCount(totalItems);
      } catch (error) {
        console.error('Error loading cart count:', error);
        setCartCount(0);
      }
    };

    loadCartCount();
    
    // Custom event listener for cart updates
    window.addEventListener('cartUpdated', loadCartCount);
    
    return () => {
      window.removeEventListener('cartUpdated', loadCartCount);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      setIsProfileDropdownOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Get user's first name
  const getUserFirstName = () => {
    if (!user) return '';

    // Try to get from attributes first
    if (user.attributes?.given_name) {
      return user.attributes.given_name;
    }

    // Fallback to parsing email
    if (user.attributes?.email) {
      return user.attributes.email.split('@')[0];
    }

    // Final fallback
    return user.username || 'User';
  };

  // Generate profile picture initials
  const getProfileInitials = () => {
    const firstName = getUserFirstName();
    return firstName.charAt(0).toUpperCase();
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
            <span className="text-4xl">🐾</span>
            <span className="font-display">PetVerse</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/about" className="text-gray-700 hover:text-primary-600 px-2 py-1 rounded text-sm font-medium transition-colors flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              About
            </Link>
            <Link to="/store" className="text-gray-700 hover:text-primary-600 px-2 py-1 rounded text-sm font-medium transition-colors flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Store
            </Link>
            <Link to="/animals" className="text-gray-700 hover:text-primary-600 px-2 py-1 rounded text-sm font-medium transition-colors flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Animals
            </Link>
            <Link to="/discover" className="text-gray-700 hover:text-primary-600 px-2 py-1 rounded text-sm font-medium transition-colors flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Discover
            </Link>
            <Link to="/chatbot" className="text-gray-700 hover:text-primary-600 px-2 py-1 rounded text-sm font-medium transition-colors flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              AI Assistant
            </Link>
            <Link 
              to={user ? (userRole === 'admin' ? "/communities" : "/admin/community") : "/login"} 
              className="text-gray-700 hover:text-primary-600 px-2 py-1 rounded text-sm font-medium transition-colors flex items-center"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Communities
            </Link>

            {user ? (
              <>
                {userRole === 'admin' && (
                  <Link to="/admin-dashboard" className="text-gray-700 hover:text-primary-600 px-2 py-1 rounded text-sm font-medium transition-colors flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Dashboard
                  </Link>
                )}

                {/* Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 px-2 py-1 rounded text-sm font-medium transition-colors focus:outline-none"
                  >
                    {/* Profile Picture */}
                    <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium text-xs">
                      {getProfileInitials()}
                    </div>
                    <span className="text-sm">Hi, {getUserFirstName()}</span>
                    <svg className={`w-3 h-3 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                        <p className="font-medium">{getUserFirstName()}</p>
                        <p className="text-gray-500 text-xs">{user.attributes?.email}</p>
                      </div>

                      {userRole === 'user' && (
                        <Link
                          to="/user-dashboard"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          onClick={() => setIsProfileDropdownOpen(false)}
                        >
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Manage Account
                          </span>
                        </Link>
                      )}

                      <Link
                        to="/orders"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          My Orders
                        </span>
                      </Link>

                      <Link
                        to={userRole === 'admin' ? "/communities" : "/admin/community"}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Communities
                        </span>
                      </Link>

                                             <Link
                         to="/cart"
                         className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                         onClick={() => setIsProfileDropdownOpen(false)}
                       >
                         <span className="flex items-center">
                           <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10a2 2 0 001.9-1.37L21 6H5.4M7 13l-2 6h12M7 13l-2-6M9 21a1 1 0 100-2 1 1 0 000 2m8 1a1 1 0 100-2 1 1 0 000 2" />
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4h4m-2-2v4" />
                           </svg>
                           Cart ({cartCount} items)
                         </span>
                       </Link>

                      <Link
                        to="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          Settings
                        </span>
                      </Link>

                      <div className="border-t border-gray-100 mt-1">
                        <button
                          onClick={handleSignOut}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign Out
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/login" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1 rounded text-sm font-medium transition-colors">
                Login / Register
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-primary-600 focus:outline-none focus:text-primary-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 rounded-lg mt-2">
              <Link to="/about" className="text-gray-700 hover:text-primary-600 block px-2 py-1 rounded text-sm font-medium transition-colors">
                About Us
              </Link>
              <Link to="/store" className="text-gray-700 hover:text-primary-600 block px-2 py-1 rounded text-sm font-medium transition-colors">
                Store
              </Link>
              <Link to="/animals" className="text-gray-700 hover:text-primary-600 block px-2 py-1 rounded text-sm font-medium transition-colors">
                Animals
              </Link>
              <Link to="/discover" className="text-gray-700 hover:text-primary-600 block px-2 py-1 rounded text-sm font-medium transition-colors">
                Discover
              </Link>
              <Link to="/chatbot" className="text-gray-700 hover:text-primary-600 block px-2 py-1 rounded text-sm font-medium transition-colors">
                AI Assistant
              </Link>
              <Link 
                to={user ? (userRole === 'admin' ? "/communities" : "/admin/community") : "/login"} 
                className="text-gray-700 hover:text-primary-600 block px-2 py-1 rounded text-sm font-medium transition-colors"
              >
                Communities
              </Link>

              {user ? (
                <>
                  {/* Mobile Profile Section */}
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <div className="flex items-center px-3 py-2">
                      <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium">
                        {getProfileInitials()}
                      </div>
                      <div className="ml-3">
                        <p className="text-base font-medium text-gray-700">Hi, {getUserFirstName()}</p>
                        <p className="text-sm text-gray-500">{user.attributes?.email}</p>
                      </div>
                    </div>
                  </div>

                  {userRole === 'admin' && (
                    <Link to="/admin-dashboard" className="text-gray-700 hover:text-primary-600 block px-2 py-1 rounded text-sm font-medium transition-colors">
                      Dashboard
                    </Link>
                  )}

                  {userRole === 'user' && (
                    <Link to="/user-dashboard" className="text-gray-700 hover:text-primary-600 block px-2 py-1 rounded text-sm font-medium transition-colors">
                      Manage Account
                    </Link>
                  )}

                  <Link to="/orders" className="text-gray-700 hover:text-primary-600 block px-2 py-1 rounded text-sm font-medium transition-colors">
                    My Orders
                  </Link>

                  <Link to="/cart" className="text-gray-700 hover:text-primary-600 block px-2 py-1 rounded text-sm font-medium transition-colors">
                    Cart ({cartCount} items)
                  </Link>

                  <Link to="/settings" className="text-gray-700 hover:text-primary-600 block px-2 py-1 rounded text-sm font-medium transition-colors">
                    Settings
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="bg-red-600 hover:bg-red-700 text-white block w-full text-left px-2 py-1 rounded text-sm font-medium transition-colors mt-2"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link to="/login" className="bg-primary-600 hover:bg-primary-700 text-white block px-2 py-1 rounded text-sm font-medium transition-colors">
                  Login / Register
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;