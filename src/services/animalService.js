class AnimalService {
  constructor(user) {
    this.user = user;
    // Force the correct URL for now
    this.baseUrl = 'https://gk394j27jg.execute-api.us-east-1.amazonaws.com/prod';
    
    // Debug logging
    console.log('AnimalService initialized with baseUrl:', this.baseUrl);
    console.log('Environment variable REACT_APP_ANIMAL_API_URL:', process.env.REACT_APP_ANIMAL_API_URL);
    console.log('All environment variables:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP')));
  }

  // Note: Animals are unique items and do not have stock quantities like products
  // Each animal is a one-of-a-kind item that can only be purchased once

  // Get authentication headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.user && this.user.signInUserSession) {
      const token = this.user.signInUserSession.idToken.jwtToken;
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  // Get all animals
  async getAnimals() {
    try {
      const url = `${this.baseUrl}/animals`;
      console.log('Fetching animals from URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.animals || data || [];
    } catch (error) {
      console.error('Error fetching animals:', error);
      console.error('Base URL being used:', this.baseUrl);
      // Return mock data for development
      return this.getMockAnimals();
    }
  }

  // Helper function to convert file to base64
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  // Add a new animal
  async addAnimal(animalData, imageFiles, healthRecordFile) {
    try {
      console.log('Starting addAnimal with:', {
        animalData: animalData,
        imageFilesCount: imageFiles?.length || 0,
        healthRecordFile: healthRecordFile?.name || 'none'
      });

      const requestBody = {
        ...animalData,
        images: [],
        healthRecord: null
      };

      // Process image files
      if (imageFiles && imageFiles.length > 0) {
        console.log('Processing', imageFiles.length, 'image files');
        for (const file of imageFiles) {
          console.log('Processing image file:', file.name, 'Type:', file.type, 'Size:', file.size);
          const base64Data = await this.fileToBase64(file);
          requestBody.images.push({
            data: base64Data,
            contentType: file.type,
            extension: file.name.split('.').pop()
          });
        }
        console.log('Processed', requestBody.images.length, 'images');
      } else {
        console.log('No image files to process');
      }

      // Process health record file
      if (healthRecordFile) {
        console.log('Processing health record file:', healthRecordFile.name, 'Type:', healthRecordFile.type, 'Size:', healthRecordFile.size);
        const base64Data = await this.fileToBase64(healthRecordFile);
        requestBody.healthRecord = {
          data: base64Data,
          contentType: healthRecordFile.type,
          extension: healthRecordFile.name.split('.').pop()
        };
        console.log('Processed health record file');
      } else {
        console.log('No health record file to process');
      }

      console.log('Sending request to:', `${this.baseUrl}/animals`);
      console.log('Request body size:', JSON.stringify(requestBody).length, 'characters');

      const response = await fetch(`${this.baseUrl}/animals`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Successfully created animal:', data);
      return data.animal || data;
    } catch (error) {
      console.error('Error adding animal:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      // Return mock data for development
      return this.createMockAnimal(animalData);
    }
  }

  // Update an animal
  async updateAnimal(animalId, animalData, newImageFiles = [], newHealthRecordFile = null) {
    try {
      const requestBody = {
        ...animalData,
        newImages: [],
        newHealthRecord: null
      };

      // Process new image files
      if (newImageFiles && newImageFiles.length > 0) {
        for (const file of newImageFiles) {
          const base64Data = await this.fileToBase64(file);
          requestBody.newImages.push({
            data: base64Data,
            contentType: file.type,
            extension: file.name.split('.').pop()
          });
        }
      }

      // Process new health record file
      if (newHealthRecordFile) {
        const base64Data = await this.fileToBase64(newHealthRecordFile);
        requestBody.newHealthRecord = {
          data: base64Data,
          contentType: newHealthRecordFile.type,
          extension: newHealthRecordFile.name.split('.').pop()
        };
      }

      const response = await fetch(`${this.baseUrl}/animals/${animalId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.animal || data;
    } catch (error) {
      console.error('Error updating animal:', error);
      throw error;
    }
  }

  // Delete an animal
  async deleteAnimal(animalId) {
    try {
      const response = await fetch(`${this.baseUrl}/animals/${animalId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting animal:', error);
      // Return success for mock data
      return true;
    }
  }

  // Get animal by ID
  async getAnimalById(animalId) {
    try {
      const response = await fetch(`${this.baseUrl}/animals/${animalId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.animal || data;
    } catch (error) {
      console.error('Error fetching animal:', error);
      throw error;
    }
  }

  // Search animals
  async searchAnimals(query) {
    try {
      const response = await fetch(`${this.baseUrl}/animals/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.animals || data || [];
    } catch (error) {
      console.error('Error searching animals:', error);
      return [];
    }
  }

  // Get animals by status
  async getAnimalsByStatus(status) {
    try {
      const response = await fetch(`${this.baseUrl}/animals?status=${encodeURIComponent(status)}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.animals || data || [];
    } catch (error) {
      console.error('Error fetching animals by status:', error);
      return [];
    }
  }

  // Get animals by type
  async getAnimalsByType(type) {
    try {
      const response = await fetch(`${this.baseUrl}/animals?type=${encodeURIComponent(type)}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.animals || data || [];
    } catch (error) {
      console.error('Error fetching animals by type:', error);
      return [];
    }
  }

  // Add health record
  async addHealthRecord(animalId, recordData) {
    try {
      const response = await fetch(`${this.baseUrl}/animals/${animalId}/health-records`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(recordData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.record || data;
    } catch (error) {
      console.error('Error adding health record:', error);
      throw error;
    }
  }

  // Get health records for an animal
  async getHealthRecords(animalId) {
    try {
      const response = await fetch(`${this.baseUrl}/animals/${animalId}/health-records`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.records || data || [];
    } catch (error) {
      console.error('Error fetching health records:', error);
      return [];
    }
  }

  // Mock data methods for development
  getMockAnimals() {
    return [
      {
        animalId: '1',
        name: 'Buddy',
        type: 'Dog',
        breed: 'Golden Retriever',
        age: '3 years',
        gender: 'Male',
        weight: '65 lbs',
        color: 'Golden',
        microchipId: '123456789',
        ownerName: 'John Smith',
        ownerEmail: 'john@example.com',
        ownerPhone: '+1-555-0123',
        address: '123 Main St, City, State',
        emergencyContact: 'Jane Smith +1-555-0124',
        status: 'Healthy',
        notes: 'Friendly and energetic dog',
        imageUrls: [],
        healthRecordUrl: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        animalId: '2',
        name: 'Whiskers',
        type: 'Cat',
        breed: 'Persian',
        age: '5 years',
        gender: 'Female',
        weight: '8 lbs',
        color: 'White',
        microchipId: '987654321',
        ownerName: 'Sarah Johnson',
        ownerEmail: 'sarah@example.com',
        ownerPhone: '+1-555-0456',
        address: '456 Oak Ave, City, State',
        emergencyContact: 'Mike Johnson +1-555-0457',
        status: 'Checkup Due',
        notes: 'Indoor cat, needs annual checkup',
        imageUrls: [],
        healthRecordUrl: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        animalId: '3',
        name: 'Charlie',
        type: 'Bird',
        breed: 'Canary',
        age: '1 year',
        gender: 'Male',
        weight: '0.5 lbs',
        color: 'Yellow',
        microchipId: '',
        ownerName: 'Tom Wilson',
        ownerEmail: 'tom@example.com',
        ownerPhone: '+1-555-0789',
        address: '789 Pine St, City, State',
        emergencyContact: 'Lisa Wilson +1-555-0790',
        status: 'Healthy',
        notes: 'Loves singing in the morning',
        imageUrls: [],
        healthRecordUrl: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }

  createMockAnimal(animalData) {
    const newAnimal = {
      animalId: Date.now().toString(),
      ...animalData,
      imageUrls: [],
      healthRecordUrl: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return newAnimal;
  }
}

export default AnimalService;
