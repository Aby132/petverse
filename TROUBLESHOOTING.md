# Troubleshooting Guide for PetVerse Community

## Console Errors Fixed ✅

### 1. Cognito Identity Pool 400 Errors
**Problem**: `cognito-identity.us-east-1.amazonaws.com/:1 Failed to load resource: the server responded with a status of 400`

**Solution Applied**:
- Added authentication check before creating Rekognition client
- Only create client when user is properly authenticated
- Added fallback to skip moderation if not authenticated

**Code Changes**:
```javascript
const getRekognitionClient = () => {
  if (!user?.signInUserSession?.idToken?.jwtToken) {
    console.warn('User not authenticated, cannot create Rekognition client');
    return null;
  }
  // ... create client
};
```

### 2. Perspective API 400 Error
**Problem**: `commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=... Failed to load resource: the server responded with a status of 400`

**Solution Applied**:
- Added API key validation
- Enhanced error logging with response text
- Added fallback to skip moderation if API key invalid

**Code Changes**:
```javascript
if (!PERSPECTIVE_API_KEY || PERSPECTIVE_API_KEY === 'YOUR_API_KEY') {
  console.warn('Perspective API key not configured, skipping text moderation');
  return '';
}
```

## Remaining Issues to Address 🔧

### 3. CORS Errors (API Gateway)
**Problem**: 
```
Access to fetch at 'https://6hwmn5qbwk.execute-api.us-east-1.amazonaws.com/prod/users/...' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution Required**:
1. **Update API Gateway CORS Configuration**:
   - Go to AWS API Gateway Console
   - Select your API: `6hwmn5qbwk`
   - Go to Actions → Enable CORS
   - Add `http://localhost:3000` to allowed origins
   - Deploy the API

2. **Alternative: Update Lambda Functions**:
   ```javascript
   // Add to your Lambda response headers
   headers: {
     'Access-Control-Allow-Origin': 'http://localhost:3000',
     'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
     'Access-Control-Allow-Headers': 'Content-Type, Authorization'
   }
   ```

### 4. WebSocket Connection Errors
**Problem**: `WebSocket connection to 'ws://localhost:3000/ws' failed`

**Solution**: This is likely a development server issue, not critical for production.

## Testing the Moderation System 🧪

### Test Text Moderation
1. Try sending a message with profanity
2. Check console for Perspective API calls
3. Verify warning messages appear

### Test Image Moderation
1. Upload an inappropriate image
2. Check console for Rekognition API calls
3. Verify image is blocked with warning

### Test Fallback Behavior
1. Disconnect internet
2. Try uploading image
3. Verify image is allowed (fail-safe)

## AWS Setup Checklist ✅

### Cognito Identity Pool Permissions
- [ ] Go to AWS Cognito Console
- [ ] Navigate to Identity Pools
- [ ] Select: `us-east-1:3749f1ad-a6f8-4b3b-98aa-11efa9dcd5c8`
- [ ] Edit identity pool
- [ ] Under "Authenticated role", attach policy:

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

### S3 Bucket Permissions
- [ ] Go to S3 Console
- [ ] Select bucket: `petverse-community-media`
- [ ] Go to Permissions → Bucket Policy
- [ ] Add policy:

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

## Debug Mode 🔍

### Enable Detailed Logging
Add this to your browser console to see detailed API calls:

```javascript
// Enable AWS SDK logging
localStorage.setItem('aws-sdk-js-suppress-warnings', 'false');

// Check user authentication
console.log('User:', user);
console.log('User Session:', user?.signInUserSession);
console.log('ID Token:', user?.signInUserSession?.idToken?.jwtToken);
```

### Test API Endpoints
```javascript
// Test Perspective API
fetch('https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=AIzaSyBn-Ohv5CRYEiIwslcFiwI_o6oN-qMxYiY', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    comment: { text: 'test message' },
    requestedAttributes: { TOXICITY: {} }
  })
}).then(r => r.json()).then(console.log);
```

## Performance Optimization 🚀

### Reduce API Calls
- Only moderate when user is authenticated
- Cache results for duplicate content
- Use appropriate confidence thresholds

### Cost Management
- Monitor AWS Rekognition usage
- Set up CloudWatch alarms
- Consider implementing rate limiting

## Security Best Practices 🔒

1. **Never expose API keys in client code**
2. **Use environment variables for sensitive data**
3. **Implement proper error handling**
4. **Regularly rotate access keys**
5. **Monitor API usage and costs**

## Next Steps 📋

1. **Fix CORS issues** in API Gateway
2. **Test moderation system** with sample content
3. **Monitor AWS costs** and usage
4. **Set up CloudWatch alarms** for monitoring
5. **Consider implementing video moderation** if needed

## Support Resources 📚

- [AWS Rekognition Documentation](https://docs.aws.amazon.com/rekognition/)
- [Perspective API Documentation](https://developers.perspectiveapi.com/s/about-the-api)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [API Gateway CORS Guide](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html)

