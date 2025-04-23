import { Route, Routes, Navigate } from 'react-router-dom';
import DosenListPage from './pages/DosenListPage';
import MahasiswaListPage from './pages/MahasiswaListPage';
import PembimbingAssignPage from './pages/PembimbingAssignPage';
import SidangAssignPage from './pages/SidangAssignPage';
import SidangListPage from './pages/SidangListPage';
import App from './App';

const Router = () => (
  <Routes>
    <Route path="/" element={<App />}>
      <Route index element={<Navigate to="/dosen" replace />} />
      <Route path="dosen" element={<DosenListPage />} />
      <Route path="mahasiswa" element={<MahasiswaListPage />} />
      <Route path="pembimbing" element={<PembimbingAssignPage />} />
      <Route path="sidang" element={<SidangAssignPage />} />
      <Route path="daftar-sidang" element={<SidangListPage />} />
    </Route>
  </Routes>
);

export default Router;
