# 🚀 AWS Lambda Setup Guide for Petverse Product Management

This guide will help you set up the complete AWS infrastructure for your Petverse product management system.

## 📋 Prerequisites
- AWS Account with appropriate permissions
- Node.js 22.x installed locally (for Lambda deployment)
- AWS CLI configured

---

## 1. **DynamoDB Table Setup**

### Step 1: Create DynamoDB Table
1. Go to AWS Console → DynamoDB → Create Table
2. **Table name:** `PetverseProducts`
3. **Partition key:** `productId` (String)
4. **Sort key:** Leave blank
5. **Settings:** Use default (on-demand capacity)
6. Click **Create table**

### Step 2: Table Structure
Your table will store products with this structure:
```json
{
  "productId": "prod_1234567890_abc123",
  "name": "Premium Dog Food",
  "description": "High-quality nutrition for your beloved dog",
  "price": 25.99,
  "category": "food",
  "stock": 50,
  "brand": "PetCare",
  "weight": "5kg",
  "isFeatured": true,
  "isActive": true,
  "images": [
    {
      "imageUrl": "https://your-bucket.s3.amazonaws.com/products/image.jpg",
      "originalName": "dog-food.jpg",
      "uploadedAt": "2024-01-15T10:30:00Z",
      "order": 0
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

## 2. **S3 Bucket Setup**

### Step 1: Create S3 Bucket
1. Go to AWS Console → S3 → Create bucket
2. **Bucket name:** `petverse-product-images-<your-unique-suffix>`
   - Example: `petverse-product-images-john-doe-2024`
3. **Region:** Same as your Lambda functions
4. **Block Public Access:** Keep all blocks enabled (recommended)
5. **Bucket Versioning:** Enable (optional but recommended)
6. Click **Create bucket**

### Step 2: Configure CORS (if needed)
If you plan to upload directly from browser:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "POST", "PUT"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

---

## 3. **IAM Role Setup**

### Step 1: Create Lambda Execution Role
1. Go to IAM → Roles → Create role
2. **Trusted entity:** AWS service → Lambda
3. **Permissions:** Attach these policies:
   - `AWSLambdaBasicExecutionRole`
   - Create custom policy for DynamoDB and S3 access

### Step 2: Custom Policy
Create a custom policy with this JSON:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Scan",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/PetverseProducts"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::petverse-product-images-*/*"
    }
  ]
}
```

---

## 4. **Lambda Functions Setup**

### Step 1: Create Product Handler Lambda
1. Go to Lambda → Create function
2. **Function name:** `petverse-product-handler`
3. **Runtime:** Node.js 22.x
4. **Architecture:** x86_64
5. **Execution role:** Use the role you created above
6. Click **Create function**

### Step 2: Upload Product Handler Code
Replace the default code with the `productHandler.js` code provided earlier.

### Step 3: Configure Environment Variables
Add these environment variables:
- `TABLE_NAME`: `PetverseProducts`

### Step 4: Create Image Upload Handler Lambda
1. Create another function: `petverse-image-upload-handler`
2. Use the same runtime and role
3. Upload the `imageUploadHandler.js` code
4. Add environment variable:
- `BUCKET_NAME`: Your S3 bucket name

---

## 5. **API Gateway Setup**

### Step 1: Create REST API
1. Go to API Gateway → Create API
2. **API name:** `petverse-api`
3. **Endpoint Type:** Regional
4. Click **Create API**

### Step 2: Create Resources
Create these resources:
- `/products` (for GET all, POST create)
- `/products/{productId}` (for GET single, PUT update, DELETE)
- `/upload` (for POST image upload)

### Step 3: Configure Methods
For each resource, create the appropriate HTTP methods and integrate with your Lambda functions.

### Step 4: Enable CORS
For each resource:
1. Select the resource
2. Actions → Enable CORS
3. Accept defaults or customize as needed
4. Click **Enable CORS**

### Step 5: Deploy API
1. Actions → Deploy API
2. **Stage name:** `prod`
3. Click **Deploy**

Your API endpoint will be:
`https://<api-id>.execute-api.<region>.amazonaws.com/prod`

---

## 6. **Test Your Setup**

### Step 1: Test API Connection
Use the API Test component in your React app to verify:
- ✅ API connection
- ✅ Create product
- ✅ Read product
- ✅ Update product
- ✅ Delete product
- ✅ Image upload

### Step 2: Manual Testing
You can also test with curl or Postman:

**Create Product:**
```bash
curl -X POST https://your-api-id.execute-api.region.amazonaws.com/prod/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "description": "Test description",
    "price": 19.99,
    "category": "toys",
    "stock": 10
  }'
```

**Get All Products:**
```bash
curl https://your-api-id.execute-api.region.amazonaws.com/prod/products
```

---

## 7. **Troubleshooting**

### Common Issues:
1. **403 Forbidden:** Check IAM permissions
2. **500 Internal Server Error:** Check Lambda logs in CloudWatch
3. **CORS errors:** Verify CORS is enabled on all resources
4. **Image upload fails:** Check S3 bucket permissions

### Debug Steps:
1. Check CloudWatch logs for Lambda functions
2. Verify environment variables are set correctly
3. Test API Gateway endpoints directly
4. Check IAM role permissions

---

## 8. **Production Considerations**

### Security:
- Restrict S3 bucket access
- Use API keys or Cognito authorizers
- Implement proper error handling
- Add request validation

### Performance:
- Enable DynamoDB auto-scaling
- Use S3 lifecycle policies for old images
- Implement caching strategies
- Monitor Lambda cold starts

### Cost Optimization:
- Use DynamoDB on-demand billing for development
- Implement S3 lifecycle policies
- Monitor Lambda execution times
- Use API Gateway caching

---

## 9. **Next Steps**

1. ✅ Set up DynamoDB table
2. ✅ Create S3 bucket
3. ✅ Configure IAM roles
4. ✅ Deploy Lambda functions
5. ✅ Set up API Gateway
6. ✅ Test all endpoints
7. ✅ Update frontend service
8. ✅ Deploy to production

---

**Need help?** Check the AWS documentation or create an issue in your project repository. 