import React from 'react';
import { Card } from '../components/ui/card';
import MahasiswaList from '../components/MahasiswaList';

const MahasiswaListPage: React.FC = () => {
  return (
    <Card className="max-w-6xl mx-auto mt-8 p-6 shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">Daftar Mahasiswa</h1>
      <MahasiswaList />
    </Card>
  );
};

export default MahasiswaListPage;
