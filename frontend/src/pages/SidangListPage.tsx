import React from 'react';
import { Card } from '../components/ui/card';
import SidangListTable from '../components/SidangListTable';

const SidangListPage: React.FC = () => {
  return (
    <Card className="max-w-6xl mx-auto mt-8 p-6 shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">Daftar Sidang</h1>
      <SidangListTable />
    </Card>
  );
};

export default SidangListPage;
