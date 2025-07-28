import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Start closed on mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Handle window resize
  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(true); // Auto-open on desktop
      } else {
        setIsSidebarOpen(false); // Auto-close on mobile
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Get user's first name
  const getUserFirstName = () => {
    if (!user) return 'Admin';
    
    if (user.attributes?.given_name) {
      return user.attributes.given_name;
    }
    
    if (user.attributes?.email) {
      return user.attributes.email.split('@')[0];
    }
    
    return user.username || 'Admin';
  };

  const sidebarItems = [
    {
      title: 'Dashboard',
      icon: '📊',
      path: '/admin-dashboard',
      description: 'Overview & Analytics'
    },
    {
      title: 'Products',
      icon: '🛍️',
      path: '/admin/products',
      description: 'Manage Store Items'
    },
    {
      title: 'Animals',
      icon: '🐾',
      path: '/admin/animals',
      description: 'Pet Management'
    },
    {
      title: 'Service Locations',
      icon: '📍',
      path: '/admin/locations',
      description: 'Add/View Pet Service Locations'
    },
    {
      title: 'Users',
      icon: '👥',
      path: '/admin/users',
      description: 'User Management'
    },
    {
      title: 'Orders',
      icon: '📦',
      path: '/admin/orders',
      description: 'Order Management'
    },
    {
      title: 'Content',
      icon: '📝',
      path: '/admin/content',
      description: 'CMS & Blog'
    },
    {
      title: 'Analytics',
      icon: '📈',
      path: '/admin/analytics',
      description: 'Reports & Insights'
    },
    {
      title: 'Settings',
      icon: '⚙️',
      path: '/admin/settings',
      description: 'System Configuration'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobile ? 'fixed' : 'relative'}
        ${isSidebarOpen ? 'w-64' : isMobile ? 'w-0' : 'w-16'}
        ${isMobile ? 'h-full z-50' : ''}
        bg-white shadow-lg transition-all duration-300 flex flex-col
        ${isMobile && !isSidebarOpen ? 'transform -translate-x-full' : ''}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${!isSidebarOpen && 'justify-center'}`}>
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                🐾
              </div>
              {isSidebarOpen && (
                <div className="ml-3">
                  <h1 className="text-lg font-bold text-gray-900">PetVerse</h1>
                  <p className="text-xs text-gray-500">Admin Panel</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarOpen ? "M11 19l-7-7 7-7M13 5l7 7-7 7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => isMobile && setIsSidebarOpen(false)} // Close sidebar on mobile after click
                className={`flex items-center p-3 rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                {(isSidebarOpen || !isMobile) && (
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 group-hover:text-gray-600 truncate">{item.description}</p>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <div className={`flex items-center ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
              {getUserFirstName().charAt(0).toUpperCase()}
            </div>
            {isSidebarOpen && (
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">{getUserFirstName()}</p>
                <p className="text-xs text-gray-500">{user?.attributes?.email}</p>
              </div>
            )}
          </div>
          
          {isSidebarOpen && (
            <div className="mt-3 space-y-1">
              <Link
                to="/admin/profile"
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile Header */}
        {isMobile && (
          <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between md:hidden">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              {sidebarItems.find(item => item.path === location.pathname)?.title || 'Admin Dashboard'}
            </h1>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
