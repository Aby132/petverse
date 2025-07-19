#!/bin/bash

# Petverse Lambda Deployment Script
# This script helps deploy the Lambda functions to AWS

set -e

echo "🚀 Starting Petverse Lambda deployment..."

# Configuration
FUNCTION_NAME_PRODUCT="petverse-product-handler"
FUNCTION_NAME_IMAGE="petverse-image-upload-handler"
REGION="us-east-1"
RUNTIME="nodejs22.x"
HANDLER="productHandler.handler"
IMAGE_HANDLER="imageUploadHandler.handler"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials are not configured. Please run 'aws configure' first."
    exit 1
fi

print_status "AWS credentials verified"

# Create deployment package for product handler
print_status "Creating deployment package for product handler..."
cd "$(dirname "$0")"

# Install dependencies
print_status "Installing dependencies..."
npm install --production

# Create deployment package
print_status "Creating deployment package..."
zip -r product-handler.zip productHandler.js node_modules package.json

# Deploy product handler
print_status "Deploying product handler Lambda..."
if aws lambda get-function --function-name $FUNCTION_NAME_PRODUCT --region $REGION &> /dev/null; then
    print_status "Updating existing product handler function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME_PRODUCT \
        --zip-file fileb://product-handler.zip \
        --region $REGION
else
    print_status "Creating new product handler function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME_PRODUCT \
        --runtime $RUNTIME \
        --handler $HANDLER \
        --zip-file fileb://product-handler.zip \
        --role arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/petverse-lambda-role \
        --region $REGION \
        --timeout 30 \
        --memory-size 256
fi

# Create deployment package for image upload handler
print_status "Creating deployment package for image upload handler..."
zip -r image-upload-handler.zip imageUploadHandler.js node_modules package.json

# Deploy image upload handler
print_status "Deploying image upload handler Lambda..."
if aws lambda get-function --function-name $FUNCTION_NAME_IMAGE --region $REGION &> /dev/null; then
    print_status "Updating existing image upload handler function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME_IMAGE \
        --zip-file fileb://image-upload-handler.zip \
        --region $REGION
else
    print_status "Creating new image upload handler function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME_IMAGE \
        --runtime $RUNTIME \
        --handler $IMAGE_HANDLER \
        --zip-file fileb://image-upload-handler.zip \
        --role arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/petverse-lambda-role \
        --region $REGION \
        --timeout 30 \
        --memory-size 256
fi

# Clean up deployment packages
print_status "Cleaning up deployment packages..."
rm -f product-handler.zip image-upload-handler.zip

print_status "✅ Lambda functions deployed successfully!"
print_status "📝 Next steps:"
print_status "   1. Set up API Gateway (see AWS_LAMBDA_SETUP.md)"
print_status "   2. Configure environment variables in Lambda console"
print_status "   3. Test the endpoints using the API Test component"

echo ""
print_warning "Remember to:"
echo "   - Set TABLE_NAME environment variable for product handler"
echo "   - Set BUCKET_NAME environment variable for image upload handler"
echo "   - Configure API Gateway to use these Lambda functions"
echo "   - Enable CORS in API Gateway" 