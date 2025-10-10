// All AWS operations are now handled via your API Gateway + Lambda.
// We intentionally avoid issuing AWS credentials in the browser.

// AWS Configuration
const region = 'us-east-1';
const identityPoolId = 'us-east-1:3749f1ad-a6f8-4b3b-98aa-11efa9dcd5c8';

// API Gateway base URL
const API_BASE_URL = '';

// No client-side AWS SDK clients are created anymore.

// DynamoDB Table Names
const ANIMALS_TABLE = 'PetVerse-Animals';
const HEALTH_RECORDS_TABLE = 'PetVerse-HealthRecords';

// S3 Bucket Names
const ANIMALS_BUCKET = 'petverse-animals-media';
const HEALTH_RECORDS_BUCKET = 'petverse-health-records';

class AnimalService {
  constructor(user) {
    this.user = user;
  }

  // Generate unique ID
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // Helper: call API Gateway with auth and timeout
  async apiFetch(path, { method = 'GET', body } = {}) {
    const token = this.user?.signInUserSession?.idToken?.jwtToken;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: token } : {})
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`API ${method} ${path} failed: ${res.status} ${text}`);
      }
      return await res.json();
    } finally {
      clearTimeout(id);
    }
  }

  // Upload file using API-provided S3 presigned URL
  async uploadToS3(file) {
    try {
      // 1) Ask API for a presigned PUT URL
      const { url, publicUrl } = await this.apiFetch('/uploads', {
        method: 'POST',
        body: { fileName: file.name, contentType: file.type }
      });

      // 2) Upload directly to S3 with the signed URL
      const putRes = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });
      if (!putRes.ok) {
        const t = await putRes.text().catch(() => '');
        throw new Error(`S3 PUT failed: ${putRes.status} ${t}`);
      }

      // 3) Return the public URL for storage
      return publicUrl;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  // Add new animal
  async addAnimal(animalData, imageFile = null, healthRecordFile = null) {
    try {
      const animalId = this.generateId();
      const timestamp = new Date().toISOString();
      const userId = this.user?.attributes?.sub || this.user?.username || 'anonymous';

      // Prepare animal data
      const animal = {
        animalId,
        userId,
        name: animalData.name,
        type: animalData.type,
        breed: animalData.breed,
        age: animalData.age,
        gender: animalData.gender,
        weight: animalData.weight,
        color: animalData.color,
        microchipId: animalData.microchipId,
        ownerName: animalData.ownerName,
        ownerEmail: animalData.ownerEmail,
        ownerPhone: animalData.ownerPhone,
        address: animalData.address,
        emergencyContact: animalData.emergencyContact,
        status: animalData.status || 'Healthy',
        notes: animalData.notes,
        createdAt: timestamp,
        updatedAt: timestamp,
        imageUrl: '',
        healthRecordUrl: ''
      };

      // Upload image if provided
      if (imageFile) {
        animal.imageUrl = await this.uploadToS3(imageFile);
      }

      // Upload health record if provided
      if (healthRecordFile) {
        const healthKey = `animals/${animalId}/health/${healthRecordFile.name}`;
        animal.healthRecordUrl = await this.uploadToS3(healthRecordFile, HEALTH_RECORDS_BUCKET, healthKey);
      }

      // Persist via API Gateway → Lambda → DynamoDB
      await this.apiFetch('/animals', { method: 'POST', body: animal });

      // Create health record entry if health file was uploaded
      if (healthRecordFile) {
        await this.addHealthRecord(animalId, {
          type: 'Initial Record',
          description: 'Initial health record upload',
          fileUrl: animal.healthRecordUrl,
          fileName: healthRecordFile.name,
          uploadedBy: userId
        });
      }

      return animal;
    } catch (error) {
      console.error('Add animal error:', error);
      throw new Error('Failed to add animal');
    }
  }

  // Get all animals for a user
  async getAnimals() {
    try {
      const data = await this.apiFetch('/animals');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Get animals error:', error);
      throw new Error('Failed to fetch animals');
    }
  }

  // Get single animal
  async getAnimal(animalId) {
    try {
      return await this.apiFetch(`/animals/${animalId}`);
    } catch (error) {
      console.error('Get animal error:', error);
      throw new Error('Failed to fetch animal');
    }
  }

  // Update animal
  async updateAnimal(animalId, updateData, imageFile = null, healthRecordFile = null) {
    try {
      const timestamp = new Date().toISOString();
      const userId = this.user?.attributes?.sub || this.user?.username || 'anonymous';

      // Prepare update expression
      let updateExpression = 'SET updatedAt = :updatedAt';
      let expressionAttributeValues = { ':updatedAt': timestamp };

      // Add fields to update
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && updateData[key] !== '') {
          updateExpression += `, ${key} = :${key}`;
          expressionAttributeValues[`:${key}`] = updateData[key];
        }
      });

      // Upload new image if provided
      if (imageFile) {
        const imageUrl = await this.uploadToS3(imageFile);
        updateExpression += ', imageUrl = :imageUrl';
        expressionAttributeValues[':imageUrl'] = imageUrl;
      }

      // Upload new health record if provided
      if (healthRecordFile) {
        const healthRecordUrl = await this.uploadToS3(healthRecordFile);
        updateExpression += ', healthRecordUrl = :healthRecordUrl';
        expressionAttributeValues[':healthRecordUrl'] = healthRecordUrl;

        // Add health record entry
        await this.addHealthRecord(animalId, {
          type: 'Health Record Update',
          description: 'Health record updated',
          fileUrl: healthRecordUrl,
          fileName: healthRecordFile.name,
          uploadedBy: userId
        });
      }

      const payload = Object.fromEntries(Object.entries(expressionAttributeValues).map(([k,v]) => [k.replace(':',''), v]));
      const updated = await this.apiFetch(`/animals/${animalId}`, { method: 'PUT', body: payload });
      return updated;
    } catch (error) {
      console.error('Update animal error:', error);
      throw new Error('Failed to update animal');
    }
  }

  // Delete animal
  async deleteAnimal(animalId) {
    try {
      await this.apiFetch(`/animals/${animalId}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Delete animal error:', error);
      throw new Error('Failed to delete animal');
    }
  }

  // Add health record
  async addHealthRecord(animalId, recordData) {
    try {
      const recordId = this.generateId();
      const timestamp = new Date().toISOString();

      const record = {
        recordId,
        animalId,
        type: recordData.type,
        description: recordData.description,
        fileUrl: recordData.fileUrl,
        fileName: recordData.fileName,
        uploadedBy: recordData.uploadedBy,
        createdAt: timestamp
      };

      // Optional: POST to backend if you add an endpoint later
      // await this.apiFetch(`/animals/${animalId}/health-records`, { method: 'POST', body: record });
      return record;
    } catch (error) {
      console.error('Add health record error:', error);
      throw new Error('Failed to add health record');
    }
  }

  // Get health records for an animal
  async getHealthRecords(animalId) {
    try {
      // Optional: GET from backend if you add an endpoint later
      // const data = await this.apiFetch(`/animals/${animalId}/health-records`);
      // return Array.isArray(data) ? data : [];
      return [];
    } catch (error) {
      console.error('Get health records error:', error);
      throw new Error('Failed to fetch health records');
    }
  }
}

export default AnimalService;
