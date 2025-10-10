# AWS Setup Guide for Animal Management System

## Overview
This guide will help you set up the AWS resources needed for the Animal Management System, including DynamoDB tables and S3 buckets for storing animal data and files.

## Prerequisites
- AWS Account with appropriate permissions
- AWS CLI configured (optional)
- Existing Cognito Identity Pool: `us-east-1:3749f1ad-a6f8-4b3b-98aa-11efa9dcd5c8`

## Required AWS Resources

### 1. DynamoDB Tables

#### Animals Table
**Table Name**: `PetVerse-Animals`
**Primary Key**: `animalId` (String)

```json
{
  "TableName": "PetVerse-Animals",
  "KeySchema": [
    {
      "AttributeName": "animalId",
      "KeyType": "HASH"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "animalId",
      "AttributeType": "S"
    },
    {
      "AttributeName": "userId",
      "AttributeType": "S"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "userId-index",
      "KeySchema": [
        {
          "AttributeName": "userId",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ],
  "BillingMode": "PAY_PER_REQUEST"
}
```

#### Health Records Table
**Table Name**: `PetVerse-HealthRecords`
**Primary Key**: `recordId` (String)

```json
{
  "TableName": "PetVerse-HealthRecords",
  "KeySchema": [
    {
      "AttributeName": "recordId",
      "KeyType": "HASH"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "recordId",
      "AttributeType": "S"
    },
    {
      "AttributeName": "animalId",
      "AttributeType": "S"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "animalId-index",
      "KeySchema": [
        {
          "AttributeName": "animalId",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ],
  "BillingMode": "PAY_PER_REQUEST"
}
```

### 2. S3 Buckets

#### Animals Media Bucket
**Bucket Name**: `petverse-animals-media`
**Purpose**: Store animal profile images

#### Health Records Bucket
**Bucket Name**: `petverse-health-records`
**Purpose**: Store health record documents

## Setup Instructions

### Step 1: Create DynamoDB Tables

#### Using AWS Console:
1. Go to DynamoDB Console
2. Click "Create table"
3. Enter table name: `PetVerse-Animals`
4. Set primary key: `animalId` (String)
5. Choose "On-demand" billing mode
6. Click "Create table"
7. Repeat for `PetVerse-HealthRecords` table

#### Using AWS CLI:
```bash
# Create Animals table
aws dynamodb create-table \
    --table-name PetVerse-Animals \
    --attribute-definitions \
        AttributeName=animalId,AttributeType=S \
        AttributeName=userId,AttributeType=S \
    --key-schema \
        AttributeName=animalId,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=userId-index,KeySchema=[{AttributeName=userId,KeyType=HASH}],Projection={ProjectionType=ALL} \
    --billing-mode PAY_PER_REQUEST

# Create Health Records table
aws dynamodb create-table \
    --table-name PetVerse-HealthRecords \
    --attribute-definitions \
        AttributeName=recordId,AttributeType=S \
        AttributeName=animalId,AttributeType=S \
    --key-schema \
        AttributeName=recordId,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=animalId-index,KeySchema=[{AttributeName=animalId,KeyType=HASH}],Projection={ProjectionType=ALL} \
    --billing-mode PAY_PER_REQUEST
```

### Step 2: Create S3 Buckets

#### Using AWS Console:
1. Go to S3 Console
2. Click "Create bucket"
3. Enter bucket name: `petverse-animals-media`
4. Choose region: `us-east-1`
5. Uncheck "Block all public access" (for public image access)
6. Click "Create bucket"
7. Repeat for `petverse-health-records`

#### Using AWS CLI:
```bash
# Create animals media bucket
aws s3 mb s3://petverse-animals-media --region us-east-1

# Create health records bucket
aws s3 mb s3://petverse-health-records --region us-east-1

# Make animals media bucket public for image access
aws s3api put-bucket-cors \
    --bucket petverse-animals-media \
    --cors-configuration '{
        "CORSRules": [
            {
                "AllowedOrigins": ["*"],
                "AllowedMethods": ["GET", "PUT", "POST"],
                "AllowedHeaders": ["*"]
            }
        ]
    }'
```

### Step 3: Update Cognito Identity Pool Permissions

Add the following policies to your Cognito Identity Pool roles:

#### For Authenticated Role:
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

### Step 4: S3 Bucket Policies

#### Animals Media Bucket Policy:
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

#### Health Records Bucket Policy:
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

## Data Structure

### Animal Record Example:
```json
{
  "animalId": "1703123456789_abc123def",
  "userId": "user123",
  "name": "Buddy",
  "type": "Dog",
  "breed": "Golden Retriever",
  "age": "2 years",
  "gender": "Male",
  "weight": "25 lbs",
  "color": "Golden",
  "microchipId": "123456789012345",
  "ownerName": "John Doe",
  "ownerEmail": "john@example.com",
  "ownerPhone": "+1234567890",
  "address": "123 Main St, City, State",
  "emergencyContact": "Jane Doe +1234567891",
  "status": "Healthy",
  "notes": "Friendly dog, loves treats",
  "imageUrl": "https://petverse-animals-media.s3.us-east-1.amazonaws.com/animals/1703123456789_abc123def/profile/buddy.jpg",
  "healthRecordUrl": "https://petverse-health-records.s3.us-east-1.amazonaws.com/animals/1703123456789_abc123def/health/vaccination.pdf",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Health Record Example:
```json
{
  "recordId": "1703123456790_xyz789abc",
  "animalId": "1703123456789_abc123def",
  "type": "Vaccination",
  "description": "Annual vaccination record",
  "fileUrl": "https://petverse-health-records.s3.us-east-1.amazonaws.com/animals/1703123456789_abc123def/health/vaccination.pdf",
  "fileName": "vaccination.pdf",
  "uploadedBy": "user123",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

## File Organization

### S3 Bucket Structure:
```
petverse-animals-media/
├── animals/
│   └── {animalId}/
│       └── profile/
│           └── {filename}

petverse-health-records/
├── animals/
│   └── {animalId}/
│       └── health/
│           └── {filename}
```

## Testing the Setup

### 1. Test DynamoDB Access:
```javascript
// Test in browser console
const animalService = new AnimalService(user);
const animals = await animalService.getAnimals();
console.log('Animals:', animals);
```

### 2. Test S3 Upload:
```javascript
// Test file upload
const file = new File(['test'], 'test.txt', { type: 'text/plain' });
const url = await animalService.uploadToS3(file, 'petverse-animals-media', 'test/test.txt');
console.log('Upload URL:', url);
```

## Cost Optimization

### DynamoDB:
- Uses on-demand billing (pay per request)
- No minimum charges
- Scales automatically

### S3:
- Standard storage pricing
- Consider lifecycle policies for old files
- Use CloudFront for image delivery (optional)

## Security Considerations

1. **Cognito Authentication**: All operations require valid user authentication
2. **IAM Policies**: Restrict access to specific resources
3. **S3 Bucket Policies**: Control public access appropriately
4. **Data Encryption**: Enable encryption at rest for sensitive data

## Monitoring and Logging

### CloudWatch Metrics:
- DynamoDB: Read/Write capacity, throttling
- S3: Request metrics, storage metrics

### CloudTrail:
- API call logging for audit purposes

## Troubleshooting

### Common Issues:

1. **Access Denied Errors**:
   - Check Cognito Identity Pool permissions
   - Verify IAM role policies

2. **S3 Upload Failures**:
   - Check bucket CORS configuration
   - Verify bucket policies

3. **DynamoDB Errors**:
   - Ensure tables exist
   - Check GSI status

### Debug Commands:
```bash
# Check table status
aws dynamodb describe-table --table-name PetVerse-Animals

# Check bucket policy
aws s3api get-bucket-policy --bucket petverse-animals-media

# Test permissions
aws sts get-caller-identity
```

## Next Steps

1. **Set up CloudWatch alarms** for monitoring
2. **Implement backup strategies** for critical data
3. **Add data validation** at the API level
4. **Consider implementing search** with Elasticsearch
5. **Add image processing** with Lambda functions

## Support Resources

- [DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [IAM Documentation](https://docs.aws.amazon.com/iam/)
