import React, { useState } from 'react';
import AssignSidangForm from '../components/AssignSidangForm';
import SidangListTable from '../components/SidangListTable';

const SidangAssignPage: React.FC = () => {
  const [refresh, setRefresh] = useState(0);
  return (
    <div className="space-y-8">
      <AssignSidangForm onSuccess={() => setRefresh(r => r + 1)} key={refresh} />
      <SidangListTable key={refresh} />
    </div>
  );
};

export default SidangAssignPage;
