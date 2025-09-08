import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = 'PetVerseCart';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'false'
};

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'OK' })
    };
  }

  try {
    const { httpMethod, body, queryStringParameters } = event;
    let result;

    switch (httpMethod) {
      case 'GET':
        const userId = queryStringParameters?.userId;
        result = await getCartItems(userId);
        break;
      case 'POST':
        result = await addToCart(JSON.parse(body));
        break;
      case 'PUT':
        result = await updateCartItem(JSON.parse(body));
        break;
      case 'DELETE':
        result = await removeFromCart(JSON.parse(body));
        break;
      default:
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function getCartItems(userId) {
  if (!userId || userId === 'guest') {
    return [];
  }
    
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    };

  try {
    const result = await dynamodb.send(new QueryCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error('Error querying cart items:', error);
    return [];
  }
}

async function addToCart(item) {
  const userId = item.userId;
  
  if (!userId || userId === 'guest') {
    throw new Error('Authentication required to add items to cart');
  }

  // Check if item already exists in cart
  const existingItem = await getCartItem(userId, item.productId);
  
  if (existingItem) {
    // Update quantity if item exists
    const newQuantity = existingItem.quantity + (item.quantity || 1);
    return await updateCartItem({
      userId: userId,
      productId: item.productId,
      quantity: newQuantity
    });
  } else {
    // Add new item to cart
    const cartItem = {
      userId: userId,
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity || 1,
      brand: item.brand,
      imageUrl: item.imageUrl,
      stock: item.stock,
      category: item.category,
      addedAt: new Date().toISOString()
    };

    await dynamodb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: cartItem
    }));
    return cartItem;
  }
}

async function getCartItem(userId, productId) {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: {
        userId: userId,
        productId: productId
      }
    };

    const result = await dynamodb.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'userId = :userId AND productId = :productId',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':productId': productId
      }
    }));
    
    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  } catch (error) {
    console.error('Error getting cart item:', error);
    return null;
  }
}

async function updateCartItem(item) {
  const userId = item.userId;
  
  if (!userId || userId === 'guest') {
    throw new Error('Authentication required to update cart items');
  }

    const params = {
          TableName: TABLE_NAME,
          Key: {
      userId: userId, 
            productId: item.productId
    },
    UpdateExpression: 'SET quantity = :quantity, updatedAt = :updatedAt',
    ExpressionAttributeValues: { 
      ':quantity': item.quantity,
      ':updatedAt': new Date().toISOString()
    },
    ReturnValues: 'ALL_NEW'
  };
  
  const result = await dynamodb.send(new UpdateCommand(params));
  return result.Attributes;
}

async function removeFromCart(item) {
  const userId = item.userId;
  
  if (!userId || userId === 'guest') {
    throw new Error('Authentication required to remove cart items');
  }

  await dynamodb.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { 
      userId: userId, 
      productId: item.productId 
    }
  }));
  return { message: 'Item removed' };
}