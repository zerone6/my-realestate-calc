import { useState } from 'react';

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (id: string) => void;
  onSubmit: (id: string, password: string) => Promise<void>;
}

const SignUpModal = ({ isOpen, onClose, onSuccess, onSubmit }: SignUpModalProps) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !password) return;
    setLoading(true);
    try {
      await onSubmit(id, password);
      onSuccess?.(id);
      onClose();
      alert('Sign up completed. Please sign in.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-4">Sign Up</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="signup-id" className="block text-gray-700">ID</label>
            <input
              id="signup-id"
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              autoComplete="username"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="signup-password" className="block text-gray-700">Password</label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              autoComplete="new-password"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              disabled={loading}
            >
              {loading ? 'Signing Up...' : 'Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUpModal;
