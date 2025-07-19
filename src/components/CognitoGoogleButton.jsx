import React, { useState } from 'react';
import cognitoFederationService from '../services/cognitoFederationService';

const CognitoGoogleButton = ({ 
  text = "signin_with", 
  onSuccess = () => {}, 
  onError = () => {},
  className = "" 
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Starting Cognito Google Federation sign-in...');

      // Get the hosted UI URL and redirect manually
      const hostedUIUrl = cognitoFederationService.getHostedUIUrl();
      console.log('🔄 Redirecting to:', hostedUIUrl);

      // Direct redirect to hosted UI
      window.location.href = hostedUIUrl;

    } catch (error) {
      console.error('❌ Google sign-in failed:', error);
      setIsLoading(false);
      onError(error);
    }
  };

  const getButtonText = () => {
    if (isLoading) return "Redirecting...";
    
    switch (text) {
      case "signup_with":
        return "Sign up with Google";
      case "signin_with":
        return "Sign in with Google";
      case "continue_with":
        return "Continue with Google";
      default:
        return "Sign in with Google";
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className={`
        w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg
        bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 
        focus:ring-blue-500 transition-colors duration-200 font-medium text-gray-700
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
      ) : (
        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      {getButtonText()}
    </button>
  );
};

export default CognitoGoogleButton;
