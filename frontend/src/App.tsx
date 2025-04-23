import { Outlet, Link, useLocation } from 'react-router-dom';

const MENU = [
  { path: '/dosen', label: 'Daftar Dosen' },
  { path: '/mahasiswa', label: 'Daftar Mahasiswa' },
  { path: '/pembimbing', label: 'Penugasan Pembimbing' },
  { path: '/sidang', label: 'Penjadwalan Sidang' },
  { path: '/daftar-sidang', label: 'Daftar Sidang' },
];

function App() {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex gap-4 p-4 bg-white shadow">
        {MENU.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`px-4 py-2 rounded ${location.pathname === item.path ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
