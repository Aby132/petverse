import React, { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';

const AdminAnimals = () => {
  const [animals] = useState([
    { id: 1, name: 'Buddy', type: 'Dog', breed: 'Golden Retriever', age: '2 years', owner: 'John Doe', status: 'Healthy' },
    { id: 2, name: 'Whiskers', type: 'Cat', breed: 'Persian', age: '3 years', owner: 'Jane Smith', status: 'Checkup Due' },
    { id: 3, name: 'Charlie', type: 'Bird', breed: 'Parakeet', age: '1 year', owner: 'Mike Johnson', status: 'Healthy' },
    { id: 4, name: 'Nemo', type: 'Fish', breed: 'Goldfish', age: '6 months', owner: 'Sarah Wilson', status: 'Treatment' },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Animals Management</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage pet profiles and health records</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center sm:justify-start"
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
                <p className="text-2xl font-bold text-gray-900">156</p>
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
                <p className="text-2xl font-bold text-gray-900">89</p>
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
                <p className="text-2xl font-bold text-gray-900">34</p>
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
                <p className="text-2xl font-bold text-gray-900">12</p>
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
                {animals.map((animal) => (
                  <tr key={animal.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                          <span className="text-lg">
                            {animal.type === 'Dog' ? '🐕' : 
                             animal.type === 'Cat' ? '🐱' : 
                             animal.type === 'Bird' ? '🐦' : 
                             animal.type === 'Fish' ? '🐠' : '🐾'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{animal.name}</p>
                          <p className="text-sm text-gray-500">ID: {animal.id}</p>
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
                    <td className="py-4 px-6 text-sm text-gray-900">{animal.owner}</td>
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
                      </div>
                    </td>
                  </tr>
                ))}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Animal</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Animal Name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option>Select Type</option>
                <option>Dog</option>
                <option>Cat</option>
                <option>Bird</option>
                <option>Fish</option>
                <option>Other</option>
              </select>
              <input
                type="text"
                placeholder="Breed"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="text"
                placeholder="Age"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="text"
                placeholder="Owner Name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Add Animal
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAnimals;
