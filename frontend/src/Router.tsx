import { Route, Routes, Navigate } from 'react-router-dom';
import DosenListPage from './pages/DosenListPage';
import MahasiswaListPage from './pages/MahasiswaListPage';
import PembimbingAssignPage from './pages/PembimbingAssignPage';
import SidangAssignPage from './pages/SidangAssignPage';
import SidangListPage from './pages/SidangListPage';
import SidangGroupPage from './pages/SidangGroupPage';
import SidangGroupDetailPage from './pages/SidangGroupDetailPage';
import GenerateJadwalSidangPage from './pages/GenerateJadwalSidangPage';
import RuleListPage from './pages/RuleListPage';
import WhatsAppStatusPage from './pages/WhatsAppStatusPage';
import WhatsAppSetupPage from './pages/WhatsAppSetupPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import App from './App';

const Router = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/" element={
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    }>
      <Route index element={<Navigate to="/dosen" replace />} />
      <Route path="dosen" element={<DosenListPage />} />
      <Route path="mahasiswa" element={<MahasiswaListPage />} />
      <Route path="pembimbing" element={<PembimbingAssignPage />} />
      <Route path="sidang" element={<SidangAssignPage />} />
      <Route path="daftar-sidang" element={<SidangListPage />} />
      <Route path="sidang-group" element={<SidangGroupPage />} />
      <Route path="sidang-group/:id/detail" element={<SidangGroupDetailPage />} />
      <Route path="generate-jadwal-sidang" element={<GenerateJadwalSidangPage />} />
      <Route path="rule" element={<RuleListPage />} />
      <Route path="whatsapp-status" element={<WhatsAppStatusPage />} />
      <Route path="whatsapp-setup" element={<WhatsAppSetupPage />} />
    </Route>
  </Routes>
);

export default Router;
