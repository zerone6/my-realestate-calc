import { useState, useEffect } from 'react';
import LoginModal from './LoginModal';
import SignUpModal from './SignUpModal';
import { signUp } from '../../../shared/api/realEstateApi';
import { getStoredUserId, persistUserId, clearStoredUserId } from '../../../shared/utils/authState';

const AuthButtons = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);

  useEffect(() => {
    const existing = getStoredUserId();
    if (existing) {
      setIsLoggedIn(true);
      setUserId(existing);
      // Notify rest of app (e.g., CalculatorApp) about restored session
      window.dispatchEvent(new CustomEvent('authChange', { detail: { loggedIn: true, userId: existing } }));
    }
  }, []);

  const handleLogin = async (id: string, password: string) => {
    if (id === 'test' && password === 'test') {
      setIsLoggedIn(true);
      setUserId(id);
      setIsModalOpen(false);
      persistUserId(id);
      // Broadcast login event
      window.dispatchEvent(new CustomEvent('authChange', { detail: { loggedIn: true, userId: id } }));
    } else {
      alert('Invalid credentials');
    }
  };

  const handleLogout = () => {
    clearStoredUserId();
    setIsLoggedIn(false);
    setUserId(null);
    // Broadcast logout event
    window.dispatchEvent(new CustomEvent('authChange', { detail: { loggedIn: false, userId: null } }));
  };

  const handleSignUp = async (id: string, password: string) => {
    await signUp(id, password);
  };

  return (
    <div className="flex items-center gap-2 h-10">
      {isLoggedIn ? (
        <>
          <span className="text-sm text-gray-700 leading-none">Welcome, {userId}</span>
          <button
            onClick={handleLogout}
            className="inline-flex items-center h-10 px-4 py-0 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Sign Out
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center h-10 px-4 py-0 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign In
          </button>
          <button
            onClick={() => setIsSignUpOpen(true)}
            className="inline-flex items-center h-10 px-4 py-0 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Sign Up
          </button>
        </>
      )}
      <LoginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLogin={handleLogin}
      />
      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
        onSubmit={handleSignUp}
        onSuccess={(newId) => {
          // Optionally prefill login modal
          setIsModalOpen(true);
        }}
      />
    </div>
  );
};

export default AuthButtons;
