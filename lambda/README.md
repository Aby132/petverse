# PetVerse Order Handler Lambda

This Lambda function handles order creation, Razorpay payment integration, and DynamoDB operations for the PetVerse e-commerce platform.

## Features

- ✅ Order creation and management
- ✅ Razorpay payment integration
- ✅ Payment verification with signature validation
- ✅ DynamoDB storage with proper error handling
- ✅ CORS support for frontend integration
- ✅ Comprehensive logging and error handling

## Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js 22.x installed
- npm installed
- AWS Console access

## Setup Instructions

### 1. Create DynamoDB Table

1. Go to AWS Console → DynamoDB
2. Click "Create table"
3. **Table name**: `petverse-orders`
4. **Partition key**: `orderId` (String)
5. **Table settings**: Choose "Customize settings"
6. **Read/Write capacity**: Choose "On-demand"
7. Click "Create table"

### 2. Create Lambda Function

1. Go to AWS Console → Lambda
2. Click "Create function"
3. **Function name**: `petverse-order-handler`
4. **Runtime**: Node.js 22.x
5. **Architecture**: x86_64
6. Click "Create function"

### 3. Deploy Lambda Function

1. Navigate to the `lambda` directory
2. Make the deployment script executable:
   ```bash
   chmod +x deploy.sh
   ```
3. Run the deployment script:
   ```bash
   ./deploy.sh
   ```

### 4. Create API Gateway

1. Go to AWS Console → API Gateway
2. Click "Create API"
3. Choose "REST API" → "Build"
4. **API name**: `petverse-orders-api`
5. Click "Create API"

#### Create Resources and Methods

1. **Create resource** `/orders`
2. **Create resource** `/razorpay`
3. **Create sub-resource** `/create` under `/orders`
4. **Create sub-resource** `/create-order` under `/razorpay`
5. **Create sub-resource** `/verify-payment` under `/razorpay`
6. **Create resource** `/orders/{orderId}/status`

#### Configure Methods

1. **POST** `/orders/create` → Integrate with Lambda
2. **POST** `/razorpay/create-order` → Integrate with Lambda
3. **POST** `/razorpay/verify-payment` → Integrate with Lambda
4. **PUT** `/orders/{orderId}/status` → Integrate with Lambda

#### Enable CORS

1. For each resource, click "Actions" → "Enable CORS"
2. Set **Access-Control-Allow-Origin**: `*`
3. Set **Access-Control-Allow-Headers**: `Content-Type,Authorization`
4. Set **Access-Control-Allow-Methods**: `GET,POST,PUT,DELETE,OPTIONS`
5. Click "Enable CORS and replace existing CORS headers"

### 5. Configure Lambda Environment Variables

1. In Lambda Console, go to "Configuration" tab
2. Click "Environment variables"
3. Add:
   - `ORDERS_TABLE`: `petverse-orders`

### 6. Configure Lambda IAM Role

1. In Lambda Console, go to "Configuration" tab
2. Click "Permissions"
3. Click on the execution role
4. Click "Attach policies"
5. Create inline policy with:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": "arn:aws:dynamodb:*:*:table/petverse-orders"
        }
    ]
}
```

### 7. Update Frontend Configuration

1. Update `src/config/environment.js` with your API Gateway URLs:
   ```javascript
   orders: 'https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/prod/orders',
   razorpay: 'https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/prod/razorpay'
   ```

2. Set environment variables:
   ```bash
   REACT_APP_ORDERS_API_URL=https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/prod/orders
   REACT_APP_RAZORPAY_API_URL=https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/prod/razorpay
   ```

## API Endpoints

### Orders
- `POST /orders/create` - Create new order
- `PUT /orders/{orderId}/status` - Update order status

### Razorpay
- `POST /razorpay/create-order` - Create Razorpay order
- `POST /razorpay/verify-payment` - Verify payment signature

## DynamoDB Schema

```json
{
  "orderId": "ORD-1234567890-abc123",
  "userId": "user123",
  "items": [...],
  "deliveryAddress": {...},
  "paymentMethod": "razorpay",
  "orderNotes": "Special delivery instructions",
  "subtotal": 1500,
  "shipping": 0,
  "total": 1500,
  "status": "pending|confirmed|failed",
  "paymentStatus": "pending|completed|failed",
  "paymentDetails": {...},
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Payment Flow

1. **Order Creation**: Frontend creates order via `/orders/create`
2. **Razorpay Order**: Lambda creates Razorpay order via `/razorpay/create-order`
3. **Payment**: Frontend opens Razorpay payment modal
4. **Verification**: On payment success, frontend calls `/razorpay/verify-payment`
5. **Status Update**: Lambda verifies signature and updates order status
6. **Completion**: Order marked as confirmed in DynamoDB

## Error Handling

- **Payment Failure**: Order status updated to 'failed'
- **Verification Failure**: Order status updated to 'failed'
- **Network Errors**: Proper error responses with status codes
- **Invalid Data**: Validation errors with descriptive messages

## Testing

1. **Test Order Creation**: Use test data to create orders
2. **Test Payment Flow**: Use Razorpay test keys
3. **Test Error Scenarios**: Test with invalid signatures, network failures
4. **Monitor Logs**: Check CloudWatch logs for debugging

## Security Features

- ✅ Razorpay signature verification
- ✅ Input validation and sanitization
- ✅ Proper error handling without data leakage
- ✅ CORS configuration for frontend security

## Monitoring

- **CloudWatch Logs**: All function executions logged
- **DynamoDB Metrics**: Monitor table performance
- **API Gateway Metrics**: Track API usage and errors
- **Lambda Metrics**: Monitor function performance

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure CORS is properly configured in API Gateway
2. **Permission Denied**: Check Lambda IAM role permissions
3. **Table Not Found**: Verify DynamoDB table name and region
4. **Payment Verification Failed**: Check Razorpay keys and signature logic

### Debug Steps

1. Check CloudWatch logs for error details
2. Verify API Gateway integration
3. Test endpoints individually
4. Check environment variables
5. Verify DynamoDB table permissions

## Support

For issues or questions:
1. Check CloudWatch logs
2. Verify configuration settings
3. Test with minimal data
4. Review API Gateway settings

## License

MIT License - see LICENSE file for details
