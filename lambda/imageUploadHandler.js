import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});
const BUCKET = process.env.BUCKET_NAME || "petverse-product-images";

export const handler = async (event) => {
  try {
    console.log('🔄 Processing image upload request');
    console.log('Event:', JSON.stringify(event, null, 2));
    console.log('BUCKET_NAME:', BUCKET);

    // Parse the request body
    const { fileName, fileType, fileContent } = JSON.parse(event.body);

    // Validate required fields
    if (!fileName || !fileType || !fileContent) {
      console.error('❌ Missing required fields');
      return {
        statusCode: 400,
        headers: { 
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS"
        },
        body: JSON.stringify({ 
          error: "Missing required fields: fileName, fileType, fileContent" 
        })
      };
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(fileType.toLowerCase())) {
      console.error('❌ Invalid file type:', fileType);
      return {
        statusCode: 400,
        headers: { 
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS"
        },
        body: JSON.stringify({ 
          error: "Invalid file type. Allowed types: JPEG, JPG, PNG, GIF, WEBP" 
        })
      };
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(fileContent, "base64");
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (buffer.length > maxSize) {
      console.error('❌ File too large:', buffer.length, 'bytes');
      return {
        statusCode: 400,
        headers: { 
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS"
        },
        body: JSON.stringify({ 
          error: "File too large. Maximum size is 10MB" 
        })
      };
    }

    // Generate unique key for S3
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 9);
    const fileExtension = fileName.split('.').pop();
    const key = `products/${timestamp}_${randomString}.${fileExtension}`;

    console.log(`📤 Uploading image to S3: ${key}`);
    console.log(`📤 Bucket: ${BUCKET}`);

    // Upload to S3
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: fileType,
      Metadata: {
        originalName: fileName,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'petverse-api'
      }
    }));

    // Generate the public URL
    const imageUrl = `https://${BUCKET}.s3.amazonaws.com/${key}`;

    console.log(`✅ Image uploaded successfully: ${imageUrl}`);

    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify({ 
        imageUrl,
        key,
        fileName,
        fileType,
        size: buffer.length,
        uploadedAt: new Date().toISOString()
      })
    };
  } catch (err) {
    console.error('❌ Error uploading image:', err);
    return {
      statusCode: 500,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify({ 
        error: err.message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      })
    };
  }
}; 