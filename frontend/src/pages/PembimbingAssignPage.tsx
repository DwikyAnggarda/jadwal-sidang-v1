import React, { useState } from 'react';
import AddDosenForm from '../components/AddDosenForm';
import AddMahasiswaForm from '../components/AddMahasiswaForm';
import AssignPembimbingForm from '../components/AssignPembimbingForm';

const PembimbingAssignPage: React.FC = () => {
  const [refresh, setRefresh] = useState(0);
  return (
    <div className="space-y-8">
      <AddDosenForm onSuccess={() => setRefresh(r => r + 1)} />
      <AddMahasiswaForm onSuccess={() => setRefresh(r => r + 1)} />
      <AssignPembimbingForm onSuccess={() => setRefresh(r => r + 1)} key={refresh} />
    </div>
  );
};

export default PembimbingAssignPage;
