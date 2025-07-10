#!/bin/bash

# AWS Cognito Setup Script for PetVerse
# This script creates a complete Cognito User Pool with custom attributes and policies

set -e  # Exit on any error

# Configuration
USER_POOL_NAME="petverse-users"
CLIENT_NAME="petverse-web-client"
REGION="us-east-1"
PROJECT_NAME="petverse"

echo "🚀 Setting up AWS Cognito for PetVerse..."
echo "Region: $REGION"
echo "User Pool Name: $USER_POOL_NAME"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI is configured"

# Create User Pool
echo "📝 Creating User Pool..."
USER_POOL_ID=$(aws cognito-idp create-user-pool \
    --pool-name "$USER_POOL_NAME" \
    --region "$REGION" \
    --policies '{
        "PasswordPolicy": {
            "MinimumLength": 8,
            "RequireUppercase": true,
            "RequireLowercase": true,
            "RequireNumbers": true,
            "RequireSymbols": false
        }
    }' \
    --auto-verified-attributes email \
    --username-attributes email \
    --schema '[
        {
            "Name": "email",
            "AttributeDataType": "String",
            "Required": true,
            "Mutable": true
        },
        {
            "Name": "given_name",
            "AttributeDataType": "String",
            "Required": false,
            "Mutable": true
        },
        {
            "Name": "family_name",
            "AttributeDataType": "String",
            "Required": false,
            "Mutable": true
        },
        {
            "Name": "role",
            "AttributeDataType": "String",
            "Required": false,
            "Mutable": true,
            "DeveloperOnlyAttribute": false
        }
    ]' \
    --verification-message-template '{
        "DefaultEmailOption": "CONFIRM_WITH_CODE",
        "EmailMessage": "Welcome to PetVerse! Your verification code is {####}",
        "EmailSubject": "PetVerse - Verify your email"
    }' \
    --email-configuration '{
        "EmailSendingAccount": "COGNITO_DEFAULT"
    }' \
    --admin-create-user-config '{
        "AllowAdminCreateUserOnly": false,
        "InviteMessageTemplate": {
            "EmailMessage": "Welcome to PetVerse! Your username is {username} and temporary password is {####}",
            "EmailSubject": "Welcome to PetVerse"
        }
    }' \
    --user-pool-tags "Project=$PROJECT_NAME,Environment=development" \
    --query 'UserPool.Id' \
    --output text)

echo "✅ User Pool created: $USER_POOL_ID"

# Create User Pool Client
echo "📱 Creating User Pool Client..."
CLIENT_ID=$(aws cognito-idp create-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-name "$CLIENT_NAME" \
    --region "$REGION" \
    --no-generate-secret \
    --explicit-auth-flows USER_SRP_AUTH ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --supported-identity-providers COGNITO \
    --callback-urls "http://localhost:3001/,https://localhost:3001/" \
    --logout-urls "http://localhost:3001/,https://localhost:3001/" \
    --allowed-o-auth-flows code \
    --allowed-o-auth-scopes email openid profile \
    --allowed-o-auth-flows-user-pool-client \
    --prevent-user-existence-errors ENABLED \
    --enable-token-revocation \
    --query 'UserPoolClient.ClientId' \
    --output text)

echo "✅ User Pool Client created: $CLIENT_ID"

# Create Identity Pool (optional, for additional AWS service access)
echo "🆔 Creating Identity Pool..."
IDENTITY_POOL_ID=$(aws cognito-identity create-identity-pool \
    --identity-pool-name "$PROJECT_NAME-identity-pool" \
    --region "$REGION" \
    --allow-unauthenticated-identities \
    --cognito-identity-providers "ProviderName=cognito-idp.$REGION.amazonaws.com/$USER_POOL_ID,ClientId=$CLIENT_ID,ServerSideTokenCheck=false" \
    --query 'IdentityPoolId' \
    --output text)

echo "✅ Identity Pool created: $IDENTITY_POOL_ID"

# Create IAM roles for authenticated and unauthenticated users
echo "👤 Creating IAM roles..."

# Authenticated role
AUTHENTICATED_ROLE_NAME="$PROJECT_NAME-authenticated-role"
aws iam create-role \
    --role-name "$AUTHENTICATED_ROLE_NAME" \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Federated": "cognito-identity.amazonaws.com"
                },
                "Action": "sts:AssumeRoleWithWebIdentity",
                "Condition": {
                    "StringEquals": {
                        "cognito-identity.amazonaws.com:aud": "'$IDENTITY_POOL_ID'"
                    },
                    "ForAnyValue:StringLike": {
                        "cognito-identity.amazonaws.com:amr": "authenticated"
                    }
                }
            }
        ]
    }' > /dev/null

# Unauthenticated role
UNAUTHENTICATED_ROLE_NAME="$PROJECT_NAME-unauthenticated-role"
aws iam create-role \
    --role-name "$UNAUTHENTICATED_ROLE_NAME" \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Federated": "cognito-identity.amazonaws.com"
                },
                "Action": "sts:AssumeRoleWithWebIdentity",
                "Condition": {
                    "StringEquals": {
                        "cognito-identity.amazonaws.com:aud": "'$IDENTITY_POOL_ID'"
                    },
                    "ForAnyValue:StringLike": {
                        "cognito-identity.amazonaws.com:amr": "unauthenticated"
                    }
                }
            }
        ]
    }' > /dev/null

echo "✅ IAM roles created"

# Get role ARNs
AUTHENTICATED_ROLE_ARN=$(aws iam get-role --role-name "$AUTHENTICATED_ROLE_NAME" --query 'Role.Arn' --output text)
UNAUTHENTICATED_ROLE_ARN=$(aws iam get-role --role-name "$UNAUTHENTICATED_ROLE_NAME" --query 'Role.Arn' --output text)

# Set Identity Pool roles
echo "🔗 Setting Identity Pool roles..."
aws cognito-identity set-identity-pool-roles \
    --identity-pool-id "$IDENTITY_POOL_ID" \
    --roles "authenticated=$AUTHENTICATED_ROLE_ARN,unauthenticated=$UNAUTHENTICATED_ROLE_ARN" \
    --region "$REGION"

echo "✅ Identity Pool roles configured"

# Create admin user
echo "👨‍💼 Creating admin user..."
aws cognito-idp admin-create-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "admin@petverse.com" \
    --user-attributes "Name=email,Value=admin@petverse.com" "Name=given_name,Value=Admin" "Name=family_name,Value=User" "Name=custom:role,Value=admin" \
    --temporary-password "TempPass123!" \
    --message-action SUPPRESS \
    --region "$REGION" > /dev/null

# Set permanent password for admin
aws cognito-idp admin-set-user-password \
    --user-pool-id "$USER_POOL_ID" \
    --username "admin@petverse.com" \
    --password "Admin123!" \
    --permanent \
    --region "$REGION"

echo "✅ Admin user created: admin@petverse.com / Admin123!"

# Output configuration
echo ""
echo "🎉 AWS Cognito setup completed successfully!"
echo ""
echo "📋 Configuration Details:"
echo "========================"
echo "Region: $REGION"
echo "User Pool ID: $USER_POOL_ID"
echo "User Pool Client ID: $CLIENT_ID"
echo "Identity Pool ID: $IDENTITY_POOL_ID"
echo ""
echo "👤 Test Admin Account:"
echo "Email: admin@petverse.com"
echo "Password: Admin123!"
echo "Role: admin"
echo ""
echo "📝 Next Steps:"
echo "1. Update src/aws-config.js with the above values"
echo "2. Switch from MockAuthContext to AuthContext in src/App.js"
echo "3. Test the authentication with the admin account"
echo ""

# Save configuration to file
cat > cognito-config.json << EOF
{
  "region": "$REGION",
  "userPoolId": "$USER_POOL_ID",
  "userPoolClientId": "$CLIENT_ID",
  "identityPoolId": "$IDENTITY_POOL_ID",
  "adminUser": {
    "email": "admin@petverse.com",
    "password": "Admin123!",
    "role": "admin"
  }
}
EOF

echo "💾 Configuration saved to: cognito-config.json"
echo ""
echo "🔧 To update your app configuration, run:"
echo "   node scripts/update-config.js"
