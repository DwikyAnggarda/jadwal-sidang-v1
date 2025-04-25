import React from 'react';
import { Card } from '../components/ui/card';
import AssignPembimbingForm from '../components/AssignPembimbingForm';

const PembimbingAssignPage: React.FC = () => {
  return (
    <Card className="max-w-2xl mx-auto mt-8 p-6 shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">Penugasan Pembimbing</h1>
      <AssignPembimbingForm onSuccess={() => {}} />
    </Card>
  );
};

export default PembimbingAssignPage;
