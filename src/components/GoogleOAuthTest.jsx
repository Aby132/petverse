import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import awsConfig from '../aws-config';

const GoogleOAuthTest = () => {
  const handleSuccess = (credentialResponse) => {
    console.log('✅ Google OAuth Success!');
    console.log('Credential Response:', credentialResponse);
    console.log('Client ID used:', awsConfig.Google.clientId);
    console.log('Current URL:', window.location.href);
    
    // Decode the JWT token to see user info
    if (credentialResponse.credential) {
      try {
        const base64Url = credentialResponse.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const userInfo = JSON.parse(jsonPayload);
        console.log('Decoded user info:', userInfo);
        
        alert(`✅ Google OAuth Success!\nUser: ${userInfo.name}\nEmail: ${userInfo.email}`);
      } catch (error) {
        console.error('Error decoding token:', error);
        alert('✅ Google OAuth Success! (Could not decode user info)');
      }
    }
  };

  const handleError = (error) => {
    console.error('❌ Google OAuth Error!');
    console.error('Error:', error);
    console.error('Client ID used:', awsConfig.Google.clientId);
    console.error('Current URL:', window.location.href);
    
    let errorMessage = '❌ Google OAuth Failed!\n\n';
    
    if (error?.error === 'popup_closed_by_user') {
      errorMessage += 'Reason: User closed the popup';
    } else if (error?.error === 'access_denied') {
      errorMessage += 'Reason: Access denied';
    } else if (error?.error === 'invalid_client') {
      errorMessage += 'Reason: Invalid client configuration';
    } else {
      errorMessage += `Reason: ${error?.error || 'Unknown error'}`;
    }
    
    errorMessage += '\n\nCheck browser console for details.';
    alert(errorMessage);
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">🧪 Google OAuth Test</h2>
      
      <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
        <p><strong>Client ID:</strong></p>
        <p className="break-all text-xs">{awsConfig.Google.clientId}</p>
      </div>
      
      <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
        <p><strong>Current URL:</strong></p>
        <p className="break-all text-xs">{window.location.href}</p>
      </div>
      
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap={false}
        theme="outline"
        size="large"
        text="signin_with"
        shape="rectangular"
        logo_alignment="left"
        width="100%"
      />
      
      <div className="mt-4 text-xs text-gray-500">
        <p>📝 This test will show detailed success/error information.</p>
        <p>🔍 Check browser console (F12) for technical details.</p>
      </div>
    </div>
  );
};

export default GoogleOAuthTest;
