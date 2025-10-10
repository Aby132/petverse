# AWS Console Setup Guide - Step by Step

## Overview
This guide provides detailed step-by-step instructions for setting up AWS resources using the AWS Console for your PetVerse Animal Management System.

## Prerequisites
- AWS Account with admin permissions
- Access to AWS Console
- Existing Cognito Identity Pool: `us-east-1:3749f1ad-a6f8-4b3b-98aa-11efa9dcd5c8`

---

## 1. DynamoDB Setup

### Step 1.1: Create Animals Table

1. **Navigate to DynamoDB**
   - Go to AWS Console → Services → DynamoDB
   - Click "Create table"

2. **Configure Table**
   - **Table name**: `PetVerse-Animals`
   - **Partition key**: `animalId` (String)
   - **Sort key**: Leave empty
   - **Table settings**: Choose "Customize settings"

3. **Advanced Settings**
   - **Billing mode**: On-demand
   - **Encryption**: AWS owned key (default)
   - **Point-in-time recovery**: Enable (recommended)

4. **Add Global Secondary Index**
   - Click "Add index"
   - **Index name**: `userId-index`
   - **Partition key**: `userId` (String)
   - **Projected attributes**: All attributes

5. **Create Table**
   - Click "Create table"
   - Wait for table to be "Active"

### Step 1.2: Create Health Records Table

1. **Create New Table**
   - Click "Create table"

2. **Configure Table**
   - **Table name**: `PetVerse-HealthRecords`
   - **Partition key**: `recordId` (String)
   - **Table settings**: Choose "Customize settings"

3. **Advanced Settings**
   - **Billing mode**: On-demand
   - **Encryption**: AWS owned key (default)

4. **Add Global Secondary Index**
   - Click "Add index"
   - **Index name**: `animalId-index`
   - **Partition key**: `animalId` (String)
   - **Projected attributes**: All attributes

5. **Create Table**
   - Click "Create table"
   - Wait for table to be "Active"

---

## 2. S3 Bucket Setup

### Step 2.1: Create Animals Media Bucket

1. **Navigate to S3**
   - Go to AWS Console → Services → S3
   - Click "Create bucket"

2. **General Configuration**
   - **Bucket name**: `petverse-animals-media`
   - **AWS Region**: US East (N. Virginia) us-east-1
   - **Object Ownership**: ACLs disabled (recommended)

3. **Block Public Access Settings**
   - **Block all public access**: Uncheck this
   - **Block public access to buckets and objects granted through new access control lists (ACLs)**: Uncheck
   - **Block public access to buckets and objects granted through any access control lists (ACLs)**: Uncheck
   - **Block public access to buckets and objects granted through new public bucket or access point policies**: Uncheck
   - **Block public access to buckets and objects granted through any public bucket or access point policies**: Uncheck
   - Check the acknowledgment box

4. **Bucket Versioning**
   - **Bucket Versioning**: Disable (unless needed)

5. **Default Encryption**
   - **Server-side encryption**: Amazon S3 managed keys (SSE-S3)

6. **Create Bucket**
   - Click "Create bucket"

### Step 2.2: Create Health Records Bucket

1. **Create New Bucket**
   - Click "Create bucket"

2. **General Configuration**
   - **Bucket name**: `petverse-health-records`
   - **AWS Region**: US East (N. Virginia) us-east-1
   - **Object Ownership**: ACLs disabled (recommended)

3. **Block Public Access Settings**
   - **Block all public access**: Keep checked (health records should be private)

4. **Default Encryption**
   - **Server-side encryption**: Amazon S3 managed keys (SSE-S3)

5. **Create Bucket**
   - Click "Create bucket"

### Step 2.3: Configure Bucket Policies

#### Animals Media Bucket Policy (Public Read)
1. Go to `petverse-animals-media` bucket
2. Click "Permissions" tab
3. Scroll to "Bucket policy"
4. Click "Edit"
5. Add this policy:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::petverse-animals-media/*"
        }
    ]
}
```
6. Click "Save changes"

#### Health Records Bucket Policy (Cognito Access)
1. Go to `petverse-health-records` bucket
2. Click "Permissions" tab
3. Scroll to "Bucket policy"
4. Click "Edit"
5. Add this policy:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCognitoAccess",
            "Effect": "Allow",
            "Principal": {
                "Federated": "cognito-identity.amazonaws.com"
            },
            "Action": [
                "s3:GetObject",
                "s3:PutObject"
            ],
            "Resource": "arn:aws:s3:::petverse-health-records/*"
        }
    ]
}
```
6. Click "Save changes"

---

## 3. Lambda Function Setup

### Step 3.1: Create Animal Management Lambda

1. **Navigate to Lambda**
   - Go to AWS Console → Services → Lambda
   - Click "Create function"

2. **Function Configuration**
   - **Function name**: `PetVerse-AnimalManagement`
   - **Runtime**: Node.js 22.x
   - **Architecture**: x86_64
   - **Execution role**: Create a new role with basic Lambda permissions

3. **Create Function**
   - Click "Create function"

4. **Add Environment Variables**
   - Go to "Configuration" tab → "Environment variables"
   - Click "Edit"
   - Add variables:
     - `ANIMALS_TABLE`: `PetVerse-Animals`
     - `HEALTH_RECORDS_TABLE`: `PetVerse-HealthRecords`
     - `ANIMALS_BUCKET`: `petverse-animals-media`
     - `HEALTH_RECORDS_BUCKET`: `petverse-health-records`
   - Click "Save"

5. **Update Function Code**
   - Go to "Code" tab
   - Replace the default code with:

```javascript
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

const ANIMALS_TABLE = process.env.ANIMALS_TABLE;
const HEALTH_RECORDS_TABLE = process.env.HEALTH_RECORDS_TABLE;
const ANIMALS_BUCKET = process.env.ANIMALS_BUCKET;
const HEALTH_RECORDS_BUCKET = process.env.HEALTH_RECORDS_BUCKET;

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight' })
        };
    }

    try {
        const { httpMethod, pathParameters, body, queryStringParameters } = event;
        const userId = event.requestContext.authorizer?.claims?.sub || 'anonymous';

        switch (httpMethod) {
            case 'GET':
                if (pathParameters?.animalId) {
                    return await getAnimal(pathParameters.animalId, headers);
                } else {
                    return await getAnimals(userId, headers);
                }
            
            case 'POST':
                return await createAnimal(JSON.parse(body), userId, headers);
            
            case 'PUT':
                return await updateAnimal(pathParameters.animalId, JSON.parse(body), userId, headers);
            
            case 'DELETE':
                return await deleteAnimal(pathParameters.animalId, headers);
            
            default:
                return {
                    statusCode: 405,
                    headers,
                    body: JSON.stringify({ error: 'Method not allowed' })
                };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};

async function getAnimals(userId, headers) {
    const params = {
        TableName: ANIMALS_TABLE,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId
        }
    };

    const result = await dynamodb.query(params).promise();
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.Items)
    };
}

async function getAnimal(animalId, headers) {
    const params = {
        TableName: ANIMALS_TABLE,
        Key: { animalId }
    };

    const result = await dynamodb.get(params).promise();
    
    if (!result.Item) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Animal not found' })
        };
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.Item)
    };
}

async function createAnimal(animalData, userId, headers) {
    const animalId = uuidv4();
    const timestamp = new Date().toISOString();

    const animal = {
        animalId,
        userId,
        ...animalData,
        createdAt: timestamp,
        updatedAt: timestamp
    };

    const params = {
        TableName: ANIMALS_TABLE,
        Item: animal
    };

    await dynamodb.put(params).promise();

    return {
        statusCode: 201,
        headers,
        body: JSON.stringify(animal)
    };
}

async function updateAnimal(animalId, updateData, userId, headers) {
    const timestamp = new Date().toISOString();
    
    const updateExpression = 'SET updatedAt = :updatedAt';
    const expressionAttributeValues = { ':updatedAt': timestamp };
    const expressionAttributeNames = {};

    Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && updateData[key] !== '') {
            expressionAttributeNames[`#${key}`] = key;
            updateExpression += `, #${key} = :${key}`;
            expressionAttributeValues[`:${key}`] = updateData[key];
        }
    });

    const params = {
        TableName: ANIMALS_TABLE,
        Key: { animalId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ReturnValues: 'ALL_NEW'
    };

    const result = await dynamodb.update(params).promise();

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.Attributes)
    };
}

async function deleteAnimal(animalId, headers) {
    const params = {
        TableName: ANIMALS_TABLE,
        Key: { animalId }
    };

    await dynamodb.delete(params).promise();

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Animal deleted successfully' })
    };
}
```

6. **Install Dependencies**
   - In the Lambda console, go to "Code" tab
   - Click "Add a layer" or create a deployment package with uuid

### Step 3.2: Update Lambda Execution Role

1. **Go to IAM**
   - Go to AWS Console → Services → IAM
   - Click "Roles"
   - Find your Lambda execution role

2. **Add Permissions**
   - Click "Add permissions" → "Attach policies"
   - Add these policies:
     - `AmazonDynamoDBFullAccess`
     - `AmazonS3FullAccess`

3. **Or Create Custom Policy**
   - Click "Add permissions" → "Create inline policy"
   - Use JSON editor with this policy:

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
                "dynamodb:Scan",
                "dynamodb:Query"
            ],
            "Resource": [
                "arn:aws:dynamodb:us-east-1:*:table/PetVerse-Animals",
                "arn:aws:dynamodb:us-east-1:*:table/PetVerse-Animals/index/*",
                "arn:aws:dynamodb:us-east-1:*:table/PetVerse-HealthRecords",
                "arn:aws:dynamodb:us-east-1:*:table/PetVerse-HealthRecords/index/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::petverse-animals-media/*",
                "arn:aws:s3:::petverse-health-records/*"
            ]
        }
    ]
}
```

---

## 4. API Gateway Setup

### Step 4.1: Create REST API

1. **Navigate to API Gateway**
   - Go to AWS Console → Services → API Gateway
   - Click "Create API"
   - Choose "REST API" → "Build"

2. **API Configuration**
   - **API name**: `PetVerse-AnimalAPI`
   - **Description**: `API for PetVerse Animal Management`
   - **Endpoint Type**: Regional
   - Click "Create API"

### Step 4.2: Create Resources and Methods

1. **Create Animals Resource**
   - Click "Actions" → "Create Resource"
   - **Resource Name**: `animals`
   - **Resource Path**: `/animals`
   - **Enable CORS**: Check this
   - Click "Create Resource"

2. **Create Animal ID Resource**
   - Select `/animals` resource
   - Click "Actions" → "Create Resource"
   - **Resource Name**: `animalId`
   - **Resource Path**: `/{animalId}`
   - **Enable CORS**: Check this
   - Click "Create Resource"

3. **Add Methods to /animals**
   - Select `/animals` resource
   - Click "Actions" → "Create Method"
   - Choose "GET" → Click checkmark
   - **Integration type**: Lambda Function
   - **Lambda Function**: `PetVerse-AnimalManagement`
   - Click "Save" → "OK"

4. **Add POST Method**
   - Select `/animals` resource
   - Click "Actions" → "Create Method"
   - Choose "POST" → Click checkmark
   - **Integration type**: Lambda Function
   - **Lambda Function**: `PetVerse-AnimalManagement`
   - Click "Save" → "OK"

5. **Add Methods to /{animalId}**
   - Select `/{animalId}` resource
   - Add GET, PUT, DELETE methods following same process

### Step 4.3: Configure CORS

1. **Enable CORS for /animals**
   - Select `/animals` resource
   - Click "Actions" → "Enable CORS"
   - **Access-Control-Allow-Origin**: `*`
   - **Access-Control-Allow-Headers**: `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`
   - **Access-Control-Allow-Methods**: `GET,POST,PUT,DELETE,OPTIONS`
   - Click "Enable CORS and replace existing CORS headers"

2. **Enable CORS for /{animalId}**
   - Repeat the same process for the `/{animalId}` resource

### Step 4.4: Deploy API

1. **Deploy API**
   - Click "Actions" → "Deploy API"
   - **Deployment stage**: `[New Stage]`
   - **Stage name**: `prod`
   - **Stage description**: `Production stage`
   - Click "Deploy"

2. **Note the Invoke URL**
   - Copy the Invoke URL (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com/prod`)

---

## 5. Cognito Identity Pool Configuration

### Step 5.1: Update Identity Pool Permissions

1. **Navigate to Cognito**
   - Go to AWS Console → Services → Cognito
   - Click "Identity pools"
   - Find your pool: `us-east-1:3749f1ad-a6f8-4b3b-98aa-11efa9dcd5c8`

2. **Edit Identity Pool**
   - Click on the pool name
   - Click "Edit identity pool"

3. **Update Authenticated Role**
   - Scroll to "Authentication providers"
   - Note the "Authenticated role" name

4. **Go to IAM**
   - Go to AWS Console → Services → IAM
   - Click "Roles"
   - Find the authenticated role from step 3

5. **Add Permissions**
   - Click "Add permissions" → "Attach policies"
   - Add these policies:
     - `AmazonDynamoDBFullAccess`
     - `AmazonS3FullAccess`
     - `AmazonAPIGatewayInvokeFullAccess`

### Step 5.2: Create Custom Policy (Recommended)

1. **Create Custom Policy**
   - In IAM, click "Policies" → "Create policy"
   - Use JSON editor with this policy:

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
                "dynamodb:Scan",
                "dynamodb:Query"
            ],
            "Resource": [
                "arn:aws:dynamodb:us-east-1:*:table/PetVerse-Animals",
                "arn:aws:dynamodb:us-east-1:*:table/PetVerse-Animals/index/*",
                "arn:aws:dynamodb:us-east-1:*:table/PetVerse-HealthRecords",
                "arn:aws:dynamodb:us-east-1:*:table/PetVerse-HealthRecords/index/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::petverse-animals-media/*",
                "arn:aws:s3:::petverse-health-records/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "execute-api:Invoke"
            ],
            "Resource": [
                "arn:aws:execute-api:us-east-1:*:*/prod/*"
            ]
        }
    ]
}
```

2. **Attach Policy to Role**
   - Go back to the authenticated role
   - Click "Add permissions" → "Attach policies"
   - Find and attach your custom policy

---

## 6. Testing the Setup

### Step 6.1: Test DynamoDB
1. Go to DynamoDB Console
2. Select `PetVerse-Animals` table
3. Click "Explore table items"
4. Try adding a test item

### Step 6.2: Test S3
1. Go to S3 Console
2. Select `petverse-animals-media` bucket
3. Click "Upload" and try uploading a test image

### Step 6.3: Test Lambda
1. Go to Lambda Console
2. Select `PetVerse-AnimalManagement` function
3. Click "Test"
4. Create a test event and run it

### Step 6.4: Test API Gateway
1. Go to API Gateway Console
2. Select your API
3. Click on any method (e.g., GET /animals)
4. Click "Test"
5. Execute the test

---

## 7. Environment Variables for Frontend

Update your frontend with these environment variables:

```env
REACT_APP_API_BASE_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod
REACT_APP_ANIMALS_BUCKET=petverse-animals-media
REACT_APP_HEALTH_RECORDS_BUCKET=petverse-health-records
```

---

## 8. Cost Monitoring

### Set up Billing Alerts:
1. Go to AWS Console → Billing
2. Click "Billing preferences"
3. Enable "Receive Billing Alerts"
4. Go to CloudWatch → Alarms
5. Create billing alarms for each service

---

## 9. Security Best Practices

1. **Enable CloudTrail** for API call logging
2. **Set up CloudWatch** for monitoring
3. **Use least privilege** IAM policies
4. **Enable encryption** for sensitive data
5. **Regular security reviews** of permissions

---

## 10. Troubleshooting

### Common Issues:

1. **CORS Errors**:
   - Check API Gateway CORS configuration
   - Verify Lambda response headers

2. **Permission Denied**:
   - Check IAM role policies
   - Verify Cognito Identity Pool permissions

3. **Lambda Timeout**:
   - Increase timeout in Lambda configuration
   - Check CloudWatch logs

4. **S3 Upload Failures**:
   - Verify bucket policies
   - Check CORS configuration

### Debug Steps:
1. Check CloudWatch logs for Lambda errors
2. Use AWS X-Ray for tracing (optional)
3. Test individual services separately
4. Verify all resource names match exactly

---

## Next Steps

1. **Set up monitoring** with CloudWatch
2. **Implement error handling** in frontend
3. **Add data validation** in Lambda
4. **Set up automated backups**
5. **Consider using AWS CDK** for infrastructure as code

This setup provides a complete, production-ready backend for your Animal Management System! 🚀
