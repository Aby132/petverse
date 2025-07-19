// Cognito Built-in Google Federation Service for PetVerse
// Uses AWS Cognito's native Google Identity Provider integration

import { signInWithRedirect, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import awsConfig from '../aws-config';

class CognitoFederationService {
  constructor() {
    this.userPoolId = awsConfig.Auth.Cognito.userPoolId;
    this.userPoolClientId = awsConfig.Auth.Cognito.userPoolClientId;
    this.region = awsConfig.Auth.Cognito.region;
  }

  /**
   * Initiate Google sign-in using Cognito's hosted UI
   */
  async signInWithGoogle() {
    try {
      console.log('🔄 Initiating Google sign-in with Cognito Federation...');
      
      // This will redirect to Cognito's hosted UI with Google as the provider
      await signInWithRedirect({
        provider: 'Google',
        customState: JSON.stringify({
          source: 'petverse_app',
          timestamp: Date.now()
        })
      });
      
      // Note: This function will cause a redirect, so code after this won't execute
      console.log('🔄 Redirecting to Google OAuth...');
      
    } catch (error) {
      console.error('❌ Error initiating Google sign-in:', error);
      throw new Error(`Google sign-in failed: ${error.message}`);
    }
  }

  /**
   * Handle the callback after successful authentication
   * This should be called on the callback page
   */
  async handleAuthCallback() {
    try {
      console.log('🔄 Handling authentication callback...');

      // Wait longer for Amplify to process the OAuth callback
      await new Promise(resolve => setTimeout(resolve, 2000));

      let user = null;
      let session = null;
      let retryCount = 0;
      const maxRetries = 5;

      // Retry getting user and session with exponential backoff
      while (retryCount < maxRetries) {
        try {
          console.log(`🔄 Attempt ${retryCount + 1} to get authenticated user...`);

          // Try to get the session first (this is more reliable after OAuth)
          session = await fetchAuthSession();
          console.log('✅ Session obtained:', session);

          if (session.tokens?.accessToken) {
            // If we have tokens, try to get the user
            user = await getCurrentUser();
            console.log('✅ User authenticated successfully:', user);
            break;
          } else {
            throw new Error('No access token in session');
          }

        } catch (attemptError) {
          console.log(`⚠️ Attempt ${retryCount + 1} failed:`, attemptError.message);
          retryCount++;

          if (retryCount < maxRetries) {
            // Wait with exponential backoff
            const waitTime = Math.pow(2, retryCount) * 1000;
            console.log(`🔄 Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }

      if (!session?.tokens?.accessToken) {
        throw new Error('Failed to obtain valid session after OAuth callback');
      }

      // Extract user attributes from the ID token
      const idToken = session.tokens.idToken?.payload || {};
      const accessToken = session.tokens.accessToken?.payload || {};

      console.log('🔍 ID Token payload:', idToken);
      console.log('🔍 Access Token payload:', accessToken);

      // Extract user attributes
      const userAttributes = {
        username: user?.username || idToken.sub || accessToken.sub,
        email: idToken.email || user?.signInDetails?.loginId,
        given_name: idToken.given_name || '',
        family_name: idToken.family_name || '',
        picture: idToken.picture || '',
        email_verified: idToken.email_verified || true, // Google emails are pre-verified
        authProvider: 'google',
        isNewUser: false, // Cognito handles this automatically
        'custom:role': idToken['custom:role'] || 'user' // Default role
      };

      console.log('✅ User attributes extracted:', userAttributes);

      return {
        ...userAttributes,
        attributes: userAttributes,
        shouldRedirect: true,
        redirectPath: userAttributes['custom:role'] === 'admin' ? '/admin' : '/'
      };

    } catch (error) {
      console.error('❌ Error handling auth callback:', error);
      throw new Error(`Authentication callback failed: ${error.message}`);
    }
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser() {
    try {
      console.log('🔄 Getting current user...');

      // First try to get the session
      const session = await fetchAuthSession();
      console.log('🔍 Session:', session);

      if (!session.tokens?.accessToken) {
        throw new Error('No valid session tokens found');
      }

      // Then try to get the user
      const user = await getCurrentUser();
      console.log('🔍 User:', user);

      // Extract user data from tokens
      const idToken = session.tokens.idToken?.payload || {};
      const accessToken = session.tokens.accessToken?.payload || {};

      const userData = {
        username: user.username || idToken.sub || accessToken.sub,
        email: idToken.email || user.signInDetails?.loginId,
        given_name: idToken.given_name || '',
        family_name: idToken.family_name || '',
        picture: idToken.picture || '',
        email_verified: idToken.email_verified || true,
        authProvider: 'google',
        attributes: {
          ...idToken,
          'custom:role': idToken['custom:role'] || 'user'
        }
      };

      console.log('✅ User data extracted:', userData);
      return userData;

    } catch (error) {
      console.log('⚠️ No authenticated user found:', error.message);
      throw error;
    }
  }

  /**
   * Sign out the current user
   */
  async signOut() {
    try {
      console.log('🔄 Signing out user...');
      await signOut();
      console.log('✅ User signed out successfully');
    } catch (error) {
      console.error('❌ Error signing out:', error);
      throw new Error(`Sign out failed: ${error.message}`);
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    try {
      await getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the Cognito hosted UI URL for Google sign-in
   * Useful for custom implementations or debugging
   */
  getHostedUIUrl() {
    const domain = `https://us-east-14awgtffdj.auth.us-east-1.amazoncognito.com`;
    const clientId = this.userPoolClientId;
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
    const responseType = 'code';
    const scope = encodeURIComponent('openid email profile');
    const identityProvider = 'Google';

    return `${domain}/oauth2/authorize?identity_provider=${identityProvider}&redirect_uri=${redirectUri}&response_type=${responseType}&client_id=${clientId}&scope=${scope}`;
  }
}

// Export singleton instance
export default new CognitoFederationService();
