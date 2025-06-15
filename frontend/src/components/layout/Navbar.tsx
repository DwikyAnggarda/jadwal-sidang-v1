import React from 'react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';

const navLinks = [
  { to: '/rule', label: 'Rule' },
  { to: '/mahasiswa', label: 'Mahasiswa' },
  { to: '/dosen', label: 'Dosen' },
  { to: '/sidang-group', label: 'Daftar Sidang' },
  { to: '/whatsapp-setup', label: 'WhatsApp Setup' },
  // { to: '/sidang', label: 'Assign Sidang' },
  // { to: '/daftar-sidang', label: 'Daftar Jadwal Sidang' },
  // { to: '/pembimbing', label: 'Pembimbing' },
];

const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-30 bg-white dark:bg-neutral-900 border-b shadow-sm h-16 flex items-center px-4">
      <div className="font-bold text-xl tracking-tight mr-8">
        <Link to="/sidang">Jadwal Sidang</Link>
      </div>
      <Separator orientation="vertical" className="h-8 mx-2" />
      <div className="flex gap-2">
        {navLinks.map(link => (
          <Button
            key={link.to}
            asChild
            variant={location.pathname.startsWith(link.to) ? 'default' : 'outline'}
            className="rounded px-4"
          >
            <Link to={link.to}>{link.label}</Link>
          </Button>
        ))}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Welcome, <strong>{user.username}</strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Logout
            </Button>
          </div>
        )}
        <ThemeToggle />
      </div>
    </nav>
  );
};

export default Navbar;
