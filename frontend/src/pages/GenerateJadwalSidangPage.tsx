import React from 'react';
import { Card } from '../components/ui/card';
import GenerateJadwalSidangForm from '../components/GenerateJadwalSidangForm';

const GenerateJadwalSidangPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto p-6 shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Generate Jadwal Sidang</h1>
        <GenerateJadwalSidangForm />
      </Card>
    </div>
  );
};

export default GenerateJadwalSidangPage;
