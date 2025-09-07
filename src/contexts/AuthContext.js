import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signOut,
  getCurrentUser,
  fetchUserAttributes,
  updateUserAttributes as amplifyUpdateUserAttributes,
  resetPassword,
  confirmResetPassword,
  updatePassword
} from 'aws-amplify/auth';
import CryptoJS from 'crypto-js';
import AWS from 'aws-sdk';
import awsConfig from '../aws-config';
import googleAuthService from '../services/googleAuthService';


const AuthContext = createContext();

// Helper function to generate SECRET_HASH
const generateSecretHash = (username, clientId, clientSecret) => {
  const message = username + clientId;
  const hash = CryptoJS.HmacSHA256(message, clientSecret);
  return CryptoJS.enc.Base64.stringify(hash);
};

// Helper function to check if token is expired
const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    return true; // If we can't parse the token, consider it expired
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  // Configure AWS SDK
  AWS.config.update({
    region: awsConfig.Auth.Cognito.region,
    credentials: new AWS.CognitoIdentityCredentials({
      IdentityPoolId: awsConfig.Auth.Cognito.identityPoolId
    })
  });

  const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
    region: awsConfig.Auth.Cognito.region
  });

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuthState();
  }, []);

  // Add event listener for storage changes (for multi-tab logout)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key && e.key.includes('CognitoIdentityServiceProvider') && e.newValue === null) {
        // Token was removed in another tab, update state
        setUser(null);
        setUserRole(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const checkAuthState = async () => {
    try {
      setLoading(true);

      // Now that Google users are also stored in Cognito, we only need to check Cognito tokens
      const clientId = awsConfig.Auth.Cognito.userPoolClientId;
      const lastAuthUser = localStorage.getItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`);

      if (!lastAuthUser) {
        // No stored user, definitely not authenticated
        setUser(null);
        setUserRole(null);
        return;
      }

      // Check if we have valid tokens
      const accessToken = localStorage.getItem(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.accessToken`);
      const idToken = localStorage.getItem(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.idToken`);

      if (!accessToken || !idToken) {
        // No tokens at all, clear everything
        console.log('No tokens found, clearing auth state');
        localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`);
        localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.accessToken`);
        localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.idToken`);
        localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.refreshToken`);
        setUser(null);
        setUserRole(null);
        return;
      }

      // Check if tokens are expired
      if (isTokenExpired(accessToken) || isTokenExpired(idToken)) {
        console.log('Tokens are expired, but continuing with stored user data');
        // Don't immediately clear - let the user stay logged in but with potentially stale data
        // The app can handle token refresh when making API calls
      }

      // If we have valid tokens, try to restore user from ID token first
      try {
        const idTokenPayload = JSON.parse(atob(idToken.split('.')[1]));
        const user = {
          username: lastAuthUser,
          attributes: {
            email: idTokenPayload.email,
            email_verified: idTokenPayload.email_verified,
            sub: idTokenPayload.sub
          }
        };

        setUser(user);

        // Try to get role from ID token first, then fallback to fetchUserAttributes
        let roleAttribute = 'user';

        // Check if role is stored in the ID token
        if (idTokenPayload['custom:role']) {
          roleAttribute = idTokenPayload['custom:role'];
          console.log('Role found in ID token:', roleAttribute);
        } else {
          // Fallback: try to get role from fetchUserAttributes, but don't fail if it doesn't work
          try {
            const userAttributes = await fetchUserAttributes();
            roleAttribute = userAttributes['custom:role'] || 'user';
            console.log('Role fetched from attributes:', roleAttribute);
          } catch (roleError) {
            console.warn('Could not fetch user role from attributes, checking localStorage for cached role:', roleError.message);

            // Last resort: check if we have a cached role in localStorage
            const cachedRole = localStorage.getItem(`petverse_user_role_${lastAuthUser}`);
            if (cachedRole && (cachedRole === 'admin' || cachedRole === 'user')) {
              roleAttribute = cachedRole;
              console.log('Using cached role from localStorage:', roleAttribute);
            } else {
              console.log('No cached role found, using default: user');
            }
          }
        }

        // Cache the role for future use
        localStorage.setItem(`petverse_user_role_${lastAuthUser}`, roleAttribute);

        setUserRole(roleAttribute);
        console.log('User restored from tokens:', user.username, 'Role:', roleAttribute);

      } catch (tokenParseError) {
        console.warn('Failed to parse ID token, falling back to getCurrentUser:', tokenParseError.message);

        // Fallback to getCurrentUser if token parsing fails
        try {
          const currentUser = await getCurrentUser();
          console.log('Current user from Amplify:', currentUser);
          setUser(currentUser);

          // Try to get role
          try {
            const userAttributes = await fetchUserAttributes();
            const roleAttribute = userAttributes['custom:role'];
            setUserRole(roleAttribute || 'user');
            console.log('User authenticated via getCurrentUser:', currentUser.username, 'Role:', roleAttribute || 'user');
          } catch (attributeError) {
            console.warn('Failed to fetch user attributes, using default role:', attributeError.message);
            setUserRole('user');
            console.log('User authenticated via getCurrentUser:', currentUser.username, 'Role: user (default)');
          }
        } catch (getCurrentUserError) {
          console.error('getCurrentUser also failed:', getCurrentUserError.message);
          throw getCurrentUserError;
        }
      }

    } catch (error) {
      console.log('No authenticated user found:', error.message);

      // Clear any stale tokens
      const clientId = awsConfig.Auth.Cognito.userPoolClientId;
      const lastAuthUser = localStorage.getItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`);

      if (lastAuthUser) {
        localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`);
        localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.accessToken`);
        localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.idToken`);
        localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.refreshToken`);
      }

      setUser(null);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (email, password) => {
    try {
      const secretHash = generateSecretHash(
        email,
        awsConfig.Auth.Cognito.userPoolClientId,
        awsConfig.Auth.Cognito.userPoolClientSecret
      );

      const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: awsConfig.Auth.Cognito.userPoolClientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          SECRET_HASH: secretHash
        }
      };

      const result = await cognitoIdentityServiceProvider.initiateAuth(params).promise();

      if (result.AuthenticationResult) {
        // Store tokens in localStorage for Amplify to use
        const { AccessToken, IdToken, RefreshToken } = result.AuthenticationResult;
        const clientId = awsConfig.Auth.Cognito.userPoolClientId;

        localStorage.setItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`, email);
        localStorage.setItem(`CognitoIdentityServiceProvider.${clientId}.${email}.accessToken`, AccessToken);
        localStorage.setItem(`CognitoIdentityServiceProvider.${clientId}.${email}.idToken`, IdToken);
        localStorage.setItem(`CognitoIdentityServiceProvider.${clientId}.${email}.refreshToken`, RefreshToken);

        // Parse user info from ID token
        const idTokenPayload = JSON.parse(atob(IdToken.split('.')[1]));
        const user = {
          username: email,
          attributes: {
            email: idTokenPayload.email,
            'custom:role': idTokenPayload['custom:role'] || 'user'
          }
        };

        const userRole = idTokenPayload['custom:role'] || 'user';

        // Cache the role for future use
        localStorage.setItem(`petverse_user_role_${email}`, userRole);

        setUser(user);
        setUserRole(userRole);

        console.log('Login successful:', user.username, 'Role:', userRole);
        return { user, role: userRole };
      } else if (result.ChallengeName) {
        // Handle different challenge types

        if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
          throw new Error('Password change required. Please set a permanent password in AWS Console first.');
        } else if (result.ChallengeName === 'SMS_MFA' || result.ChallengeName === 'SOFTWARE_TOKEN_MFA') {
          throw new Error('MFA is enabled but not supported in this demo. Please disable MFA in AWS Console.');
        } else {
          throw new Error(`Authentication challenge not supported: ${result.ChallengeName}`);
        }
      } else {
        throw new Error('Sign in not completed - unexpected response from AWS Cognito');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const handleSignUp = async (email, password, attributes = {}) => {
    try {
      const secretHash = generateSecretHash(
        email,
        awsConfig.Auth.Cognito.userPoolClientId,
        awsConfig.Auth.Cognito.userPoolClientSecret
      );

      // Convert attributes to Cognito format
      const userAttributes = [
        { Name: 'email', Value: email }
      ];

      // Add other attributes
      Object.keys(attributes).forEach(key => {
        if (key !== 'email') {
          userAttributes.push({ Name: key, Value: attributes[key] });
        }
      });

      const params = {
        ClientId: awsConfig.Auth.Cognito.userPoolClientId,
        Username: email,
        Password: password,
        SecretHash: secretHash,
        UserAttributes: userAttributes
      };

      const result = await cognitoIdentityServiceProvider.signUp(params).promise();

      return {
        isSignUpComplete: false,
        userId: result.UserSub,
        nextStep: { signUpStep: 'CONFIRM_SIGN_UP' }
      };
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const handleConfirmSignUp = async (email, code) => {
    try {
      const secretHash = generateSecretHash(
        email,
        awsConfig.Auth.Cognito.userPoolClientId,
        awsConfig.Auth.Cognito.userPoolClientSecret
      );

      const params = {
        ClientId: awsConfig.Auth.Cognito.userPoolClientId,
        Username: email,
        ConfirmationCode: code,
        SecretHash: secretHash
      };

      await cognitoIdentityServiceProvider.confirmSignUp(params).promise();

      return { isSignUpComplete: true, nextStep: null };
    } catch (error) {
      console.error('Error confirming sign up:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      
      await signOut();

    
      const clientId = awsConfig.Auth.Cognito.userPoolClientId;
      const lastAuthUser = localStorage.getItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`);

      if (lastAuthUser) {
        localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`);
        localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.accessToken`);
        localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.idToken`);
        localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.refreshToken`);
      }

     
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('CognitoIdentityServiceProvider')) {
          localStorage.removeItem(key);
        }
      });


      localStorage.removeItem('googleUser');
      localStorage.removeItem('authProvider');

      // Clear cached roles
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('petverse_user_role_')) {
          localStorage.removeItem(key);
        }
      });

      setUser(null);
      setUserRole(null);

      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);

      
      const clientId = awsConfig.Auth.Cognito.userPoolClientId;
      const lastAuthUser = localStorage.getItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`);

      if (lastAuthUser) {
        localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`);
        localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.accessToken`);
        localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.idToken`);
        localStorage.removeItem(`CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.refreshToken`);
      }

      localStorage.removeItem('googleUser');
      localStorage.removeItem('authProvider');

      setUser(null);
      setUserRole(null);

      throw error;
    }
  };

  const handleForgotPassword = async (email) => {
    try {
      const secretHash = generateSecretHash(
        email,
        awsConfig.Auth.Cognito.userPoolClientId,
        awsConfig.Auth.Cognito.userPoolClientSecret
      );

      const params = {
        ClientId: awsConfig.Auth.Cognito.userPoolClientId,
        Username: email,
        SecretHash: secretHash
      };

      await cognitoIdentityServiceProvider.forgotPassword(params).promise();
    } catch (error) {
      console.error('Error initiating forgot password:', error);
      throw error;
    }
  };

  const handleForgotPasswordSubmit = async (email, code, newPassword) => {
    try {
      const secretHash = generateSecretHash(
        email,
        awsConfig.Auth.Cognito.userPoolClientId,
        awsConfig.Auth.Cognito.userPoolClientSecret
      );

      const params = {
        ClientId: awsConfig.Auth.Cognito.userPoolClientId,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
        SecretHash: secretHash
      };

      await cognitoIdentityServiceProvider.confirmForgotPassword(params).promise();
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  };

  const handleChangePassword = async (oldPassword, newPassword) => {
    try {
      await updatePassword({
        oldPassword,
        newPassword
      });
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  };

  const handleUpdateUserAttributes = async (attributes) => {
    try {
      await amplifyUpdateUserAttributes({
        userAttributes: attributes
      });

      // If role is being updated, update local state
      if (attributes['custom:role']) {
        setUserRole(attributes['custom:role']);
      }
    } catch (error) {
      console.error('Error updating user attributes:', error);
      throw error;
    }
  };

  const handleGetCurrentUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      return currentUser;
    } catch (error) {
      return null;
    }
  };

  const isAuthenticated = () => {
    return user !== null;
  };

  const isAdmin = () => {
    return userRole === 'admin';
  };

  const isUser = () => {
    return userRole === 'user';
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async (googleResponse) => {
    try {
      setLoading(true);

      // Use Google Auth Service to handle the sign-in (now creates Cognito users)
      const userData = await googleAuthService.handleGoogleSignIn(googleResponse);

      // Check if user needs email confirmation
      if (userData.needsConfirmation) {
        console.log('User needs email confirmation:', userData.message);

        // Return confirmation needed response
        return {
          needsConfirmation: true,
          username: userData.username,
          message: userData.message,
          shouldRedirect: false
        };
      }

      // Since we're now using Cognito, we don't need separate localStorage for Google users
      // The regular Cognito session management will handle persistence

      const userRole = userData.attributes['custom:role'] || 'user';

      // Cache the role for future use
      localStorage.setItem(`petverse_user_role_${userData.username}`, userRole);

      setUser(userData);
      setUserRole(userRole);

      console.log('Google sign-in successful:', userData.username, 'Role:', userRole);

      // Return user data with navigation info
      return {
        ...userData,
        shouldRedirect: true,
        redirectPath: userData.attributes['custom:role'] === 'admin' ? '/admin' : '/'
      };
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    userRole,
    loading,
    setUser,
    setUserRole,
    signIn: handleSignIn,
    signUp: handleSignUp,
    confirmSignUp: handleConfirmSignUp,
    signOut: handleSignOut,
    forgotPassword: handleForgotPassword,
    forgotPasswordSubmit: handleForgotPasswordSubmit,
    changePassword: handleChangePassword,
    updateUserAttributes: handleUpdateUserAttributes,
    getCurrentUser: handleGetCurrentUser,
    googleSignIn: handleGoogleSignIn,
    isAuthenticated,
    isAdmin,
    isUser,
    checkAuthState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
