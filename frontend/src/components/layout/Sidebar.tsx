import React, { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';

const navLinks = [
	{ to: '/mahasiswa', label: 'Mahasiswa' },
	{ to: '/dosen', label: 'Dosen' },
	{ to: '/daftar-sidang', label: 'Daftar Jadwal Sidang' }, // new menu item
	{ to: '/sidang', label: 'Assign Sidang' },
	{ to: '/pembimbing', label: 'Assign Pembimbing' },
];

const Sidebar: React.FC = () => {
	const location = useLocation();
	const [open, setOpen] = useState(false);
	return (
		<>
			{/* Mobile: Sheet/Drawer */}
			<div className="lg:hidden">
				<Sheet open={open} onOpenChange={setOpen}>
					<SheetTrigger asChild>
						<Button
							variant="outline"
							size="icon"
							className="fixed top-4 left-4 z-40"
						>
							<Menu className="w-6 h-6" />
						</Button>
					</SheetTrigger>
					<SheetContent side="left" className="pt-8 w-56">
						<div className="font-bold text-lg mb-4">Menu</div>
						<Separator className="mb-2" />
						<div className="flex flex-col gap-2">
							{navLinks.map(link => (
								<Button
									key={link.to}
									asChild
									variant={location.pathname.startsWith(link.to) ? 'default' : 'ghost'}
									className="justify-start w-full"
									onClick={() => setOpen(false)}
								>
									<Link to={link.to}>{link.label}</Link>
								</Button>
							))}
						</div>
					</SheetContent>
				</Sheet>
			</div>
			{/* Desktop: Fixed Sidebar */}
			<aside className="hidden lg:flex flex-col fixed top-16 left-0 w-56 h-[calc(100vh-4rem)] bg-white border-r shadow-sm z-20 p-4">
				<div className="font-bold text-lg mb-4">Menu</div>
				<Separator className="mb-2" />
				<div className="flex flex-col gap-2">
					{navLinks.map(link => (
						<Button
							key={link.to}
							asChild
							variant={location.pathname.startsWith(link.to) ? 'default' : 'ghost'}
							className="justify-start w-full"
						>
							<Link to={link.to}>{link.label}</Link>
						</Button>
					))}
				</div>
			</aside>
		</>
	);
};

export default Sidebar;
