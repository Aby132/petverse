import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

// Initialize AWS services
const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const s3 = new S3Client({});

// Environment variables
const ANIMALS_TABLE = process.env.ANIMALS_TABLE || 'petverse-animals';
const IMAGES_BUCKET = process.env.IMAGES_BUCKET || 'petverse-animal-images';
const HEALTH_RECORDS_BUCKET = process.env.HEALTH_RECORDS_BUCKET || 'petverse-health-records';

// Helper function to generate response
const generateResponse = (statusCode, body, headers = {}) => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };

  return {
    statusCode,
    headers: { ...defaultHeaders, ...headers },
    body: JSON.stringify(body)
  };
};

// Helper function to upload file to S3
const uploadToS3 = async (bucket, key, file, contentType) => {
  console.log(`Attempting to upload to S3:`, {
    bucket,
    key,
    contentType,
    fileSize: file.length
  });

  const params = {
    Bucket: bucket,
    Key: key,
    Body: file,
    ContentType: contentType
  };

  try {
    console.log('S3 upload parameters:', params);
    const result = await s3.send(new PutObjectCommand(params));
    console.log('S3 upload successful:', result);
    return result;
  } catch (error) {
    console.error('S3 upload failed:', {
      error: error.message,
      code: error.code,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId
    });
    throw error;
  }
};

// Helper function to delete file from S3
const deleteFromS3 = async (bucket, key) => {
  const params = {
    Bucket: bucket,
    Key: key
  };

  return await s3.send(new DeleteObjectCommand(params));
};

// Helper function to convert base64 to buffer
const base64ToBuffer = (base64String) => {
  const base64Data = base64String.replace(/^data:[^;]+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
};

// Helper function to extract S3 key from URL
const extractS3Key = (url) => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // Remove the first empty element and bucket name, keep the rest
    return pathParts.slice(2).join('/');
  } catch (error) {
    console.error('Error extracting S3 key from URL:', error);
    return null;
  }
};

// GET - Get all animals or specific animal
const getAnimals = async (event) => {
  try {
    console.log('GET request received:', JSON.stringify(event, null, 2));
    
    const { animalId } = event.pathParameters || {};

    if (animalId) {
      // Get specific animal
      const params = {
        TableName: ANIMALS_TABLE,
        Key: { animalId }
      };

      const result = await dynamodb.send(new GetCommand(params));
      
      if (!result.Item) {
        return generateResponse(404, { error: 'Animal not found' });
      }

      return generateResponse(200, { animal: result.Item });
    } else {
      // Get all animals with query parameters for filtering
      const { queryStringParameters } = event;
      let params = {
        TableName: ANIMALS_TABLE
      };

      // Add filtering based on query parameters
      if (queryStringParameters) {
        const { type, status, ownerEmail } = queryStringParameters;
        
        if (ownerEmail) {
          // Use GSI for owner-based query
          params = {
            TableName: ANIMALS_TABLE,
            IndexName: 'owner-index',
            KeyConditionExpression: 'ownerEmail = :ownerEmail',
            ExpressionAttributeValues: {
              ':ownerEmail': ownerEmail
            }
          };
        } else {
          // Use scan with filters
          let filterExpressions = [];
          let expressionAttributeValues = {};

          if (type) {
            filterExpressions.push('type = :type');
            expressionAttributeValues[':type'] = type;
          }

          if (status) {
            filterExpressions.push('status = :status');
            expressionAttributeValues[':status'] = status;
          }

          if (filterExpressions.length > 0) {
            params.FilterExpression = filterExpressions.join(' AND ');
            params.ExpressionAttributeValues = expressionAttributeValues;
          }
        }
      }

      const result = await dynamodb.send(new ScanCommand(params));
      
      return generateResponse(200, { 
        animals: result.Items || [],
        count: result.Count || 0
      });
    }
  } catch (error) {
    console.error('Error getting animals:', error);
    return generateResponse(500, { error: 'Internal server error' });
  }
};

// POST - Create new animal
const createAnimal = async (event) => {
  try {
    console.log('POST request received for creating animal');
    console.log('Request body size:', event.body ? event.body.length : 0);
    
    const body = JSON.parse(event.body);
    const animalId = randomUUID();
    const timestamp = new Date().toISOString();

    console.log('Animal data:', {
      name: body.name,
      type: body.type,
      ownerName: body.ownerName,
      imagesCount: body.images ? body.images.length : 0,
      hasHealthRecord: !!body.healthRecord
    });

    // Validate required fields
    if (!body.name || !body.type || !body.ownerName) {
      return generateResponse(400, { 
        error: 'Missing required fields: name, type, and ownerName are required' 
      });
    }

    // Extract animal data
    const animalData = {
      animalId,
      name: body.name,
      type: body.type,
      breed: body.breed || '',
      age: body.age || '',
      gender: body.gender || '',
      weight: body.weight || '',
      color: body.color || '',
      microchipId: body.microchipId || '',
      ownerName: body.ownerName,
      ownerEmail: body.ownerEmail || '',
      ownerPhone: body.ownerPhone || '',
      address: body.address || '',
      emergencyContact: body.emergencyContact || '',
      status: body.status || 'Healthy',
      notes: body.notes || '',
      imageUrls: [],
      healthRecordUrl: '',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Handle image uploads if present
    if (body.images && body.images.length > 0) {
      console.log(`Processing ${body.images.length} images for animal ${animalId}`);
      const imageUrls = [];
      
      for (let i = 0; i < body.images.length; i++) {
        const image = body.images[i];
        
        if (image.data && image.contentType) {
          const imageKey = `animals/${animalId}/images/${i}-${Date.now()}.${image.extension || 'jpg'}`;
          
          try {
            console.log(`Uploading image ${i + 1}/${body.images.length} to S3`);
            const fileBuffer = base64ToBuffer(image.data);
            await uploadToS3(
              IMAGES_BUCKET,
              imageKey,
              fileBuffer,
              image.contentType
            );
            const imageUrl = `https://${IMAGES_BUCKET}.s3.amazonaws.com/${imageKey}`;
            imageUrls.push(imageUrl);
            console.log(`Successfully uploaded image ${i + 1}: ${imageUrl}`);
          } catch (uploadError) {
            console.error(`Error uploading image ${i + 1}:`, uploadError);
            // Continue with other images even if one fails
          }
        }
      }
      
      animalData.imageUrls = imageUrls;
      console.log(`Successfully processed ${imageUrls.length} images`);
    }

    // Handle health record upload if present
    if (body.healthRecord && body.healthRecord.data && body.healthRecord.contentType) {
      console.log(`Processing health record for animal ${animalId}`);
      const healthRecordKey = `animals/${animalId}/health-record-${Date.now()}.${body.healthRecord.extension || 'pdf'}`;
      
      try {
        const fileBuffer = base64ToBuffer(body.healthRecord.data);
        await uploadToS3(
          HEALTH_RECORDS_BUCKET,
          healthRecordKey,
          fileBuffer,
          body.healthRecord.contentType
        );
        animalData.healthRecordUrl = `https://${HEALTH_RECORDS_BUCKET}.s3.amazonaws.com/${healthRecordKey}`;
        console.log(`Successfully uploaded health record: ${animalData.healthRecordUrl}`);
      } catch (uploadError) {
        console.error('Error uploading health record:', uploadError);
        // Continue without health record if upload fails
      }
    }

    // Save to DynamoDB
    console.log('Saving animal to DynamoDB:', animalId);
    const params = {
      TableName: ANIMALS_TABLE,
      Item: animalData
    };

    await dynamodb.send(new PutCommand(params));
    console.log('Successfully saved animal to DynamoDB');

    return generateResponse(201, { 
      message: 'Animal created successfully',
      animal: animalData
    });
  } catch (error) {
    console.error('Error creating animal:', error);
    
    if (error.name === 'ValidationException') {
      return generateResponse(400, { error: 'Invalid data format' });
    }
    
    return generateResponse(500, { error: 'Internal server error' });
  }
};

// PUT - Update animal
const updateAnimal = async (event) => {
  try {
    console.log('PUT request received for updating animal');
    
    const { animalId } = event.pathParameters;
    const body = JSON.parse(event.body);
    const timestamp = new Date().toISOString();

    if (!animalId) {
      return generateResponse(400, { error: 'Animal ID is required' });
    }

    console.log(`Updating animal ${animalId}`);

    // Get existing animal
    const getParams = {
      TableName: ANIMALS_TABLE,
      Key: { animalId }
    };

    const existingAnimal = await dynamodb.send(new GetCommand(getParams));
    
    if (!existingAnimal.Item) {
      return generateResponse(404, { error: 'Animal not found' });
    }

    // Prepare update data
    const updateData = {
      ...existingAnimal.Item,
      ...body,
      updatedAt: timestamp
    };

    // Handle new image uploads if present
    if (body.newImages && body.newImages.length > 0) {
      console.log(`Processing ${body.newImages.length} new images for animal ${animalId}`);
      const newImageUrls = [];
      
      for (let i = 0; i < body.newImages.length; i++) {
        const image = body.newImages[i];
        
        if (image.data && image.contentType) {
          const imageKey = `animals/${animalId}/images/${Date.now()}-${i}.${image.extension || 'jpg'}`;
          
          try {
            const fileBuffer = base64ToBuffer(image.data);
            await uploadToS3(
              IMAGES_BUCKET,
              imageKey,
              fileBuffer,
              image.contentType
            );
            newImageUrls.push(`https://${IMAGES_BUCKET}.s3.amazonaws.com/${imageKey}`);
          } catch (uploadError) {
            console.error('Error uploading new image:', uploadError);
          }
        }
      }
      
      updateData.imageUrls = [...(updateData.imageUrls || []), ...newImageUrls];
    }

    // Handle new health record upload if present
    if (body.newHealthRecord && body.newHealthRecord.data && body.newHealthRecord.contentType) {
      console.log(`Processing new health record for animal ${animalId}`);
      const healthRecordKey = `animals/${animalId}/health-record-${Date.now()}.${body.newHealthRecord.extension || 'pdf'}`;
      
      try {
        const fileBuffer = base64ToBuffer(body.newHealthRecord.data);
        await uploadToS3(
          HEALTH_RECORDS_BUCKET,
          healthRecordKey,
          fileBuffer,
          body.newHealthRecord.contentType
        );
        updateData.healthRecordUrl = `https://${HEALTH_RECORDS_BUCKET}.s3.amazonaws.com/${healthRecordKey}`;
      } catch (uploadError) {
        console.error('Error uploading new health record:', uploadError);
      }
    }

    // Remove newImages and newHealthRecord from update data
    delete updateData.newImages;
    delete updateData.newHealthRecord;

    // Update in DynamoDB
    const updateParams = {
      TableName: ANIMALS_TABLE,
      Key: { animalId },
      UpdateExpression: 'SET #name = :name, #type = :type, #breed = :breed, #age = :age, #gender = :gender, #weight = :weight, #color = :color, #microchipId = :microchipId, #ownerName = :ownerName, #ownerEmail = :ownerEmail, #ownerPhone = :ownerPhone, #address = :address, #emergencyContact = :emergencyContact, #status = :status, #notes = :notes, #imageUrls = :imageUrls, #healthRecordUrl = :healthRecordUrl, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#name': 'name',
        '#type': 'type',
        '#breed': 'breed',
        '#age': 'age',
        '#gender': 'gender',
        '#weight': 'weight',
        '#color': 'color',
        '#microchipId': 'microchipId',
        '#ownerName': 'ownerName',
        '#ownerEmail': 'ownerEmail',
        '#ownerPhone': 'ownerPhone',
        '#address': 'address',
        '#emergencyContact': 'emergencyContact',
        '#status': 'status',
        '#notes': 'notes',
        '#imageUrls': 'imageUrls',
        '#healthRecordUrl': 'healthRecordUrl',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':name': updateData.name,
        ':type': updateData.type,
        ':breed': updateData.breed,
        ':age': updateData.age,
        ':gender': updateData.gender,
        ':weight': updateData.weight,
        ':color': updateData.color,
        ':microchipId': updateData.microchipId,
        ':ownerName': updateData.ownerName,
        ':ownerEmail': updateData.ownerEmail,
        ':ownerPhone': updateData.ownerPhone,
        ':address': updateData.address,
        ':emergencyContact': updateData.emergencyContact,
        ':status': updateData.status,
        ':notes': updateData.notes,
        ':imageUrls': updateData.imageUrls,
        ':healthRecordUrl': updateData.healthRecordUrl,
        ':updatedAt': updateData.updatedAt
      }
    };

    await dynamodb.send(new UpdateCommand(updateParams));

    return generateResponse(200, { 
      message: 'Animal updated successfully',
      animal: updateData
    });
  } catch (error) {
    console.error('Error updating animal:', error);
    
    if (error.name === 'ValidationException') {
      return generateResponse(400, { error: 'Invalid data format' });
    }
    
    return generateResponse(500, { error: 'Internal server error' });
  }
};

// DELETE - Delete animal
const deleteAnimal = async (event) => {
  try {
    console.log('DELETE request received');
    
    const { animalId } = event.pathParameters;

    if (!animalId) {
      return generateResponse(400, { error: 'Animal ID is required' });
    }

    console.log(`Deleting animal ${animalId}`);

    // Get existing animal to find file URLs
    const getParams = {
      TableName: ANIMALS_TABLE,
      Key: { animalId }
    };

    const existingAnimal = await dynamodb.send(new GetCommand(getParams));
    
    if (!existingAnimal.Item) {
      return generateResponse(404, { error: 'Animal not found' });
    }

    // Delete images from S3
    if (existingAnimal.Item.imageUrls && existingAnimal.Item.imageUrls.length > 0) {
      console.log(`Deleting ${existingAnimal.Item.imageUrls.length} images from S3`);
      for (const imageUrl of existingAnimal.Item.imageUrls) {
        try {
          const key = extractS3Key(imageUrl);
          if (key) {
            await deleteFromS3(IMAGES_BUCKET, key);
            console.log(`Deleted image: ${key}`);
          }
        } catch (deleteError) {
          console.error('Error deleting image:', deleteError);
          // Continue with deletion even if one image fails
        }
      }
    }

    // Delete health record from S3
    if (existingAnimal.Item.healthRecordUrl) {
      try {
        const key = extractS3Key(existingAnimal.Item.healthRecordUrl);
        if (key) {
          await deleteFromS3(HEALTH_RECORDS_BUCKET, key);
          console.log(`Deleted health record: ${key}`);
        }
      } catch (deleteError) {
        console.error('Error deleting health record:', deleteError);
        // Continue with deletion even if health record fails
      }
    }

    // Delete from DynamoDB
    const deleteParams = {
      TableName: ANIMALS_TABLE,
      Key: { animalId }
    };

    await dynamodb.send(new DeleteCommand(deleteParams));
    console.log(`Successfully deleted animal ${animalId}`);

    return generateResponse(200, { 
      message: 'Animal deleted successfully',
      deletedAnimalId: animalId
    });
  } catch (error) {
    console.error('Error deleting animal:', error);
    
    if (error.name === 'ValidationException') {
      return generateResponse(400, { error: 'Invalid data format' });
    }
    
    return generateResponse(500, { error: 'Internal server error' });
  }
};

// Main handler
export const handler = async (event) => {
  console.log('Lambda function invoked with event:', JSON.stringify(event, null, 2));

  try {
    const { httpMethod, pathParameters, body } = event;

    switch (httpMethod) {
      case 'GET':
        return await getAnimals(event);
      case 'POST':
        return await createAnimal(event);
      case 'PUT':
        return await updateAnimal(event);
      case 'DELETE':
        return await deleteAnimal(event);
      case 'OPTIONS':
        return generateResponse(200, {});
      default:
        return generateResponse(405, { error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Handler error:', error);
    return generateResponse(500, { error: 'Internal server error' });
  }
};