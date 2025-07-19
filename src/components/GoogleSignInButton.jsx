import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import awsConfig from '../aws-config';

const GoogleSignInButton = ({ onSuccess, onError, text = "Sign in with Google" }) => {
  const { googleSignIn, userRole } = useAuth();
  const navigate = useNavigate();

  // Check if Google OAuth is properly configured
  const isGoogleConfigured = awsConfig.Google.clientId &&
    awsConfig.Google.clientId !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com' &&
    awsConfig.Google.clientId !== '123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com';

  // Don't render if Google OAuth is not configured
  if (!isGoogleConfigured) {
    return (
      <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-center">
        <p className="text-sm text-gray-500">
          🔧 Google Sign-In not configured yet
        </p>
        <p className="text-xs text-gray-400 mt-1">
          See GOOGLE_OAUTH_SETUP.md for setup instructions
        </p>
      </div>
    );
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      console.log('Google login success:', credentialResponse);
      console.log('Current URL:', window.location.href);
      console.log('Google Client ID:', awsConfig.Google.clientId);

      // Call the auth context Google sign-in handler
      const userData = await googleSignIn(credentialResponse);

      console.log('User data received:', userData);

      if (onSuccess) {
        onSuccess(userData);
      } else {
        // Handle redirection based on user type and role
        if (userData.shouldRedirect) {
          if (userData.isNewUser) {
            // New Google user - redirect to home page as requested
            console.log('New Google user registered, redirecting to home page');
            navigate('/');
          } else {
            // Existing user - redirect based on role
            if (userData.attributes['custom:role'] === 'admin') {
              navigate('/admin');
            } else {
              navigate('/');
            }
          }
        }
      }
    } catch (error) {
      console.error('Google sign-in failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      if (onError) {
        onError(error);
      }
    }
  };

  const handleGoogleError = (error) => {
    console.error('Google login error:', error);

    // Provide more specific error messages
    let errorMessage = 'Google sign-in failed. ';

    if (error?.error === 'popup_closed_by_user') {
      errorMessage += 'Sign-in was cancelled.';
    } else if (error?.error === 'access_denied') {
      errorMessage += 'Access was denied. Please try again.';
    } else if (error?.error === 'invalid_client') {
      errorMessage += 'Configuration error. Please check Google Client ID.';
    } else if (error?.error === 'redirect_uri_mismatch') {
      errorMessage += 'Redirect URI mismatch. Please check Google Console settings.';
    } else {
      errorMessage += 'Please try again or contact support.';
    }

    console.error('Detailed error:', errorMessage);

    if (onError) {
      onError(new Error(errorMessage));
    }
  };

  return (
    <div className="w-full">
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        useOneTap={false}
        theme="outline"
        size="large"
        text={text}
        shape="rectangular"
        logo_alignment="left"
        width="100%"
        locale="en"
      />
    </div>
  );
};

export default GoogleSignInButton;
