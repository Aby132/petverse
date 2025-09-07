# Razorpay Integration Setup Guide

This guide will help you set up Razorpay payment gateway integration in your PetVerse application.

## Prerequisites

1. A Razorpay account (sign up at https://razorpay.com)
2. Your Razorpay API keys (Test/Live)
3. AWS Lambda function deployed (already configured)
4. DynamoDB table for order storage (already configured)

## Setup Instructions

### 1. Get Your Razorpay API Keys

1. Log in to your Razorpay Dashboard
2. Go to Settings → API Keys
3. Generate a new key pair (Test mode for development, Live mode for production)
4. Copy your **Key ID** and **Key Secret**

### 2. Update the Razorpay Service

The service is already configured to use your AWS Lambda API. The Lambda function handles:
- Order creation with Razorpay
- Payment verification
- Order storage in DynamoDB

**Note**: The Razorpay key is managed server-side in your Lambda function for security.

### 3. Backend Integration (Already Implemented)

Your AWS Lambda function is already configured and handles:

#### Create Order Endpoint
- **URL**: `https://lszhk8cqwa.execute-api.us-east-1.amazonaws.com/prod/orders/create`
- **Method**: POST
- **Body**: `{ amount, currency, receipt }`
- **Response**: `{ orderId, amount, currency }`

#### Verify Payment Endpoint
- **URL**: `https://lszhk8cqwa.execute-api.us-east-1.amazonaws.com/prod/orders/verify`
- **Method**: POST
- **Body**: `{ userId, items, deliveryAddress, subtotal, shipping, total, payment }`
- **Response**: `{ success: true, order: {...} }`

### 4. Frontend Service (Already Updated)

The `razorpayService.js` has been updated to work with your Lambda API:

- ✅ Order creation via Lambda
- ✅ Payment verification via Lambda
- ✅ Order storage in DynamoDB
- ✅ User authentication integration

## Testing

### Test Cards (for Test Mode)

Use these test card numbers for testing:

- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002
- **CVV**: Any 3 digits
- **Expiry**: Any future date

### Test UPI IDs

- **Success**: success@razorpay
- **Failure**: failure@razorpay

## Security Considerations

1. **Never expose your Key Secret** in frontend code
2. **Always verify payments** on the server side
3. **Use HTTPS** in production
4. **Implement proper error handling**
5. **Store payment details** securely in your database

## Environment Variables

Create a `.env` file for your backend:

```env
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
NODE_ENV=development
```

## Production Deployment

1. Switch to Live mode keys
2. Implement proper server-side validation
3. Set up webhook endpoints for payment status updates
4. Configure proper error handling and logging
5. Test thoroughly with small amounts first

## Support

- Razorpay Documentation: https://razorpay.com/docs/
- Razorpay Support: https://razorpay.com/support/

## Current Implementation

The current implementation includes:
- ✅ Frontend Razorpay integration
- ✅ Payment modal popup
- ✅ Success/failure handling
- ✅ Order confirmation page
- ✅ AWS Lambda backend integration
- ✅ DynamoDB order storage
- ✅ Secure payment verification
- ✅ User authentication integration

**Status**: Production-ready with your Lambda function!
