import React from 'react';
import WhatsAppStatusComponent from '../components/WhatsAppStatus';

const WhatsAppStatusPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">WhatsApp Service Management</h1>
      <WhatsAppStatusComponent />
    </div>
  );
};

export default WhatsAppStatusPage;
