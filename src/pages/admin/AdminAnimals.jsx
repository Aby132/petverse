import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import AnimalService from '../../services/animalService';
import { useAuth } from '../../contexts/AuthContext';
import Swal from 'sweetalert2';

const AdminAnimals = () => {
  const { user } = useAuth();
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [animalService, setAnimalService] = useState(null);
  
  // Animal orders state
  const [animalOrders, setAnimalOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [showOrdersSection, setShowOrdersSection] = useState(false);
  
  // Sold animals state
  const [soldAnimals, setSoldAnimals] = useState([]);
  const [soldAnimalsLoading, setSoldAnimalsLoading] = useState(false);
  const [showSoldAnimalsSection, setShowSoldAnimalsSection] = useState(false);
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState(false);

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
    price: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    address: '',
    emergencyContact: '',
    status: 'Healthy',
    notes: ''
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [healthRecordFile, setHealthRecordFile] = useState(null);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // View and Edit modals
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editImagePreviews, setEditImagePreviews] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [newHealthRecordFile, setNewHealthRecordFile] = useState(null);

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
      // Filter out sold animals from the main animals list
      const availableAnimals = animalsData.filter(animal => 
        animal.status !== 'Sold' && 
        animal.orderStatus !== 'delivered' && 
        animal.orderStatus !== 'completed' &&
        !animal.isSold &&
        animal.availability !== 'Sold'
      );
      setAnimals(availableAnimals);
      console.log(`Loaded ${availableAnimals.length} available animals (filtered out ${animalsData.length - availableAnimals.length} sold animals)`);
    } catch (err) {
      setError('Failed to load animals');
      console.error('Load animals error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnimalOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await fetch('https://m3hoptm1hi.execute-api.us-east-1.amazonaws.com/prod/admin/orders');
      
      if (response.ok) {
        const allOrders = await response.json();
        // Filter orders that contain animals
        const animalOrdersData = allOrders.filter(order => 
          order.items && order.items.some(item => 
            item.isAnimal === true || 
            item.animalId || 
            (item.type && item.breed) || 
            (item.type && item.ownerName)
          )
        );
        setAnimalOrders(animalOrdersData);
      } else {
        throw new Error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error loading animal orders:', error);
      setAnimalOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadSoldAnimals = async () => {
    try {
      setSoldAnimalsLoading(true);
      const animalsData = await animalService.getAnimals();
      // Filter only sold animals - check multiple status indicators
      const soldAnimalsData = animalsData.filter(animal => 
        animal.status === 'Sold' || 
        animal.orderStatus === 'delivered' || 
        animal.orderStatus === 'completed' ||
        animal.isSold === true ||
        animal.availability === 'Sold'
      );
      setSoldAnimals(soldAnimalsData);
      console.log(`Loaded ${soldAnimalsData.length} sold animals`);
    } catch (err) {
      console.error('Error loading sold animals:', err);
      setSoldAnimals([]);
    } finally {
      setSoldAnimalsLoading(false);
    }
  };

  const getOrderStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const updateAnimalOrderStatus = async (animalId, newStatus) => {
    try {
      setUpdatingOrderStatus(true);
      
      console.log(`Attempting to update animal ${animalId} order status to ${newStatus}`);
      
      // Update local state optimistically
      setSoldAnimals(prevAnimals => 
        prevAnimals.map(animal => 
          animal.animalId === animalId 
            ? { ...animal, orderStatus: newStatus, updatedAt: new Date().toISOString() }
            : animal
        )
      );

      // Make API call to update the animal order status
      const url = `${animalService.baseUrl}/animals/${animalId}/order-status`;
      console.log('Making request to:', url);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ orderStatus: newStatus })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const responseData = await response.json();
        console.log('Update successful:', responseData);
        await Swal.fire({
          icon: 'success',
          title: 'Status Updated',
          text: `Animal order status changed to ${newStatus}`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        
        // Revert optimistic update on failure
        await loadSoldAnimals();
        
        let errorMessage = 'Failed to update animal order status';
        if (response.status === 403) {
          errorMessage = 'Access denied. Please check your permissions.';
        } else if (response.status === 404) {
          errorMessage = 'Animal not found.';
        } else if (response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error updating animal order status:', error);
      
      // Revert optimistic update
      await loadSoldAnimals();
      
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.message || 'Failed to update animal order status. Please try again.',
        confirmButtonColor: '#3B82F6'
      });
    } finally {
      setUpdatingOrderStatus(false);
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
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setImageFiles(prev => [...prev, ...files]);
      
      // Generate previews for new files
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreviews(prev => [...prev, {
            file,
            preview: e.target.result,
            id: Date.now() + Math.random()
          }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleHealthRecordUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        Swal.fire({
          icon: 'error',
          title: 'Invalid File Type',
          text: 'Please select a PDF file for health records.',
          confirmButtonText: 'OK'
        });
        e.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file size (10MB = 10 * 1024 * 1024 bytes)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        Swal.fire({
          icon: 'error',
          title: 'File Too Large',
          text: 'Health record file must be less than 10MB.',
          confirmButtonText: 'OK'
        });
        e.target.value = ''; // Clear the input
        return;
      }
      
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
        Swal.fire({
          icon: 'warning',
          title: 'Missing Required Fields',
          text: 'Please fill in all required fields (Name, Type, and Owner Name).',
          confirmButtonText: 'OK'
        });
        return;
      }

      const newAnimal = await animalService.addAnimal(formData, imageFiles, healthRecordFile);
      
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
        price: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        address: '',
        emergencyContact: '',
        status: 'Healthy',
        notes: ''
      });
      setImageFiles([]);
      setHealthRecordFile(null);
      setImagePreviews([]);
      setShowAddModal(false);
      
      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Animal added successfully!',
        confirmButtonText: 'OK'
      });
      
    } catch (err) {
      console.error('Add animal error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to add animal. Please try again.',
        confirmButtonText: 'OK'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleViewAnimal = (animal) => {
    setSelectedAnimal(animal);
    setShowViewModal(true);
  };

  const handleEditAnimal = (animal) => {
    setSelectedAnimal(animal);
    setEditFormData({
      name: animal.name,
      type: animal.type,
      breed: animal.breed,
      age: animal.age,
      gender: animal.gender,
      weight: animal.weight,
      color: animal.color,
      microchipId: animal.microchipId,
      price: animal.price || '',
      ownerName: animal.ownerName,
      ownerEmail: animal.ownerEmail,
      ownerPhone: animal.ownerPhone,
      address: animal.address,
      emergencyContact: animal.emergencyContact,
      status: animal.status,
      notes: animal.notes
    });
    setEditImagePreviews(animal.imageUrls || []);
    setNewImageFiles([]);
    setNewHealthRecordFile(null);
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNewImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Replace all images with new ones (not add to existing)
      setNewImageFiles(files);
      
      // Generate previews for new files only
      const newPreviews = [];
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.push({
            file,
            preview: e.target.result,
            id: Date.now() + Math.random(),
            isNew: true
          });
          
          // Update previews when all files are processed
          if (newPreviews.length === files.length) {
            setEditImagePreviews(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeEditImage = (index) => {
    setEditImagePreviews(prev => prev.filter((_, i) => i !== index));
    setNewImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleNewHealthRecordUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        Swal.fire({
          icon: 'error',
          title: 'Invalid File Type',
          text: 'Please select a PDF file for health records.',
          confirmButtonText: 'OK'
        });
        e.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file size (10MB = 10 * 1024 * 1024 bytes)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        Swal.fire({
          icon: 'error',
          title: 'File Too Large',
          text: 'Health record file must be less than 10MB.',
          confirmButtonText: 'OK'
        });
        e.target.value = ''; // Clear the input
        return;
      }
      
      setNewHealthRecordFile(file);
    }
  };

  const handleUpdateAnimal = async (e) => {
    e.preventDefault();
    if (!animalService || !selectedAnimal) return;

    try {
      setUploading(true);
      setError('');

      const updatedAnimal = await animalService.updateAnimal(
        selectedAnimal.animalId,
        editFormData,
        newImageFiles,
        newHealthRecordFile
      );
      
      // Update local state
      setAnimals(prev => prev.map(animal => 
        animal.animalId === selectedAnimal.animalId ? updatedAnimal : animal
      ));
      
      // Reset edit form
      setEditFormData({});
      setEditImagePreviews([]);
      setNewImageFiles([]);
      setNewHealthRecordFile(null);
      setShowEditModal(false);
      setSelectedAnimal(null);
      
      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Animal updated successfully!',
        confirmButtonText: 'OK'
      });
      
    } catch (err) {
      console.error('Update animal error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update animal. Please try again.',
        confirmButtonText: 'OK'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAnimal = async (animalId) => {
    if (!animalService) return;
    
    // Use SweetAlert for confirmation
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      await animalService.deleteAnimal(animalId);
      setAnimals(prev => prev.filter(animal => animal.animalId !== animalId));
      
      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'Animal has been deleted successfully.',
        confirmButtonText: 'OK'
      });
    } catch (err) {
      console.error('Delete animal error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to delete animal. Please try again.',
        confirmButtonText: 'OK'
      });
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
                            {animal.imageUrls && animal.imageUrls.length > 0 ? (
                              <img src={animal.imageUrls[0]} alt={animal.name} className="w-full h-full object-cover" />
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
                            {animal.imageUrls && animal.imageUrls.length > 1 && (
                              <p className="text-xs text-blue-600">+{animal.imageUrls.length - 1} more images</p>
                            )}
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
                          <button 
                            onClick={() => handleViewAnimal(animal)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View
                          </button>
                          <button 
                            onClick={() => handleEditAnimal(animal)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteAnimal(animal.animalId)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
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

        {/* Sold Animals Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Sold Animals</h2>
                <p className="text-gray-600">View animals that have been sold</p>
              </div>
              <button
                onClick={() => {
                  setShowSoldAnimalsSection(!showSoldAnimalsSection);
                  if (!showSoldAnimalsSection && soldAnimals.length === 0) {
                    loadSoldAnimals();
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {showSoldAnimalsSection ? 'Hide Sold Animals' : 'Show Sold Animals'}
              </button>
            </div>
          </div>
          
          {showSoldAnimalsSection && (
            <div className="p-6">
              {soldAnimalsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading sold animals...</p>
                </div>
              ) : soldAnimals.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🛒</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Sold Animals Found</h3>
                  <p className="text-gray-600">No animals have been sold yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Animal</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type & Breed</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {soldAnimals.map((animal) => (
                        <tr key={animal.animalId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                                {animal.imageUrls && animal.imageUrls.length > 0 ? (
                                  <img src={animal.imageUrls[0]} alt={animal.name} className="w-full h-full object-cover" />
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
                                <div className="text-sm font-medium text-gray-900">{animal.name}</div>
                                <div className="text-sm text-gray-500">ID: {animal.animalId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{animal.type}</div>
                              <div className="text-sm text-gray-500">{animal.breed}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{animal.ownerName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Sold
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(animal.orderStatus)}`}>
                              {animal.orderStatus || 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-2">
                              <select
                                value={animal.orderStatus || 'pending'}
                                onChange={(e) => {
                                  const newStatus = e.target.value;
                                  console.log(`Status change requested for animal ${animal.animalId}: ${newStatus}`);
                                  updateAnimalOrderStatus(animal.animalId, newStatus);
                                }}
                                disabled={updatingOrderStatus}
                                className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                              >
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                              <div className="flex space-x-1">
                                <button 
                                  onClick={() => handleViewAnimal(animal)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  View
                                </button>
                                <button 
                                  onClick={() => {
                                    // Manual update fallback - just update local state
                                    setSoldAnimals(prevAnimals => 
                                      prevAnimals.map(a => 
                                        a.animalId === animal.animalId 
                                          ? { ...a, orderStatus: animal.orderStatus || 'pending', updatedAt: new Date().toISOString() }
                                          : a
                                      )
                                    );
                                    Swal.fire({
                                      icon: 'info',
                                      title: 'Local Update',
                                      text: 'Status updated locally. API sync may be unavailable.',
                                      timer: 2000,
                                      showConfirmButton: false
                                    });
                                  }}
                                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                                  title="Manual update (when API is unavailable)"
                                >
                                  Sync
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Animal Orders Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Animal Orders</h2>
                <p className="text-gray-600">Manage orders containing animals</p>
              </div>
              <button
                onClick={() => {
                  setShowOrdersSection(!showOrdersSection);
                  if (!showOrdersSection && animalOrders.length === 0) {
                    loadAnimalOrders();
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {showOrdersSection ? 'Hide Orders' : 'Show Orders'}
              </button>
            </div>
          </div>
          
          {showOrdersSection && (
            <div className="p-6">
              {ordersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading animal orders...</p>
                </div>
              ) : animalOrders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🐾</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Animal Orders Found</h3>
                  <p className="text-gray-600">No orders containing animals have been placed yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Animals</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {animalOrders.map((order) => (
                        <tr key={order.orderId} className="hover:bg-gray-50">
                          {/* Order Info */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">#{order.orderId}</div>
                              <div className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</div>
                              <div className="text-sm font-medium text-green-600">₹{order.total}</div>
                            </div>
                          </td>

                          {/* Customer Info */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{order.customerName || order.deliveryAddress?.name}</div>
                              <div className="text-sm text-gray-500">{order.customerEmail || order.deliveryAddress?.email}</div>
                              <div className="text-sm text-gray-500">{order.deliveryAddress?.phone}</div>
                            </div>
                          </td>

                          {/* Animal Items */}
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {order.items.filter(item => 
                                item.isAnimal === true || 
                                item.animalId || 
                                (item.type && item.breed) || 
                                (item.type && item.ownerName)
                              ).slice(0, 2).map((item, index) => (
                                <div key={index} className="flex items-center space-x-2 bg-blue-50 rounded-lg p-2 mb-1">
                                  <img
                                    src={item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : 
                                         item.imageUrl || 'https://placehold.co/32x32?text=🐾'}
                                    alt={item.name}
                                    className="w-8 h-8 object-cover rounded"
                                    onError={(e) => {
                                      e.target.src = 'https://placehold.co/32x32?text=🐾';
                                    }}
                                  />
                                  <div>
                                    <div className="text-xs font-medium text-gray-900 truncate max-w-20">{item.name}</div>
                                    <div className="text-xs text-gray-500">{item.type} • {item.breed}</div>
                                  </div>
                                </div>
                              ))}
                              {order.items.filter(item => 
                                item.isAnimal === true || 
                                item.animalId || 
                                (item.type && item.breed) || 
                                (item.type && item.ownerName)
                              ).length > 2 && (
                                <div className="text-xs text-gray-500 bg-blue-100 rounded-lg p-2">
                                  +{order.items.filter(item => 
                                    item.isAnimal === true || 
                                    item.animalId || 
                                    (item.type && item.breed) || 
                                    (item.type && item.ownerName)
                                  ).length - 2} more animals
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Payment Info */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm capitalize font-medium text-gray-900">
                                {order.paymentMethod === 'cod' ? 'COD' : order.paymentMethod}
                              </div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                order.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                order.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                order.paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.paymentStatus}
                              </span>
                            </div>
                          </td>

                          {/* Order Status */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                View Details
                              </button>
                              <button className="text-green-600 hover:text-green-800 text-sm font-medium">
                                Update Status
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="Enter price in rupees"
                    min="0"
                    step="0.01"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Animal Photos (Multiple)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">You can select multiple images at once</p>
                    
                    {/* Image Previews */}
                    {imagePreviews.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Selected Images ({imagePreviews.length}):</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {imagePreviews.map((preview, index) => (
                            <div key={preview.id} className="relative">
                              <img 
                                src={preview.preview} 
                                alt={`Preview ${index + 1}`} 
                                className="w-full h-20 object-cover rounded-lg border border-gray-200" 
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                              <p className="text-xs text-gray-500 mt-1 truncate">{preview.file.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Health Records</label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleHealthRecordUpload}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">Only PDF files allowed, maximum 10MB</p>
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

      {/* View Animal Modal */}
      {showViewModal && selectedAnimal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Animal Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Animal Images */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Photos</h4>
                {selectedAnimal.imageUrls && selectedAnimal.imageUrls.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedAnimal.imageUrls.map((imageUrl, index) => (
                      <img
                        key={index}
                        src={imageUrl}
                        alt={`${selectedAnimal.name} photo ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border border-gray-200"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <span className="text-4xl">📷</span>
                    <p>No photos available</p>
                  </div>
                )}
              </div>

              {/* Animal Information */}
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Name:</span>
                      <p className="text-gray-900">{selectedAnimal.name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Type:</span>
                      <p className="text-gray-900">{selectedAnimal.type}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Breed:</span>
                      <p className="text-gray-900">{selectedAnimal.breed || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Age:</span>
                      <p className="text-gray-900">{selectedAnimal.age || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Gender:</span>
                      <p className="text-gray-900">{selectedAnimal.gender || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Weight:</span>
                      <p className="text-gray-900">{selectedAnimal.weight || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Color:</span>
                      <p className="text-gray-900">{selectedAnimal.color || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Microchip ID:</span>
                      <p className="text-gray-900">{selectedAnimal.microchipId || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Price:</span>
                      <p className="text-gray-900">{selectedAnimal.price ? `₹${selectedAnimal.price}` : 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {/* Owner Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Owner Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Name:</span>
                      <p className="text-gray-900">{selectedAnimal.ownerName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Email:</span>
                      <p className="text-gray-900">{selectedAnimal.ownerEmail || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Phone:</span>
                      <p className="text-gray-900">{selectedAnimal.ownerPhone || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Address:</span>
                      <p className="text-gray-900">{selectedAnimal.address || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Emergency Contact:</span>
                      <p className="text-gray-900">{selectedAnimal.emergencyContact || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Health Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Health Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Status:</span>
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        selectedAnimal.status === 'Healthy' ? 'bg-green-100 text-green-800' :
                        selectedAnimal.status === 'Checkup Due' ? 'bg-yellow-100 text-yellow-800' :
                        selectedAnimal.status === 'Treatment' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedAnimal.status}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Notes:</span>
                      <p className="text-gray-900 mt-1">{selectedAnimal.notes || 'No notes available'}</p>
                    </div>
                    {selectedAnimal.healthRecordUrl && (
                      <div>
                        <span className="font-medium text-gray-600">Health Record:</span>
                        <a
                          href={selectedAnimal.healthRecordUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:text-blue-800 underline"
                        >
                          View Health Record
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Created: {new Date(selectedAnimal.createdAt).toLocaleString()}</p>
                    <p>Last Updated: {new Date(selectedAnimal.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEditAnimal(selectedAnimal);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Edit Animal
              </button>
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Animal Modal */}
      {showEditModal && selectedAnimal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Edit Animal: {selectedAnimal.name}</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateAnimal} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Animal Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={editFormData.name || ''}
                    onChange={handleEditInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    name="type"
                    value={editFormData.type || ''}
                    onChange={handleEditInputChange}
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
                    value={editFormData.breed || ''}
                    onChange={handleEditInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input
                    type="text"
                    name="age"
                    value={editFormData.age || ''}
                    onChange={handleEditInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    name="gender"
                    value={editFormData.gender || ''}
                    onChange={handleEditInputChange}
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
                    value={editFormData.weight || ''}
                    onChange={handleEditInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="text"
                    name="color"
                    value={editFormData.color || ''}
                    onChange={handleEditInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Microchip ID</label>
                  <input
                    type="text"
                    name="microchipId"
                    value={editFormData.microchipId || ''}
                    onChange={handleEditInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    name="price"
                    value={editFormData.price || ''}
                    onChange={handleEditInputChange}
                    placeholder="Enter price in rupees"
                    min="0"
                    step="0.01"
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
                      value={editFormData.ownerName || ''}
                      onChange={handleEditInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Owner Email</label>
                    <input
                      type="email"
                      name="ownerEmail"
                      value={editFormData.ownerEmail || ''}
                      onChange={handleEditInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Owner Phone</label>
                    <input
                      type="tel"
                      name="ownerPhone"
                      value={editFormData.ownerPhone || ''}
                      onChange={handleEditInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      name="emergencyContact"
                      value={editFormData.emergencyContact || ''}
                      onChange={handleEditInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    name="address"
                    value={editFormData.address || ''}
                    onChange={handleEditInputChange}
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
                      value={editFormData.status || ''}
                      onChange={handleEditInputChange}
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
                    value={editFormData.notes || ''}
                    onChange={handleEditInputChange}
                    rows="3"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* Current Images */}
              {editImagePreviews.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Current Images</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {editImagePreviews.map((preview, index) => (
                      <div key={preview.id || index} className="relative">
                        <img 
                          src={preview.preview || preview} 
                          alt={`Preview ${index + 1}`} 
                          className="w-full h-24 object-cover rounded-lg border border-gray-200" 
                        />
                        <button
                          type="button"
                          onClick={() => removeEditImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Replace Images */}
              <div className="border-t pt-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Replace Images</h4>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleNewImageUpload}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">⚠️ Selecting new images will replace all existing images</p>
              </div>

              {/* Replace Health Record */}
              <div className="border-t pt-4">
                <h4 className="text-md font-medium text-gray-900 mb-3">Replace Health Record</h4>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleNewHealthRecordUpload}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">⚠️ Selecting a new health record will replace the existing one. Only PDF files allowed, maximum 10MB</p>
                {newHealthRecordFile && (
                  <p className="text-sm text-gray-600 mt-1">Selected: {newHealthRecordFile.name}</p>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
                  {uploading ? 'Updating...' : 'Update Animal'}
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
