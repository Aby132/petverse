# AWS Cognito Automated Setup

## ✅ **Complete AWS CLI/SDK Solution Created!**

I've created a comprehensive set of scripts to automatically set up AWS Cognito using AWS CLI instead of manual console setup.

## 🚀 **Quick Start (Windows)**

### Prerequisites
1. **Install AWS CLI:**
   ```powershell
   # Download from: https://aws.amazon.com/cli/
   # Or using Chocolatey:
   choco install awscli
   ```

2. **Configure AWS CLI:**
   ```bash
   aws configure
   ```
   Enter your:
   - AWS Access Key ID
   - AWS Secret Access Key  
   - Default region (e.g., `us-east-1`)
   - Default output format (`json`)

### One-Click Setup
```batch
# Run this from the petverse directory:
scripts\setup-cognito.bat
```

**Or manually:**
```powershell
# Setup Cognito resources
.\scripts\setup-cognito.ps1

# Update app configuration
node scripts\update-config.js

# Restart development server
npm start
```

## 🛠️ **What Gets Created**

### AWS Resources:
✅ **Cognito User Pool** with:
- Email-based authentication
- Custom `role` attribute for admin/user roles
- Password policy (8+ chars, uppercase, lowercase, numbers)
- Email verification

✅ **User Pool Client** with:
- No client secret (for web apps)
- SRP authentication flow
- Proper callback URLs for localhost

✅ **Identity Pool** with:
- Federated identity support
- IAM roles for authenticated/unauthenticated users

✅ **IAM Roles** with:
- Authenticated user role
- Unauthenticated user role
- Proper trust policies

✅ **Admin Test User**:
- Email: `admin@petverse.com`
- Password: `Admin123!`
- Role: `admin`

### Local Configuration:
✅ **Updated `src/aws-config.js`** with real AWS credentials
✅ **Updated `src/App.js`** to use real authentication
✅ **Created `.env.local`** with environment variables
✅ **Generated `cognito-config.json`** with all resource IDs

## 📋 **Available Scripts**

| Script | Platform | Purpose |
|--------|----------|---------|
| `setup-cognito.bat` | Windows | One-click setup (recommended) |
| `setup-cognito.ps1` | Windows | PowerShell setup script |
| `setup-cognito.sh` | Linux/macOS | Bash setup script |
| `update-config.js` | All | Update app to use real AWS auth |
| `use-mock-auth.js` | All | Switch back to mock auth |
| `cleanup-cognito.sh` | Linux/macOS | Remove all AWS resources |

## 🧪 **Testing the Setup**

After running the setup:

1. **Restart your development server:**
   ```bash
   npm start
   ```

2. **Test admin login:**
   - Go to: `http://localhost:3001/login`
   - Email: `admin@petverse.com`
   - Password: `Admin123!`
   - Should redirect to Admin Dashboard

3. **Test user registration:**
   - Go to: `http://localhost:3001/register`
   - Fill out form with any email/password
   - Select "Pet Owner (User)" role
   - Check email for verification code
   - Complete registration and login

## 🔄 **Switching Between Auth Methods**

### Use Real AWS Authentication:
```bash
node scripts/update-config.js
npm start
```

### Use Mock Authentication:
```bash
node scripts/use-mock-auth.js
npm start
```

## 💰 **Cost Information**

**AWS Cognito is FREE for:**
- First 50,000 monthly active users
- First 50,000 federated identities

**Perfect for development and small-scale production!**

## 🧹 **Cleanup Resources**

To remove all AWS resources and avoid any costs:

**Linux/macOS:**
```bash
./scripts/cleanup-cognito.sh
```

**Windows (manual):**
1. Delete User Pool in AWS Console
2. Delete Identity Pool in AWS Console
3. Delete IAM roles: `petverse-authenticated-role`, `petverse-unauthenticated-role`
4. Run: `node scripts/use-mock-auth.js`

## 🔧 **Customization**

You can customize the setup by editing the script variables:

**PowerShell (`setup-cognito.ps1`):**
```powershell
param(
    [string]$Region = "us-east-1",           # Change AWS region
    [string]$UserPoolName = "petverse-users", # Change pool name
    [string]$ClientName = "petverse-web-client", # Change client name
    [string]$ProjectName = "petverse"        # Change project name
)
```

## 🛡️ **Security Features**

✅ **Password Policy**: 8+ characters, mixed case, numbers
✅ **Email Verification**: Required for all new users
✅ **SRP Authentication**: Secure Remote Password protocol
✅ **Role-based Access**: Custom `role` attribute for authorization
✅ **IAM Integration**: Proper AWS service access controls

## 📚 **Documentation**

- **Detailed setup guide**: `scripts/README.md`
- **Manual setup guide**: `AWS_COGNITO_SETUP.md`
- **Authentication guide**: `AUTHENTICATION_SETUP.md`

## 🆘 **Troubleshooting**

### Common Issues:

1. **"AWS CLI not configured"**
   ```bash
   aws configure
   ```

2. **"Access Denied"**
   - Check AWS user permissions
   - Verify credentials are correct

3. **"User Pool already exists"**
   - Change the pool name in the script
   - Or delete existing pool first

4. **App still using mock auth**
   ```bash
   node scripts/update-config.js
   npm start
   ```

## 🎉 **Benefits of This Approach**

✅ **Automated**: No manual clicking in AWS Console
✅ **Reproducible**: Same setup every time
✅ **Version Controlled**: Scripts can be committed to git
✅ **Fast**: Complete setup in under 2 minutes
✅ **Configurable**: Easy to customize for different environments
✅ **Documented**: Every step is clearly defined
✅ **Reversible**: Easy cleanup when done

## 🚀 **Next Steps**

1. **Run the setup**: `scripts\setup-cognito.bat`
2. **Test authentication**: Login with admin credentials
3. **Register new users**: Test the full registration flow
4. **Customize as needed**: Modify scripts for your requirements
5. **Deploy to production**: Use same scripts with production settings

The automated setup is now ready to use! This approach is much faster and more reliable than manual AWS Console setup, and it's perfect for development, testing, and production environments.
