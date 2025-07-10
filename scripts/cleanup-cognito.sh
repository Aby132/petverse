#!/bin/bash

# AWS Cognito Cleanup Script for PetVerse
# This script removes all Cognito resources created by setup-cognito.sh

set -e  # Exit on any error

CONFIG_FILE="cognito-config.json"
PROJECT_NAME="petverse"

echo "🧹 Cleaning up AWS Cognito resources for PetVerse..."

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ cognito-config.json not found. Cannot determine resources to clean up."
    exit 1
fi

# Read configuration
REGION=$(cat $CONFIG_FILE | jq -r '.region')
USER_POOL_ID=$(cat $CONFIG_FILE | jq -r '.userPoolId')
IDENTITY_POOL_ID=$(cat $CONFIG_FILE | jq -r '.identityPoolId')

echo "📖 Reading configuration from $CONFIG_FILE"
echo "Region: $REGION"
echo "User Pool ID: $USER_POOL_ID"
echo "Identity Pool ID: $IDENTITY_POOL_ID"
echo ""

# Confirm deletion
read -p "⚠️  Are you sure you want to delete all Cognito resources? This cannot be undone. (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled."
    exit 1
fi

echo "🗑️  Starting cleanup process..."

# Delete User Pool (this also deletes the client)
echo "🗑️  Deleting User Pool..."
aws cognito-idp delete-user-pool \
    --user-pool-id "$USER_POOL_ID" \
    --region "$REGION"

echo "✅ User Pool deleted"

# Delete Identity Pool
echo "🗑️  Deleting Identity Pool..."
aws cognito-identity delete-identity-pool \
    --identity-pool-id "$IDENTITY_POOL_ID" \
    --region "$REGION"

echo "✅ Identity Pool deleted"

# Delete IAM roles
echo "🗑️  Deleting IAM roles..."

AUTHENTICATED_ROLE_NAME="$PROJECT_NAME-authenticated-role"
UNAUTHENTICATED_ROLE_NAME="$PROJECT_NAME-unauthenticated-role"

# Delete authenticated role
aws iam delete-role \
    --role-name "$AUTHENTICATED_ROLE_NAME" 2>/dev/null || echo "⚠️  Authenticated role not found or already deleted"

# Delete unauthenticated role
aws iam delete-role \
    --role-name "$UNAUTHENTICATED_ROLE_NAME" 2>/dev/null || echo "⚠️  Unauthenticated role not found or already deleted"

echo "✅ IAM roles deleted"

# Clean up local files
echo "🧹 Cleaning up local configuration files..."

# Remove config file
rm -f "$CONFIG_FILE"
echo "✅ Removed cognito-config.json"

# Remove environment file
rm -f ".env.local"
echo "✅ Removed .env.local"

# Switch back to mock authentication
if [ -f "scripts/use-mock-auth.js" ]; then
    node scripts/use-mock-auth.js
    echo "✅ Switched back to mock authentication"
fi

echo ""
echo "🎉 Cleanup completed successfully!"
echo ""
echo "📋 What was cleaned up:"
echo "======================"
echo "✅ User Pool and all users deleted"
echo "✅ User Pool Client deleted"
echo "✅ Identity Pool deleted"
echo "✅ IAM roles deleted"
echo "✅ Local configuration files removed"
echo "✅ App switched back to mock authentication"
echo ""
echo "🚀 Next Steps:"
echo "1. Restart your development server: npm start"
echo "2. App will now use mock authentication"
echo "3. To set up AWS Cognito again, run: ./scripts/setup-cognito.sh"
