import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

const TABLE_NAME = process.env.TABLE_NAME;

const json = (status, body = {}) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  },
  body: JSON.stringify(body)
});

export const handler = async (event) => {
  try {
    const method = event.httpMethod || event.requestContext?.http?.method;
    const path = event.resource || event.rawPath || '';
    const body = event.body ? JSON.parse(event.body) : {};
    const userId = event.queryStringParameters?.userId || body.userId;

    if (method === 'OPTIONS') return json(204);
    if (!TABLE_NAME) return json(500, { error: 'TABLE_NAME env var not set' });
    if (!userId) return json(400, { error: 'userId required' });

    // GET /user/addresses
    if (method === 'GET' && path.endsWith('/user/addresses')) {
      const out = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'userId = :u',
        ExpressionAttributeValues: { ':u': userId }
      }));
      return json(200, out.Items ?? []);
    }

    // POST /user/addresses
    if (method === 'POST' && path.endsWith('/user/addresses')) {
      const addressId = randomUUID();
      let isDefault = !!body.isDefault;

      // First address for the user becomes default automatically
      const existing = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'userId = :u',
        ExpressionAttributeValues: { ':u': userId }
      }));
      if (!existing.Items || existing.Items.length === 0) isDefault = true;

      const item = {
        userId,
        addressId,
        name: body.name,
        phone: body.phone,
        email: body.email,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2 ?? '',
        city: body.city,
        state: body.state,
        pincode: body.pincode,
        addressType: body.addressType ?? 'home',
        isDefault,
        createdAt: Date.now()
      };

      await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
      return json(200, item);
    }

    // PUT /user/addresses (update fields except default)
    if (method === 'PUT' && path.endsWith('/user/addresses')) {
      const { addressId, ...updates } = body;
      if (!addressId) return json(400, { error: 'addressId required' });

      const allowed = ['name', 'phone', 'email', 'addressLine1', 'addressLine2', 'city', 'state', 'pincode', 'addressType'];
      const sets = [];
      const names = {};
      const values = {};
      for (const k of allowed) {
        if (updates[k] !== undefined) {
          sets.push(`#${k} = :${k}`);
          names[`#${k}`] = k;
          values[`:${k}`] = updates[k];
        }
      }
      if (sets.length === 0) return json(200, { success: true });

      await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { userId, addressId },
        UpdateExpression: 'SET ' + sets.join(', '),
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values
      }));
      return json(200, { success: true });
    }

    // DELETE /user/addresses
    if (method === 'DELETE' && path.endsWith('/user/addresses')) {
      const { addressId } = body;
      if (!addressId) return json(400, { error: 'addressId required' });

      await ddb.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { userId, addressId }
      }));
      return json(200, { success: true });
    }

    // PUT /user/addresses/default
    if (method === 'PUT' && path.endsWith('/user/addresses/default')) {
      const { addressId } = body;
      if (!addressId) return json(400, { error: 'addressId required' });

      const list = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'userId = :u',
        ExpressionAttributeValues: { ':u': userId }
      }));

      // Unset previous default(s)
      for (const it of list.Items || []) {
        if (it.isDefault) {
          await ddb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { userId, addressId: it.addressId },
            UpdateExpression: 'SET isDefault = :f',
            ExpressionAttributeValues: { ':f': false }
          }));
        }
      }

      // Set new default
      await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { userId, addressId },
        UpdateExpression: 'SET isDefault = :t',
        ExpressionAttributeValues: { ':t': true }
      }));
      return json(200, { success: true });
    }

    return json(404, { error: 'Not found' });
  } catch (err) {
    console.error('Lambda error:', err);
    return json(500, { error: 'Server error' });
  }
};



