# 🔐 Google OAuth Setup Guide for PetVerse

This guide will help you set up Google OAuth authentication for your PetVerse application.

## 📋 Prerequisites

- Google Cloud Console account
- PetVerse application running locally
- AWS Cognito User Pool already configured

## 🚀 Step 1: Create Google Cloud Project

### 1.1 Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Sign in with your Google account

### 1.2 Create New Project
1. Click on the project dropdown (top left)
2. Click "New Project"
3. Enter project name: `petverse-oauth`
4. Click "Create"

## 🔧 Step 2: Enable Google+ API

### 2.1 Enable APIs
1. Go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on "Google+ API"
4. Click "Enable"

### 2.2 Enable People API (Alternative)
1. Search for "People API"
2. Click on "People API"
3. Click "Enable"

## 🔑 Step 3: Create OAuth 2.0 Credentials

### 3.1 Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Click "Create"
4. Fill in required information:
   - **App name:** PetVerse
   - **User support email:** Your email
   - **Developer contact information:** Your email
5. Click "Save and Continue"
6. Skip "Scopes" for now, click "Save and Continue"
7. Add test users (your email) if needed
8. Click "Save and Continue"

### 3.2 Create OAuth 2.0 Client ID
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Choose "Web application"
4. Enter name: `PetVerse Web Client`
5. Add Authorized JavaScript origins:
   ```
   http://localhost:3001
   http://localhost:3000
   ```
6. Add Authorized redirect URIs:
   ```
   http://localhost:3001/auth/google/callback
   http://localhost:3000/auth/google/callback
   ```
7. Click "Create"
8. **IMPORTANT:** Copy the Client ID (you'll need this!)

## ⚙️ Step 4: Configure PetVerse Application

### 4.1 Update AWS Config
Open `src/aws-config.js` and replace the Google Client ID:

```javascript
// Google OAuth Configuration
Google: {
  // Replace with your actual Google OAuth Client ID
  clientId: 'YOUR_ACTUAL_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
}
```

### 4.2 Example Configuration
```javascript
const awsConfig = {
  Auth: {
    Cognito: {
      region: 'us-east-1',
      userPoolId: 'us-east-1_YourPoolId',
      userPoolClientId: 'your-client-id',
      // ... other settings
      socialProviders: ['GOOGLE']
    }
  },
  Google: {
    clientId: '123456789-abcdefghijklmnop.apps.googleusercontent.com'
  }
};
```

## 🔗 Step 5: Configure AWS Cognito (Optional)

### 5.1 Add Google as Identity Provider
1. Go to AWS Cognito Console
2. Select your User Pool
3. Go to "Sign-in experience" > "Federated identity provider sign-in"
4. Click "Add identity provider"
5. Choose "Google"
6. Enter your Google Client ID and Client Secret
7. Map attributes as needed
8. Save changes

## 🧪 Step 6: Test Google OAuth

### 6.1 Start Your Application
```bash
cd petverse
npm start
```

### 6.2 Test Login Flow
1. Go to http://localhost:3001/login
2. Click "Sign in with Google" button
3. Complete Google authentication
4. Verify you're redirected back to PetVerse
5. Check that user data is properly stored

### 6.3 Test Registration Flow
1. Go to http://localhost:3001/register
2. Click "Sign up with Google" button
3. Complete Google authentication
4. Verify new account is created

## 🔍 Troubleshooting

### Common Issues:

#### 1. "redirect_uri_mismatch" Error
- **Solution:** Ensure your redirect URIs in Google Console match exactly
- Check: `http://localhost:3001` vs `http://localhost:3001/`

#### 2. "invalid_client" Error
- **Solution:** Verify your Client ID is correct in `aws-config.js`
- Make sure there are no extra spaces or characters

#### 3. Google Button Not Appearing
- **Solution:** Check browser console for errors
- Verify `@react-oauth/google` package is installed
- Ensure GoogleOAuthProvider is wrapping your app

#### 4. User Not Created in Cognito
- **Solution:** Check AWS credentials and permissions
- Verify Cognito User Pool settings
- Check browser console for detailed error messages

### Debug Steps:
1. Open browser Developer Tools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests
4. Verify all environment variables are set

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [React OAuth Google Library](https://www.npmjs.com/package/@react-oauth/google)
- [AWS Cognito Social Identity Providers](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html)

## 🎯 Next Steps

After successful setup:
1. Test with multiple Google accounts
2. Configure production domain in Google Console
3. Set up proper error handling
4. Add user profile management
5. Configure role-based access control

## 🔒 Security Notes

- Never commit your Google Client Secret to version control
- Use environment variables for production
- Regularly rotate your OAuth credentials
- Monitor OAuth usage in Google Console
- Implement proper session management
