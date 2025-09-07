import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, ScanCommand, PutCommand, DeleteCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const USER_TABLE = process.env.USER_TABLE_NAME || "PetVerseUsers";
const ADDRESS_TABLE = process.env.ADDRESS_TABLE_NAME || "PetVerseAddresses";

export const handler = async (event) => {
  const { httpMethod, pathParameters, body, queryStringParameters, resource } = event;
  let response;

  try {
    console.log(`👤 Processing ${httpMethod} request for user management`);
    console.log('Event:', JSON.stringify(event, null, 2));

    // Handle different resource paths
    if (resource === '/user/profile') {
      response = await handleUserProfile(event);
    } else if (resource === '/user/addresses') {
      response = await handleUserAddresses(event);
    } else if (resource === '/user/addresses/default') {
      response = await handleDefaultAddress(event);
    } else {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Resource not found" })
      };
    }

    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
      },
      body: JSON.stringify(response)
    };
  } catch (err) {
    console.error('❌ Error processing user request:', err);
    return {
      statusCode: 500,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
      },
      body: JSON.stringify({ 
        error: err.message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      })
    };
  }
};

// Handle user profile operations
async function handleUserProfile(event) {
  const { httpMethod, body, queryStringParameters } = event;
  const userId = queryStringParameters?.userId;

  if (!userId) {
    throw new Error('userId is required');
  }

  switch (httpMethod) {
    case "GET":
      console.log(`👤 Getting user profile for: ${userId}`);
      const result = await ddb.send(new GetCommand({
        TableName: USER_TABLE,
        Key: { userId }
      }));
      return result.Item || null;

    case "POST":
      console.log(`👤 Creating/updating user profile for: ${userId}`);
      const profileData = JSON.parse(body);
      const userProfile = {
        userId,
        ...profileData,
        createdAt: profileData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await ddb.send(new PutCommand({
        TableName: USER_TABLE,
        Item: userProfile
      }));
      return userProfile;

    default:
      throw new Error(`Method ${httpMethod} not supported for user profile`);
  }
}

// Handle user addresses operations
async function handleUserAddresses(event) {
  const { httpMethod, body, queryStringParameters } = event;
  const userId = queryStringParameters?.userId;

  if (!userId) {
    throw new Error('userId is required');
  }

  switch (httpMethod) {
    case "GET":
      console.log(`🏠 Getting addresses for user: ${userId}`);
      const result = await ddb.send(new QueryCommand({
        TableName: ADDRESS_TABLE,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      }));
      return result.Items || [];

    case "POST":
      console.log(`🏠 Adding new address for user: ${userId}`);
      const addressData = JSON.parse(body);
      
      if (!addressData.name || !addressData.phone || !addressData.email || !addressData.addressLine1 || !addressData.city || !addressData.state || !addressData.pincode) {
        throw new Error('Required address fields are missing');
      }

      const addressId = `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newAddress = {
        userId,
        addressId,
        ...addressData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // If this is the first address or marked as default, set it as default
      if (addressData.isDefault) {
        await setDefaultAddress(userId, addressId);
      }

      await ddb.send(new PutCommand({
        TableName: ADDRESS_TABLE,
        Item: newAddress
      }));
      return newAddress;

    case "PUT":
      console.log(`🏠 Updating address for user: ${userId}`);
      const updateData = JSON.parse(body);
      
      if (!updateData.addressId) {
        throw new Error('addressId is required for update');
      }

      const existingAddress = await ddb.send(new GetCommand({
        TableName: ADDRESS_TABLE,
        Key: { userId, addressId: updateData.addressId }
      }));

      if (!existingAddress.Item) {
        throw new Error('Address not found');
      }

      const updatedAddress = {
        ...existingAddress.Item,
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      await ddb.send(new PutCommand({
        TableName: ADDRESS_TABLE,
        Item: updatedAddress
      }));
      return updatedAddress;

    case "DELETE":
      console.log(`🏠 Deleting address for user: ${userId}`);
      const deleteData = JSON.parse(body);
      
      if (!deleteData.addressId) {
        throw new Error('addressId is required for deletion');
      }

      await ddb.send(new DeleteCommand({
        TableName: ADDRESS_TABLE,
        Key: { userId, addressId: deleteData.addressId }
      }));
      return { deleted: true, addressId: deleteData.addressId };

    default:
      throw new Error(`Method ${httpMethod} not supported for user addresses`);
  }
}

// Handle default address operations
async function handleDefaultAddress(event) {
  const { httpMethod, body } = event;
  
  if (httpMethod !== "PUT") {
    throw new Error(`Method ${httpMethod} not supported for default address`);
  }

  const { userId, addressId } = JSON.parse(body);
  
  if (!userId || !addressId) {
    throw new Error('userId and addressId are required');
  }

  console.log(`🏠 Setting default address for user: ${userId}, address: ${addressId}`);
  return await setDefaultAddress(userId, addressId);
}

// Helper function to set default address
async function setDefaultAddress(userId, newDefaultAddressId) {
  // First, remove default flag from all existing addresses
  const existingAddresses = await ddb.send(new QueryCommand({
    TableName: ADDRESS_TABLE,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    }
  }));

  // Update all addresses to remove default flag
  const updatePromises = existingAddresses.Items
    .filter(addr => addr.isDefault)
    .map(addr => 
      ddb.send(new UpdateCommand({
        TableName: ADDRESS_TABLE,
        Key: { userId, addressId: addr.addressId },
        UpdateExpression: 'SET isDefault = :isDefault, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':isDefault': false,
          ':updatedAt': new Date().toISOString()
        }
      }))
    );

  await Promise.all(updatePromises);

  // Set the new default address
  await ddb.send(new UpdateCommand({
    TableName: ADDRESS_TABLE,
    Key: { userId, addressId: newDefaultAddressId },
    UpdateExpression: 'SET isDefault = :isDefault, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':isDefault': true,
      ':updatedAt': new Date().toISOString()
    }
  }));

  return { 
    success: true, 
    message: 'Default address updated successfully',
    defaultAddressId: newDefaultAddressId
  };
}
