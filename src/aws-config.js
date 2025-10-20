const awsConfig = {
  Auth: {
    Cognito: {
      // REQUIRED - Amazon Cognito Region
      region: 'us-east-1',

      // REQUIRED - Amazon Cognito User Pool ID
      userPoolId: 'us-east-1_4AwgtFfdJ',

      // REQUIRED - Amazon Cognito Web Client ID
      userPoolClientId: '40sn97vig5ufv054m667j8isrn', 

      // Client secret for OAuth
      userPoolClientSecret: '1lutbqpem9hrrhfiqaqov444ei2kdr1moelg2kd6c7p8at63ep7',

      // Amazon Cognito Identity Pool ID
      identityPoolId: 'us-east-1:3749f1ad-a6f8-4b3b-98aa-11efa9dcd5c8',

      // Sign up verification method
      signUpVerificationMethod: 'code',

      // Authentication flow type - use USER_PASSWORD_AUTH for client secret
      authenticationFlowType: 'USER_PASSWORD_AUTH',

      // OAuth Configuration for Hosted UI
      loginWith: {
        oauth: {
          domain: 'us-east-14awgtffdj.auth.us-east-1.amazoncognito.com',
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: ['http://localhost:3000/auth/callback', 'http://localhost:3001/auth/callback'],
          redirectSignOut: ['http://localhost:3000', 'http://localhost:3001'],
          responseType: 'code',
          providers: ['Google']
        }
      },

      socialProviders: ['GOOGLE']
    }
  },

  // Google OAuth Configuration
  Google: {
    clientId: '917720505868-jel4tc2q1t6dugquhcsphpqi8dorfujv.apps.googleusercontent.com'
  },

  // API Gateway Configuration
  API: {
    endpoints: [
      {
        name: 'AnimalAPI',
        endpoint: process.env.REACT_APP_ANIMAL_API_URL || 'https://gk394j27jg.execute-api.us-east-1.amazonaws.com/prod',
        region: 'us-east-1'
      }
    ]
  },

  // API Gateway URL for direct use
  apiGatewayUrl: 'https://gk394j27jg.execute-api.us-east-1.amazonaws.com/prod'
};

export default awsConfig;


