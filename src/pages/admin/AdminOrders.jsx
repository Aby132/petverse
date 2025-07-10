import React from 'react';
import AdminLayout from '../../components/AdminLayout';

const AdminOrders = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Management</h2>
          <p className="text-gray-600 mb-6">Track and manage customer orders and fulfillment</p>
          <button className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
            Coming Soon
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
