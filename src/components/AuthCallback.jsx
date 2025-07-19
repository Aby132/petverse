import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import awsConfig from '../aws-config';

const AuthCallback = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Processing...');
  const navigate = useNavigate();
  const { setUser, setUserRole } = useAuth();

  const processTokens = async (tokens) => {
    setStatus('Processing user information...');
    
    // Decode ID token to get user info
    if (tokens.id_token) {
      const idTokenPayload = JSON.parse(atob(tokens.id_token.split('.')[1]));
      
      const userData = {
        username: idTokenPayload.sub,
        email: idTokenPayload.email,
        given_name: idTokenPayload.given_name || '',
        family_name: idTokenPayload.family_name || '',
        picture: idTokenPayload.picture || '',
        email_verified: idTokenPayload.email_verified || true,
        authProvider: 'google',
        attributes: {
          ...idTokenPayload,
          'custom:role': idTokenPayload['custom:role'] || 'user'
        }
      };
      
      // Store tokens in localStorage for Amplify
      localStorage.setItem(`CognitoIdentityServiceProvider.${awsConfig.Auth.Cognito.userPoolClientId}.LastAuthUser`, userData.username);
      localStorage.setItem(`CognitoIdentityServiceProvider.${awsConfig.Auth.Cognito.userPoolClientId}.${userData.username}.accessToken`, tokens.access_token);
      localStorage.setItem(`CognitoIdentityServiceProvider.${awsConfig.Auth.Cognito.userPoolClientId}.${userData.username}.idToken`, tokens.id_token);
      if (tokens.refresh_token) {
        localStorage.setItem(`CognitoIdentityServiceProvider.${awsConfig.Auth.Cognito.userPoolClientId}.${userData.username}.refreshToken`, tokens.refresh_token);
      }
      
      // Set user in context
      setUser(userData);
      setUserRole(userData.attributes['custom:role'] || 'user');
      
      setStatus('Redirecting...');
      
      // Redirect based on role
      const redirectPath = userData.attributes['custom:role'] === 'admin' ? '/admin' : '/';
      
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 1000);
      
      return userData;
    } else {
      throw new Error('No ID token received');
    }
  };

  useEffect(() => {
    let isProcessing = false;

    const handleManualCallback = async () => {
      if (isProcessing) {
        return;
      }
      isProcessing = true;
      
      try {
        setStatus('Processing authentication...');
        
        // Get the authorization code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        
        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }
        
        if (!code) {
          throw new Error('No authorization code found in URL');
        }
        
        // Check if this code was already used (prevent double execution)
        const usedCode = sessionStorage.getItem('oauth_code_used');
        if (usedCode === code) {
          navigate('/login', { replace: true });
          return;
        }
        
        // Mark this code as used
        sessionStorage.setItem('oauth_code_used', code);
        
        setStatus('Completing sign in...');
        
        // Use the exact same redirect URI that was used in the OAuth request
        const redirectUri = `${window.location.origin}/auth/callback`;
        
        // Manual token exchange with client secret
        const tokenResponse = await fetch(`https://${awsConfig.Auth.Cognito.loginWith.oauth.domain}/oauth2/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${awsConfig.Auth.Cognito.userPoolClientId}:${awsConfig.Auth.Cognito.userPoolClientSecret}`)}`
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: awsConfig.Auth.Cognito.userPoolClientId,
            code: code,
            redirect_uri: redirectUri
          })
        });
        
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          throw new Error(`Authentication failed: ${tokenResponse.status}`);
        }
        
        const tokens = await tokenResponse.json();
        await processTokens(tokens);
        
      } catch (error) {
        setError(error.message);
        setLoading(false);
        
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleManualCallback();
  }, [navigate, setUser, setUserRole]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Completing Google Sign In...
            </h2>
            <p className="text-gray-600">
              {status}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Please wait...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <span className="text-red-600 text-xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Failed
            </h2>
            <p className="text-gray-600 mb-4 text-sm">
              {error}
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to login page...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;
