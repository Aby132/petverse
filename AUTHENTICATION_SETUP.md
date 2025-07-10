# Authentication Setup Guide

This project supports both **Mock Authentication** (for development/testing) and **AWS Cognito Authentication** (for production).

## Current Setup: Mock Authentication

The application is currently configured to use **Mock Authentication** for easy development and testing without requiring AWS setup.

### Test Credentials

You can use these pre-configured test accounts:

**Admin Account:**
- Email: `admin@petverse.com`
- Password: `admin123`
- Role: Admin (redirects to Admin Dashboard)

**User Account:**
- Email: `user@petverse.com`
- Password: `user123`
- Role: User (redirects to Home page)

### Testing Registration

1. Go to Register page
2. Fill out the form with any email/password
3. Select account type (Admin or User)
4. Use any 6-digit code for email confirmation (e.g., `123456`)

## Switching to AWS Cognito Authentication

When you're ready to use real AWS Cognito authentication:

### Step 1: Set up AWS Cognito

Follow the detailed guide in `AWS_COGNITO_SETUP.md` to:
1. Create a Cognito User Pool
2. Configure custom attributes
3. Get your AWS credentials

### Step 2: Update Configuration

1. **Update `src/aws-config.js`** with your actual AWS credentials:
```javascript
const awsConfig = {
  Auth: {
    Cognito: {
      region: 'your-aws-region',
      userPoolId: 'your-user-pool-id',
      userPoolClientId: 'your-client-id',
      signUpVerificationMethod: 'code',
      authenticationFlowType: 'USER_SRP_AUTH'
    }
  }
};
```

### Step 3: Switch Authentication Context

In `src/App.js`, make these changes:

**Replace:**
```javascript
// import { AuthProvider } from './contexts/AuthContext';
import { AuthProvider } from './contexts/MockAuthContext'; // Using mock for development

// Configure AWS Amplify (commented out for development with mock auth)
// Amplify.configure(awsConfig);
```

**With:**
```javascript
import { AuthProvider } from './contexts/AuthContext';
// import { AuthProvider } from './contexts/MockAuthContext'; // Using mock for development

// Configure AWS Amplify
Amplify.configure(awsConfig);
```

**And uncomment the imports:**
```javascript
import { Amplify } from 'aws-amplify';
import awsConfig from './aws-config';
```

### Step 4: Test Real Authentication

1. Register new users through your app
2. Check email for confirmation codes
3. Test role-based routing
4. Verify all authentication flows work

## Features Available in Both Modes

✅ **User Registration** with role selection
✅ **Email Confirmation** flow
✅ **User Login** with error handling
✅ **Role-based Routing** (Admin → Dashboard, User → Home)
✅ **Protected Routes** for authenticated users only
✅ **Sign Out** functionality
✅ **Responsive Navigation** with auth state
✅ **Loading States** during auth operations
✅ **Error Handling** with user-friendly messages

## Development Workflow

1. **Start with Mock Auth** for UI development and testing
2. **Switch to AWS Cognito** when ready for production
3. **Test thoroughly** with real AWS setup before deployment

## Troubleshooting

### Mock Authentication Issues
- Clear localStorage: `localStorage.clear()`
- Refresh the page
- Check browser console for errors

### AWS Cognito Issues
- Verify AWS credentials in `aws-config.js`
- Check AWS Cognito User Pool configuration
- Ensure custom `role` attribute is set up
- Review AWS Cognito logs in AWS Console

## Security Notes

🔒 **Mock Authentication is for development only**
- Never use mock auth in production
- Mock credentials are stored in localStorage
- No real security validation

🔒 **AWS Cognito for Production**
- Secure, scalable authentication
- Real email verification
- Proper password policies
- Industry-standard security

## Next Steps

1. **Test the current mock authentication** to verify UI flows
2. **Set up AWS Cognito** when ready for production
3. **Switch authentication contexts** following the guide above
4. **Deploy with real AWS authentication** for production use
