import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.TABLE_NAME || "PetverseProducts";

export const handler = async (event) => {
  const { httpMethod, pathParameters, body } = event;
  let response;

  try {
    console.log(`🔄 Processing ${httpMethod} request for products`);
    console.log('Event:', JSON.stringify(event, null, 2));

    switch (httpMethod) {
      case "GET":
        if (pathParameters && pathParameters.productId) {
          // Get single product
          console.log(`📦 Getting product: ${pathParameters.productId}`);
          const result = await ddb.send(new GetCommand({
            TableName: TABLE,
            Key: { productId: pathParameters.productId }
          }));
          response = result.Item;
          console.log(`✅ Product retrieved:`, response);
        } else {
          // List all products
          console.log('📦 Getting all products');
          const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
          response = result.Items || [];
          console.log(`✅ Retrieved ${response.length} products`);
        }
        break;

      case "POST":
        // Create product
        console.log('📦 Creating new product');
        const newProduct = JSON.parse(body);
        
        // Generate product ID if not provided
        if (!newProduct.productId) {
          newProduct.productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // Add timestamps
        newProduct.createdAt = new Date().toISOString();
        newProduct.updatedAt = new Date().toISOString();
        
        // Ensure required fields
        newProduct.isActive = newProduct.isActive !== undefined ? newProduct.isActive : true;
        newProduct.stock = parseInt(newProduct.stock) || 0;
        newProduct.price = parseFloat(newProduct.price) || 0;

        await ddb.send(new PutCommand({ 
          TableName: TABLE, 
          Item: newProduct 
        }));
        response = newProduct;
        console.log(`✅ Product created: ${newProduct.productId}`);
        break;

      case "PUT":
        // Update product
        console.log(`📦 Updating product: ${pathParameters.productId}`);
        const updatedProduct = JSON.parse(body);
        updatedProduct.productId = pathParameters.productId; // Ensure ID doesn't change
        updatedProduct.updatedAt = new Date().toISOString();
        
        // Preserve createdAt if it exists
        if (!updatedProduct.createdAt) {
          try {
            const existing = await ddb.send(new GetCommand({
              TableName: TABLE,
              Key: { productId: pathParameters.productId }
            }));
            if (existing.Item) {
              updatedProduct.createdAt = existing.Item.createdAt;
            }
          } catch (error) {
            console.warn('Could not preserve createdAt:', error.message);
          }
        }

        await ddb.send(new PutCommand({ 
          TableName: TABLE, 
          Item: updatedProduct 
        }));
        response = updatedProduct;
        console.log(`✅ Product updated: ${pathParameters.productId}`);
        break;

      case "DELETE":
        // Delete product
        console.log(`📦 Deleting product: ${pathParameters.productId}`);
        await ddb.send(new DeleteCommand({
          TableName: TABLE,
          Key: { productId: pathParameters.productId }
        }));
        response = { 
          deleted: true, 
          productId: pathParameters.productId,
          message: 'Product deleted successfully'
        };
        console.log(`✅ Product deleted: ${pathParameters.productId}`);
        break;

      default:
        console.warn(`❌ Unsupported method: ${httpMethod}`);
        return { 
          statusCode: 405, 
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: "Method Not Allowed" })
        };
    }

    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
      },
      body: JSON.stringify(response)
    };
  } catch (err) {
    console.error('❌ Error processing request:', err);
    return {
      statusCode: 500,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
      },
      body: JSON.stringify({ 
        error: err.message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      })
    };
  }
}; 