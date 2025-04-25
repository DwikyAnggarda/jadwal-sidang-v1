import React from 'react';
import { Card } from '../components/ui/card';
import DosenList from '../components/DosenList';

const DosenListPage: React.FC = () => {
  return (
    <Card className="max-w-6xl mx-auto mt-8 p-6 shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">Daftar Dosen</h1>
      <DosenList />
    </Card>
  );
};

export default DosenListPage;
