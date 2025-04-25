import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <Sidebar />
      <main className="pt-20 lg:pl-56 px-4 pb-8 transition-all">
        {children}
      </main>
    </div>
  );
};

export default Layout;
