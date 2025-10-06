# Amazon Rekognition Setup Guide for Image Moderation

## Prerequisites
- AWS Account with Rekognition access
- S3 bucket: `petverse-community-media` (already configured)
- AWS Cognito Identity Pool (already configured)
- Node.js project with AWS SDK installed

## Step 1: Cognito Identity Pool Configuration

### Update Identity Pool Permissions
Your existing Cognito Identity Pool needs Rekognition permissions:

1. Go to AWS Cognito Console
2. Navigate to Identity Pools
3. Select your pool: `us-east-1:3749f1ad-a6f8-4b3b-98aa-11efa9dcd5c8`
4. Go to "Edit identity pool"
5. Under "Unauthenticated role" and "Authenticated role", ensure they have:

### Required IAM Policies
Attach these policies to your Cognito roles:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "rekognition:DetectModerationLabels",
                "rekognition:DetectLabels",
                "rekognition:DetectFaces"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject"
            ],
            "Resource": "arn:aws:s3:::petverse-community-media/*"
        }
    ]
}
```

## Step 2: Environment Variables (Optional)

Since we're using Cognito Identity Pool, you don't need separate AWS credentials:

```env
# Perspective API (for text moderation)
REACT_APP_PERSPECTIVE_API_KEY=AIzaSyBn-Ohv5CRYEiIwslcFiwI_o6oN-qMxYiY
```

## Step 3: AWS Region Configuration

The region is already configured in your `aws-config.js` and matches your Cognito setup:
```javascript
// Already configured in Community.jsx
const rekognitionClient = new RekognitionClient({
  region: 'us-east-1', // Matches your Cognito region
  credentials: fromCognitoIdentityPool({
    client: new CognitoIdentityClient({ region: 'us-east-1' }),
    identityPoolId: 'us-east-1:3749f1ad-a6f8-4b3b-98aa-11efa9dcd5c8',
    logins: user?.signInUserSession?.idToken?.jwtToken ? {
      [`cognito-idp.us-east-1.amazonaws.com/us-east-1_4AwgtFfdJ`]: user.signInUserSession.idToken.jwtToken
    } : undefined
  })
});
```

## Step 4: S3 Bucket Permissions

Ensure your S3 bucket `petverse-community-media` has the following permissions:

### Bucket Policy
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowRekognitionAccess",
            "Effect": "Allow",
            "Principal": {
                "Service": "rekognition.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::petverse-community-media/*"
        }
    ]
}
```

## Step 5: Testing the Integration

### Test Image Moderation
1. Upload an image to your community
2. Check browser console for Rekognition responses
3. Verify inappropriate content is blocked

### Supported Content Types
Rekognition detects:
- Explicit Nudity
- Suggestive content
- Violence
- Visually Disturbing content
- Rude Gestures
- Drugs
- Tobacco
- Alcohol
- Gambling
- Hate Symbols

## Step 6: Cost Optimization

### Rekognition Pricing (as of 2024)
- First 1,000 images per month: FREE
- Additional images: $1.50 per 1,000 images
- Video analysis: $0.10 per minute

### Optimization Tips
1. Set appropriate confidence thresholds (currently 70%)
2. Only moderate images, not videos (unless needed)
3. Consider caching results for duplicate images
4. Use S3-based moderation for better performance

## Step 7: Alternative Implementation (S3-based)

If you prefer to moderate images after S3 upload:

```javascript
// After successful S3 upload, get the object key
const s3ObjectKey = uploadResponse.key; // from your upload service

// Moderate using S3 object
const violation = await moderateImageFromS3(s3ObjectKey);
if (violation) {
  // Delete the uploaded image and show error
  await deleteFromS3(s3ObjectKey);
  setModWarning(violation);
  return;
}
```

## Troubleshooting

### Common Issues
1. **CORS Errors**: Ensure S3 bucket has proper CORS configuration
2. **Access Denied**: Check IAM permissions
3. **Region Mismatch**: Ensure Rekognition client region matches your bucket region
4. **Large Images**: Rekognition has a 15MB limit for direct uploads

### Debug Mode
Enable detailed logging:
```javascript
const rekognitionClient = new RekognitionClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
  },
  logger: console // Enable detailed logging
});
```

## Security Best Practices

1. **Never expose AWS credentials in client-side code**
2. **Use environment variables for all sensitive data**
3. **Implement proper error handling**
4. **Consider using AWS Cognito for authentication**
5. **Regularly rotate access keys**
6. **Monitor AWS CloudTrail for API usage**

## Next Steps

1. Set up environment variables
2. Test with sample images
3. Monitor AWS costs
4. Consider implementing video moderation if needed
5. Set up CloudWatch alarms for monitoring
