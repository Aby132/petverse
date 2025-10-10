import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import AnimalService from '../../services/animalService';
import { useAuth } from '../../contexts/AuthContext';

const AdminAnimals = () => {
  const { user } = useAuth();
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [animalService, setAnimalService] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    breed: '',
    age: '',
    gender: '',
    weight: '',
    color: '',
    microchipId: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    address: '',
    emergencyContact: '',
    status: 'Healthy',
    notes: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [healthRecordFile, setHealthRecordFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);

  // Initialize animal service
  useEffect(() => {
    if (user) {
      setAnimalService(new AnimalService(user));
    }
  }, [user]);

  // Load animals on component mount
  useEffect(() => {
    if (animalService) {
      loadAnimals();
    }
  }, [animalService]);

  const loadAnimals = async () => {
    try {
      setLoading(true);
      setError('');
      const animalsData = await animalService.getAnimals();
      setAnimals(animalsData);
    } catch (err) {
      setError('Failed to load animals');
      console.error('Load animals error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleHealthRecordUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setHealthRecordFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!animalService) return;

    try {
      setUploading(true);
      setError('');

      // Validate required fields
      if (!formData.name || !formData.type || !formData.ownerName) {
        setError('Please fill in all required fields');
        return;
      }

      const newAnimal = await animalService.addAnimal(formData, imageFile, healthRecordFile);
      
      // Add to local state
      setAnimals(prev => [...prev, newAnimal]);
      
      // Reset form
      setFormData({
        name: '',
        type: '',
        breed: '',
        age: '',
        gender: '',
        weight: '',
        color: '',
        microchipId: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        address: '',
        emergencyContact: '',
        status: 'Healthy',
        notes: ''
      });
      setImageFile(null);
      setHealthRecordFile(null);
      setImagePreview('');
      setShowAddModal(false);
      
    } catch (err) {
      setError('Failed to add animal');
      console.error('Add animal error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAnimal = async (animalId) => {
    if (!animalService) return;
    if (!window.confirm('Are you sure you want to delete this animal?')) return;

    try {
      await animalService.deleteAnimal(animalId);
      setAnimals(prev => prev.filter(animal => animal.animalId !== animalId));
    } catch (err) {
      setError('Failed to delete animal');
      console.error('Delete animal error:', err);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Animals Management</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage pet profiles and health records</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!animalService}
            className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center sm:justify-start"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="hidden sm:inline">Add Animal</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <span className="text-2xl">🐕</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Dogs</p>
                <p className="text-2xl font-bold text-gray-900">{animals.filter(a => a.type === 'Dog').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg">
                <span className="text-2xl">🐱</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Cats</p>
                <p className="text-2xl font-bold text-gray-900">{animals.filter(a => a.type === 'Cat').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <span className="text-2xl">🐦</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Other Pets</p>
                <p className="text-2xl font-bold text-gray-900">{animals.filter(a => !['Dog', 'Cat'].includes(a.type)).length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <span className="text-2xl">🏥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Checkups Due</p>
                <p className="text-2xl font-bold text-gray-900">{animals.filter(a => a.status === 'Checkup Due').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex flex-wrap gap-4">
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option>All Types</option>
              <option>Dog</option>
              <option>Cat</option>
              <option>Bird</option>
              <option>Fish</option>
              <option>Other</option>
            </select>
            
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option>All Status</option>
              <option>Healthy</option>
              <option>Checkup Due</option>
              <option>Treatment</option>
              <option>Emergency</option>
            </select>
            
            <input
              type="text"
              placeholder="Search animals or owners..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-64"
            />
            
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm transition-colors">
              Export Records
            </button>
          </div>
        </div>

        {/* Animals Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-900">Animal</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-900">Type & Breed</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-900">Age</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-900">Owner</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500">
                      Loading animals...
                    </td>
                  </tr>
                ) : animals.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500">
                      No animals found. Add your first animal!
                    </td>
                  </tr>
                ) : (
                  animals.map((animal) => (
                    <tr key={animal.animalId} className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                            {animal.imageUrl ? (
                              <img src={animal.imageUrl} alt={animal.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg">
                                {animal.type === 'Dog' ? '🐕' : 
                                 animal.type === 'Cat' ? '🐱' : 
                                 animal.type === 'Bird' ? '🐦' : 
                                 animal.type === 'Fish' ? '🐠' : '🐾'}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{animal.name}</p>
                            <p className="text-sm text-gray-500">ID: {animal.animalId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{animal.type}</p>
                          <p className="text-sm text-gray-500">{animal.breed}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-900">{animal.age}</td>
                      <td className="py-4 px-6 text-sm text-gray-900">{animal.ownerName}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          animal.status === 'Healthy' ? 'bg-green-100 text-green-800' :
                          animal.status === 'Checkup Due' ? 'bg-yellow-100 text-yellow-800' :
                          animal.status === 'Treatment' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {animal.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
                          <button className="text-green-600 hover:text-green-800 text-sm">Edit</button>
                          <button className="text-purple-600 hover:text-purple-800 text-sm">Health</button>
                          <button 
                            onClick={() => handleDeleteAnimal(animal.animalId)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <div className="flex items-center">
                  <span className="text-xl mr-3">📅</span>
                  <div>
                    <p className="font-medium text-blue-900">Schedule Checkup</p>
                    <p className="text-sm text-blue-600">Book veterinary appointments</p>
                  </div>
                </div>
              </button>
              
              <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                <div className="flex items-center">
                  <span className="text-xl mr-3">💉</span>
                  <div>
                    <p className="font-medium text-green-900">Vaccination Records</p>
                    <p className="text-sm text-green-600">Update immunization status</p>
                  </div>
                </div>
              </button>
              
              <button className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <div className="flex items-center">
                  <span className="text-xl mr-3">📋</span>
                  <div>
                    <p className="font-medium text-purple-900">Health Reports</p>
                    <p className="text-sm text-purple-600">Generate health summaries</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Buddy completed checkup</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New animal registered</p>
                  <p className="text-xs text-gray-500">4 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Vaccination reminder sent</p>
                  <p className="text-xs text-gray-500">1 day ago</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming</h3>
            <div className="space-y-3">
              <div className="border-l-4 border-yellow-400 pl-3">
                <p className="text-sm font-medium">Whiskers - Annual Checkup</p>
                <p className="text-xs text-gray-500">Tomorrow, 2:00 PM</p>
              </div>
              
              <div className="border-l-4 border-blue-400 pl-3">
                <p className="text-sm font-medium">Charlie - Wing Trimming</p>
                <p className="text-xs text-gray-500">Friday, 10:00 AM</p>
              </div>
              
              <div className="border-l-4 border-green-400 pl-3">
                <p className="text-sm font-medium">Nemo - Tank Cleaning</p>
                <p className="text-xs text-gray-500">Next Monday</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Animal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add New Animal</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Animal Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter animal name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Bird">Bird</option>
                    <option value="Fish">Fish</option>
                    <option value="Rabbit">Rabbit</option>
                    <option value="Hamster">Hamster</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
                  <input
                    type="text"
                    name="breed"
                    value={formData.breed}
                    onChange={handleInputChange}
                    placeholder="Enter breed"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input
                    type="text"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="e.g., 2 years, 6 months"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                  <input
                    type="text"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    placeholder="e.g., 25 lbs, 12 kg"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    placeholder="e.g., Brown, Black, White"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Microchip ID</label>
                  <input
                    type="text"
                    name="microchipId"
                    value={formData.microchipId}
                    onChange={handleInputChange}
                    placeholder="Microchip number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* Owner Information */}
              <div className="border-t pt-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Owner Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name *</label>
                    <input
                      type="text"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleInputChange}
                      placeholder="Enter owner name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Owner Email</label>
                    <input
                      type="email"
                      name="ownerEmail"
                      value={formData.ownerEmail}
                      onChange={handleInputChange}
                      placeholder="Enter email"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Owner Phone</label>
                    <input
                      type="tel"
                      name="ownerPhone"
                      value={formData.ownerPhone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleInputChange}
                      placeholder="Emergency contact info"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter full address"
                    rows="2"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* Health Information */}
              <div className="border-t pt-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Health Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="Healthy">Healthy</option>
                      <option value="Checkup Due">Checkup Due</option>
                      <option value="Treatment">Treatment</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Any additional notes about the animal"
                    rows="3"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* File Uploads */}
              <div className="border-t pt-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Upload Files</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Animal Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                    {imagePreview && (
                      <div className="mt-2">
                        <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Health Records</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleHealthRecordUpload}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                    {healthRecordFile && (
                      <p className="text-sm text-gray-600 mt-1">Selected: {healthRecordFile.name}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400"
                >
                  {uploading ? 'Adding...' : 'Add Animal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAnimals;
