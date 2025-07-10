// AWS Amplify v6 Configuration
// Replace these values with your actual AWS Cognito settings

const awsConfig = {
  Auth: {
    Cognito: {
      // REQUIRED - Amazon Cognito Region
      region: 'us-east-1',

      // REQUIRED - Amazon Cognito User Pool ID
      userPoolId: 'us-east-1_4AwgtFfdJ',

      // REQUIRED - Amazon Cognito Web Client ID
      userPoolClientId: '40sn97vig5ufv054m667j8isrn', // Replace with public client ID

      // Remove client secret for public client
       userPoolClientSecret: '1lutbqpem9hrrhfiqaqov444ei2kdr1moelg2kd6c7p8at63ep7',

      // Amazon Cognito Identity Pool ID
      identityPoolId: 'us-east-1:3749f1ad-a6f8-4b3b-98aa-11efa9dcd5c8',

      // Sign up verification method
      signUpVerificationMethod: 'code',

      // Authentication flow type - use USER_PASSWORD_AUTH for client secret
      authenticationFlowType: 'USER_PASSWORD_AUTH'
    }
  }
};

export default awsConfig;


