const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });

// Simple test function
function testFunction() {
  return 'Hello from Lambda!';
}

// Main handler
exports.handler = async (event) => {
  console.log('Simple test event:', JSON.stringify(event, null, 2));
  
  try {
    const result = testFunction();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: result,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        message: 'Error occurred',
        error: error.message
      })
    };
  }
};
