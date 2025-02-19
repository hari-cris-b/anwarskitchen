import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const FloatingActionButton = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Only show the button for staff types that have access to POS
  const hasAccess = profile?.staff_type && ['admin', 'manager', 'staff'].includes(profile.staff_type);

  if (!hasAccess) return null;

  return (
    <div 
      className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50"
      style={{ 
        filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.1))'
      }}
    >
      <button
        onClick={() => navigate('/pos')}
        className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-16 h-16 flex items-center justify-center transition-transform hover:scale-110"
        title="New Order"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={2} 
          stroke="currentColor" 
          className="w-8 h-8"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    </div>
  );
};

export default FloatingActionButton;