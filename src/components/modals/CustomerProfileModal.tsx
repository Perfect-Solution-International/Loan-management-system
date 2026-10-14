// src/components/modals/CustomerProfileModal.tsx
'use client';

import React from 'react';
import { Customer } from '@/types';

interface CustomerProfileModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onConfirm: (customer: Customer) => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  isOpen,
  customer,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-xl font-bold text-gray-800">Customer Profile Verification</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-700 font-bold text-lg p-1 rounded-full hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center text-center space-y-2 border-r pr-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={customer.photoUrl || 'https://via.placeholder.com/150'} 
              alt={customer.fullName || customer.name || 'Customer photo'} 
              className="w-28 h-28 rounded-full object-cover border-4 border-blue-500 shadow-md" 
            />
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
              {customer.status}
            </span>
            <p className="text-xs text-gray-500 font-mono">ID: {customer.id}</p>
          </div>

          <div className="md:col-span-2 space-y-3 text-sm text-gray-700">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Full Name</p>
              <p className="font-bold text-base text-gray-900">{customer.fullName}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">NIC Number</p>
                <p className="font-medium">{customer.nic}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold">Contact</p>
                <p className="font-medium">{customer.primaryContact}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Address</p>
              <p className="font-medium">{customer.address}, {customer.village}, {customer.town}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 border-t pt-4">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition">
            Cancel & Re-select
          </button>
          <button 
            onClick={() => onConfirm(customer)}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-md transition">
            Confirm & Proceed to Deductions
          </button>
        </div>
      </div>
    </div>
  );
};