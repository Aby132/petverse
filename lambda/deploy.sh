#!/bin/bash

# PetVerse Lambda Deployment Script
# Deploys order and cart handlers to AWS Lambda

set -e

echo "🚀 Starting PetVerse Lambda deployment..."

# Check if Node.js and npm are installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 22.x first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Configuration
ORDER_FUNCTION_NAME="petverse-order-handler"
CART_FUNCTION_NAME="petverse-cart-handler"
REGION="us-east-1"
RUNTIME="nodejs22.x"
HANDLER="orderHandler.handler"
CART_HANDLER="cartHandler.handler"
TIMEOUT=30
MEMORY_SIZE=512

# Clean up old deployment packages and node_modules
echo "🧹 Cleaning up old files..."
rm -f *.zip
rm -rf node_modules

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Create deployment package for order handler
echo "📦 Creating deployment package for order handler..."
zip -r "${ORDER_FUNCTION_NAME}.zip" orderHandler.js package.json node_modules/

# Create deployment package for cart handler
echo "📦 Creating deployment package for cart handler..."
zip -r "${CART_FUNCTION_NAME}.zip" cartHandler.js package.json node_modules/

# Deploy order handler
echo "🚀 Deploying order handler..."
if aws lambda get-function --function-name "$ORDER_FUNCTION_NAME" --region "$REGION" &> /dev/null; then
    echo "📝 Updating existing order handler function..."
    aws lambda update-function-code \
        --function-name "$ORDER_FUNCTION_NAME" \
        --zip-file "fileb://${ORDER_FUNCTION_NAME}.zip" \
        --region "$REGION"
    
    aws lambda update-function-configuration \
        --function-name "$ORDER_FUNCTION_NAME" \
        --runtime "$RUNTIME" \
        --timeout "$TIMEOUT" \
        --memory-size "$MEMORY_SIZE" \
        --environment Variables="ORDERS_TABLE=petverse-orders,RAZORPAY_KEY_ID=rzp_test_R79jO6N4F99QLG,RAZORPAY_KEY_SECRET=HgKjdH7mCViwebMQTIFmbx7R" \
        --region "$REGION"
else
    echo "🆕 Creating new order handler function..."
    aws lambda create-function \
        --function-name "$ORDER_FUNCTION_NAME" \
        --runtime "$RUNTIME" \
        --role "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/lambda-execution-role" \
        --handler "$HANDLER" \
        --zip-file "fileb://${ORDER_FUNCTION_NAME}.zip" \
        --timeout "$TIMEOUT" \
        --memory-size "$MEMORY_SIZE" \
        --environment Variables="ORDERS_TABLE=petverse-orders,RAZORPAY_KEY_ID=rzp_test_R79jO6N4F99QLG,RAZORPAY_KEY_SECRET=HgKjdH7mCViwebMQTIFmbx7R" \
        --region "$REGION"
fi

# Deploy cart handler
echo "🚀 Deploying cart handler..."
if aws lambda get-function --function-name "$CART_FUNCTION_NAME" --region "$REGION" &> /dev/null; then
    echo "📝 Updating existing cart handler function..."
    aws lambda update-function-code \
        --function-name "$CART_FUNCTION_NAME" \
        --zip-file "fileb://${CART_FUNCTION_NAME}.zip" \
        --region "$REGION"
    
    aws lambda update-function-configuration \
        --function-name "$CART_FUNCTION_NAME" \
        --runtime "$RUNTIME" \
        --timeout "$TIMEOUT" \
        --memory-size "$MEMORY_SIZE" \
        --environment Variables="CART_TABLE=petverse-cart" \
        --region "$REGION"
else
    echo "🆕 Creating new cart handler function..."
    aws lambda create-function \
        --function-name "$CART_FUNCTION_NAME" \
        --runtime "$RUNTIME" \
        --role "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/lambda-execution-role" \
        --handler "$CART_HANDLER" \
        --zip-file "fileb://${CART_FUNCTION_NAME}.zip" \
        --timeout "$TIMEOUT" \
        --memory-size "$MEMORY_SIZE" \
        --environment Variables="CART_TABLE=petverse-cart" \
        --region "$REGION"
fi

# Clean up deployment packages
echo "🧹 Cleaning up deployment packages..."
rm -f *.zip

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Deployed Functions:"
echo "  - $ORDER_FUNCTION_NAME (Orders & Razorpay)"
echo "  - $CART_FUNCTION_NAME (Cart operations)"
echo ""
echo "🔗 Next steps:"
echo "  1. Configure API Gateway to use these Lambda functions"
echo "  2. Set up DynamoDB tables: petverse-orders, petverse-cart"
echo "  3. Test the endpoints"
echo ""
echo "📚 See API_GATEWAY_SETUP.md for detailed configuration steps" 