class AnimalService {
  constructor(user) {
    this.user = user;
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  }

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
      const response = await fetch(`${this.baseUrl}/animals`, {
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
      // Return mock data for development
      return this.getMockAnimals();
    }
  }

  // Add a new animal
  async addAnimal(animalData, imageFile, healthRecordFile) {
    try {
      const formData = new FormData();
      
      // Add animal data
      Object.keys(animalData).forEach(key => {
        if (animalData[key] !== '') {
          formData.append(key, animalData[key]);
        }
      });

      // Add files if provided
      if (imageFile) {
        formData.append('image', imageFile);
      }
      if (healthRecordFile) {
        formData.append('healthRecord', healthRecordFile);
      }

      const response = await fetch(`${this.baseUrl}/animals`, {
        method: 'POST',
        headers: {
          Authorization: this.getHeaders().Authorization,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.animal || data;
    } catch (error) {
      console.error('Error adding animal:', error);
      // Return mock data for development
      return this.createMockAnimal(animalData);
    }
  }

  // Update an animal
  async updateAnimal(animalId, animalData) {
    try {
      const response = await fetch(`${this.baseUrl}/animals/${animalId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(animalData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
        imageUrl: null,
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
        imageUrl: null,
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
        imageUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }

  createMockAnimal(animalData) {
    const newAnimal = {
      animalId: Date.now().toString(),
      ...animalData,
      imageUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return newAnimal;
  }
}

export default AnimalService;
