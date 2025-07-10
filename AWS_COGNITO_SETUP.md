# AWS Cognito Manual Setup Guide for PetVerse

This guide will walk you through setting up AWS Cognito authentication using the AWS Console (no CLI required).

## Prerequisites
- AWS Account with access to Cognito service
- Basic understanding of AWS Console navigation

## Important Notes
- **Role Selection Removed**: The registration page no longer includes role selection
- **Role Management**: User roles must be assigned manually in AWS Console after registration
- **Default Behavior**: Users without assigned roles are treated as regular users

## Step 1: Create a User Pool

### 1.1 Navigate to Cognito
1. **Sign in to AWS Console**: https://console.aws.amazon.com/
2. **Search for "Cognito"** in the services search bar
3. **Click on "Amazon Cognito"**
4. **Click "User pools"** in the left sidebar
5. **Click "Create user pool"**

### 1.2 Configure Sign-in Experience
1. **Provider types**: Select "Cognito user pool"
2. **Cognito user pool sign-in options**:
   - ✅ Check "Email"
   - ❌ Uncheck "Username" and "Phone number"
3. **Click "Next"**

### 1.3 Configure Security Requirements
1. **Password policy**:
   - Choose "Cognito defaults" or customize as needed
   - Recommended: Minimum 8 characters, require uppercase, lowercase, numbers
2. **Multi-factor authentication (MFA)**:
   - Choose "No MFA" for development
   - Choose "Optional" or "Required" for production
3. **User account recovery**: Keep "Enable self-service account recovery" checked
4. **Click "Next"**

### 1.4 Configure Sign-up Experience
1. **Self-service sign-up**: ✅ Enable
2. **Cognito-assisted verification and confirmation**:
   - ✅ Check "Allow Cognito to automatically send messages to verify and confirm"
   - ✅ Check "Email" for verification
3. **Required attributes**:
   - ✅ email (already selected)
   - ✅ given_name
   - ✅ family_name
4. **Custom attributes**:
   - Click "Add custom attribute"
   - Name: `role`
   - Type: `String`
   - ✅ Mutable
   - ❌ Not required
5. **Click "Next"**

### 1.5 Configure Message Delivery
1. **Email provider**: Choose "Send email with Cognito"
2. **FROM email address**: Use default or customize
3. **Click "Next"**

### 1.6 Integrate Your App
1. **User pool name**: `petverse-users`
2. **Hosted authentication pages**: Keep unchecked for now
3. **Domain**: Skip for now
4. **Initial app client**:
   - App type: "Public client"
   - App client name: `petverse-web-client`
   - ❌ Don't generate a client secret
5. **Click "Next"**

### 1.7 Review and Create
1. **Review all settings**
2. **Click "Create user pool"**
3. **Note down the User Pool ID** (format: us-east-1_XXXXXXXXX)

## Step 2: Get App Client Details

### 2.1 Find Your App Client ID
1. **In your User Pool**, click on **"App integration"** tab
2. **Scroll down to "App clients and analytics"**
3. **Click on your app client** (`petverse-web-client`)
4. **Note down the Client ID** (format: 26-character alphanumeric string)

### 2.2 Configure App Client Settings (Optional)
1. **Callback URLs**: Add `http://localhost:3001/` for development
2. **Sign out URLs**: Add `http://localhost:3001/` for development
3. **Identity providers**: Keep "Cognito user pool" selected
4. **OAuth 2.0 grant types**: Keep defaults
5. **OpenID Connect scopes**: Keep defaults

## Step 3: Create an Identity Pool (Optional)

### 3.1 Create Identity Pool
1. **Go to Cognito** → **Identity pools** (in left sidebar)
2. **Click "Create identity pool"**
3. **Identity pool name**: `petverse-identity-pool`
4. **Identity providers**:
   - Select "Cognito user pool"
   - User pool ID: (from Step 1.7)
   - App client ID: (from Step 2.1)
5. **Unauthenticated access**: Enable if you want guest access
6. **Click "Create identity pool"**
7. **Note down the Identity Pool ID** (format: us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX)

## Step 4: Update Your App Configuration

### 4.1 Update aws-config.js
Replace the placeholder values in `src/aws-config.js` with your actual AWS values:

```javascript
// AWS Amplify v6 Configuration
const awsConfig = {
  Auth: {
    Cognito: {
      // Replace with your actual values from the steps above
      region: 'us-east-1', // Your AWS region
      userPoolId: 'us-east-1_XXXXXXXXX', // From Step 1.7
      userPoolClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX', // From Step 2.1
      identityPoolId: 'us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX', // From Step 3 (optional)

      signUpVerificationMethod: 'code',
      authenticationFlowType: 'USER_SRP_AUTH'
    }
  }
};

export default awsConfig;
```

### 4.2 Switch to Real Authentication
Update `src/App.js` to use real AWS authentication instead of mock:

**Replace these lines:**
```javascript
// import { Amplify } from 'aws-amplify';
// import { AuthProvider } from './contexts/AuthContext';
import { AuthProvider } from './contexts/MockAuthContext'; // Using mock for development
// import awsConfig from './aws-config';
// Amplify.configure(awsConfig);
```

**With:**
```javascript
import { Amplify } from 'aws-amplify';
import { AuthProvider } from './contexts/AuthContext';
// import { AuthProvider } from './contexts/MockAuthContext'; // Using mock for development
import awsConfig from './aws-config';

// Configure AWS Amplify
Amplify.configure(awsConfig);
```

## Step 5: Set Up User Roles (Manual Process)

Since the registration page no longer includes role selection, you must assign roles manually in the AWS Console.

### 5.1 Create an Admin User (for testing)
1. **Go to your User Pool** → **Users** tab
2. **Click "Create user"**
3. **Fill in user details:**
   - Username: `admin@petverse.com`
   - Email: `admin@petverse.com`
   - First name: `Admin`
   - Last name: `User`
   - ✅ Check "Send an invitation to this new user?"
   - ✅ Check "Mark email address as verified?"
4. **Click "Create user"**

### 5.2 Assign Admin Role
1. **Click on the admin user** you just created
2. **Click "Edit"** button
3. **Scroll to "Custom attributes"**
4. **Add attribute:**
   - Name: `custom:role`
   - Value: `admin`
5. **Click "Save changes"**

### 5.3 Set Permanent Password
1. **In the user details**, click **"Set password"**
2. **Choose "Set permanent password"**
3. **Enter password**: `Admin123!` (or your preferred password)
4. **Click "Set password"**

### 5.4 Assign Roles to New Users
When users register through your app:
1. **Go to User Pool** → **Users** tab
2. **Find the new user** and click on their username
3. **Click "Edit"**
4. **Add custom attribute:**
   - Name: `custom:role`
   - Value: `user` (for regular users) or `admin` (for administrators)
5. **Click "Save changes"**

**Note**: Users must log out and back in for role changes to take effect.

## Step 6: Test the Setup

### 6.1 Start Your Application
```bash
npm start
```

### 6.2 Test Admin Login
1. **Go to**: http://localhost:3001/login
2. **Login with admin credentials:**
   - Email: `admin@petverse.com`
   - Password: `Admin123!` (or what you set)
3. **Should redirect to**: Admin Dashboard
4. **Navigation should show**: Dashboard, AI Assistant, Sign Out

### 6.3 Test User Registration
1. **Go to**: http://localhost:3001/register
2. **Fill out registration form** (no role selection)
3. **Check email** for confirmation code
4. **Confirm registration** with the code
5. **Login with new user credentials**
6. **Should redirect to**: Home page (default user behavior)

### 6.4 Assign Role to New User
1. **Go to AWS Console** → **Cognito** → **User pools** → **petverse-users**
2. **Click "Users" tab**
3. **Find the new user** and click username
4. **Click "Edit"**
5. **Add custom attribute**: `custom:role` = `user`
6. **Save changes**
7. **User logs out and back in** → should still go to Home page

### 6.5 Test Role Change
1. **Change user's role** to `admin` in AWS Console
2. **User logs out and back in**
3. **Should now redirect to**: Admin Dashboard

## Environment Variables (Recommended for Production)

Create a `.env` file in your project root:

```env
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=us-east-1_XXXXXXXXX
REACT_APP_USER_POOL_WEB_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_IDENTITY_POOL_ID=us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
REACT_APP_OAUTH_DOMAIN=your-domain.auth.us-east-1.amazoncognito.com
```

Then update `aws-config.js` to use environment variables:

```javascript
const awsConfig = {
  Auth: {
    region: process.env.REACT_APP_AWS_REGION,
    userPoolId: process.env.REACT_APP_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
    identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID,
    // ... other config
  }
};
```

## Security Best Practices

1. **Never commit AWS credentials** to version control
2. **Use environment variables** for configuration
3. **Enable MFA** for admin accounts
4. **Set up proper IAM roles** for Identity Pool
5. **Use HTTPS** in production
6. **Implement proper error handling**
7. **Set up CloudWatch logging** for monitoring

## Troubleshooting

### Common Issues:

1. **"Cannot freeze" error on app start:**
   - Check that `aws-config.js` has correct format
   - Ensure you're using Amplify v6 configuration structure
   - Verify all required fields are filled

2. **"User does not exist" error:**
   - Check if email confirmation is required and completed
   - Verify user exists in User Pool
   - Check if user account is enabled

3. **"Invalid client" error:**
   - Verify App Client ID is correct (26-character string)
   - Ensure client secret is NOT generated (should be disabled for web apps)
   - Check User Pool ID format (us-east-1_XXXXXXXXX)

4. **Role-based routing not working:**
   - Verify `custom:role` attribute is set in AWS Console
   - Check attribute name is exactly `custom:role` (case-sensitive)
   - User must log out and back in after role changes
   - Check browser localStorage/sessionStorage for cached auth data

5. **User redirects to home instead of admin dashboard:**
   - Check if `custom:role` is set to `admin` (not `Admin`)
   - Verify user has logged out and back in after role assignment
   - Clear browser cache/localStorage if needed

6. **Registration confirmation not working:**
   - Check email spam/junk folder
   - Verify email is marked as verified in User Pool
   - Check if email delivery is configured correctly

7. **App still using mock authentication:**
   - Verify `src/App.js` imports real `AuthContext` not `MockAuthContext`
   - Check that `Amplify.configure(awsConfig)` is uncommented
   - Restart development server after changes

## Support

For additional help:
- AWS Cognito Documentation: https://docs.aws.amazon.com/cognito/
- AWS Amplify Documentation: https://docs.amplify.aws/
- PetVerse Support: Contact your development team
