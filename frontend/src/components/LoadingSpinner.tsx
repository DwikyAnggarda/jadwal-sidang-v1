import { Loader2 } from 'lucide-react';

export const LoadingSpinner = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Loading...</p>
            </div>
        </div>
    );
};
