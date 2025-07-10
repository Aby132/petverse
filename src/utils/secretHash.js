import CryptoJS from 'crypto-js';

/**
 * Generate SECRET_HASH for AWS Cognito authentication
 * Required when using app client with client secret
 * 
 * @param {string} username - The username (email in our case)
 * @param {string} clientId - The app client ID
 * @param {string} clientSecret - The app client secret
 * @returns {string} The SECRET_HASH value
 */
export const generateSecretHash = (username, clientId, clientSecret) => {
  const message = username + clientId;
  const hash = CryptoJS.HmacSHA256(message, clientSecret);
  return CryptoJS.enc.Base64.stringify(hash);
};

/**
 * Get SECRET_HASH for current app configuration
 * @param {string} username - The username (email)
 * @returns {string} The SECRET_HASH value
 */
export const getSecretHash = (username) => {
  // You'll need to add your client secret here
  const CLIENT_SECRET = '1lutbqpem9hrrhfiqaqov444ei2kdr1moelg2kd6c7p8at63ep7'; 
  const CLIENT_ID = '40sn97vig5ufv054m667j8isrn'; 
  
  return generateSecretHash(username, CLIENT_ID, CLIENT_SECRET);
};
