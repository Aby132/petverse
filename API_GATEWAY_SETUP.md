# API Gateway Setup Guide for PetVerse Razorpay Integration

## 🚀 **Quick Setup Summary**

**Base URL**: `https://878y9a1ejc.execute-api.us-east-1.amazonaws.com/prod`

**Required Resources**:
- `/orders` - Order management
- `/razorpay` - Razorpay payment processing
- `/cart` - Cart operations
- `/products` - Product management
- `/users` - User management

---

## 📋 **Step-by-Step API Gateway Configuration**

### 1. **Create REST API**
- **API Name**: `petverse-api`
- **Description**: PetVerse e-commerce API with Razorpay integration
- **Endpoint Type**: Regional
- **Region**: `us-east-1`

### 2. **Create Resources**

#### **Root Resource (`/`)**
- **Resource Name**: `/`
- **Resource Path**: `/`

#### **Orders Resource (`/orders`)**
- **Resource Name**: `orders`
- **Resource Path**: `/orders`
- **Methods**: `POST`, `GET`, `PUT`

#### **Razorpay Resource (`/razorpay`)**
- **Resource Name**: `razorpay`
- **Resource Path**: `/razorpay`
- **Methods**: `POST`

#### **Cart Resource (`/cart`)**
- **Resource Name**: `cart`
- **Resource Path**: `/cart`
- **Methods**: `GET`, `POST`, `PUT`, `DELETE`

#### **Products Resource (`/products`)**
- **Resource Name**: `products`
- **Resource Path**: `/products`
- **Methods**: `GET`, `POST`, `PUT`, `DELETE`

#### **Users Resource (`/users`)**
- **Resource Name**: `users`
- **Resource Path**: `/users`
- **Methods**: `GET`, `POST`, `PUT`, `DELETE`

---

## 🔧 **Method Configuration**

### **POST /orders**
- **Integration Type**: Lambda Proxy
- **Lambda Function**: `petverse-order-handler`
- **Use Lambda Proxy integration**: ✅ Yes

### **POST /razorpay**
- **Integration Type**: Lambda Proxy
- **Lambda Function**: `petverse-order-handler`
- **Use Lambda Proxy integration**: ✅ Yes

### **GET /cart**
- **Integration Type**: Lambda Proxy
- **Lambda Function**: `petverse-cart-handler` (create this)
- **Use Lambda Proxy integration**: ✅ Yes

### **GET /products**
- **Integration Type**: Lambda Proxy
- **Lambda Function**: `petverse-products-handler` (create this)
- **Use Lambda Proxy integration**: ✅ Yes

### **GET /users**
- **Integration Type**: Lambda Proxy
- **Lambda Function**: `petverse-users-handler` (create this)
- **Use Lambda Proxy integration**: ✅ Yes

---

## 🌐 **CORS Configuration**

### **Enable CORS for All Resources**
- **Access-Control-Allow-Origin**: `*`
- **Access-Control-Allow-Headers**: `Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token`
- **Access-Control-Allow-Methods**: `GET,POST,PUT,DELETE,OPTIONS`
- **Access-Control-Allow-Credentials**: `false`

### **CORS Headers to Add**
```json
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
}
```

---

## 📝 **Lambda Function Requirements**

### **1. petverse-order-handler** (Main Function)
- **Runtime**: Node.js 22.x
- **Handler**: `orderHandler.handler`
- **Environment Variables**:
  - `ORDERS_TABLE`: `petverse-orders`
  - `RAZORPAY_KEY_ID`: `rzp_test_R79jO6N4F99QLG`
  - `RAZORPAY_KEY_SECRET`: `HgKjdH7mCViwebMQTIFmbx7R`

### **2. petverse-cart-handler** (Create This)
- **Runtime**: Node.js 22.x
- **Handler**: `cartHandler.handler`
- **Environment Variables**:
  - `CART_TABLE`: `petverse-cart`

### **3. petverse-products-handler** (Create This)
- **Runtime**: Node.js 22.x
- **Handler**: `productsHandler.handler`
- **Environment Variables**:
  - `PRODUCTS_TABLE`: `petverse-products`

### **4. petverse-users-handler** (Create This)
- **Runtime**: Node.js 22.x
- **Handler**: `usersHandler.handler`
- **Environment Variables**:
  - `USERS_TABLE`: `petverse-users`

---

## 🚀 **Deployment Steps**

### **1. Deploy Lambda Functions**
```bash
cd lambda
./deploy.sh
```

### **2. Deploy API Gateway**
- Click **Actions** → **Deploy API**
- **Deployment stage**: `prod`
- **Stage description**: `Production deployment`

### **3. Test Endpoints**
```bash
# Test health check
curl https://878y9a1ejc.execute-api.us-east-1.amazonaws.com/prod/orders/health

# Test order creation
curl -X POST https://878y9a1ejc.execute-api.us-east-1.amazonaws.com/prod/orders/create \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

---

## 🔒 **Security & IAM**

### **Lambda Execution Role**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/petverse-*"
    }
  ]
}
```

---

## 📊 **Monitoring & Logging**

### **CloudWatch Logs**
- **Log Group**: `/aws/lambda/petverse-*`
- **Retention**: 7 days (adjust as needed)

### **API Gateway Metrics**
- **4XX Errors**: Monitor client errors
- **5XX Errors**: Monitor server errors
- **Latency**: Monitor response times

---

## 🧪 **Testing Checklist**

- [ ] Lambda functions deploy successfully
- [ ] API Gateway deploys without errors
- [ ] CORS headers are present in responses
- [ ] Health check endpoint responds
- [ ] Order creation works
- [ ] Razorpay order creation works
- [ ] Payment verification works
- [ ] Frontend can connect to all endpoints

---

## 🆘 **Troubleshooting**

### **Common Issues**
1. **CORS Errors**: Ensure CORS is enabled on all resources
2. **Lambda Timeout**: Increase timeout to 30 seconds
3. **Permission Denied**: Check IAM roles and policies
4. **API Not Found**: Verify resource paths and methods

### **Debug Commands**
```bash
# Check Lambda logs
aws logs tail /aws/lambda/petverse-order-handler --follow

# Test API Gateway
aws apigateway get-rest-api --rest-api-id 878y9a1ejc
```

---

## 📞 **Support**

If you encounter issues:
1. Check CloudWatch logs for Lambda functions
2. Verify API Gateway configuration
3. Test endpoints individually
4. Ensure all environment variables are set

**Your API Gateway is ready at**: `https://878y9a1ejc.execute-api.us-east-1.amazonaws.com/prod`
