import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';

export const LogoutButton = () => {
    const { logout, user } = useAuth();

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
                Welcome, {user?.username}
            </span>
            <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2"
            >
                <LogOut className="w-4 h-4" />
                Logout
            </Button>
        </div>
    );
};
