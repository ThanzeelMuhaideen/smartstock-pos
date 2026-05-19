import { useState } from 'react';
import axios from 'axios';
import { Lock, User, ShieldCheck, Store } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  // NEW: The Toggle State!
  const [loginMode, setLoginMode] = useState('CASHIER'); 
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', { username, password });
      
      // Safety Check: If they use the Manager toggle but aren't an admin, reject them!
      if (loginMode === 'ADMIN' && response.data.user.role !== 'ADMIN') {
        setError("Access Denied: You do not have Manager privileges.");
        setLoading(false);
        return;
      }

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onLoginSuccess(response.data.user);
      
    } catch (err) {
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black text-blue-600 tracking-tight">SmartStock<span className="text-slate-800">.</span></h1>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        
        {/* NEW: THE TOGGLE SWITCH */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
          <button 
            onClick={() => setLoginMode('CASHIER')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all ${loginMode === 'CASHIER' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Store size={16} /> Cashier
          </button>
          <button 
            onClick={() => setLoginMode('ADMIN')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all ${loginMode === 'ADMIN' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ShieldCheck size={16} /> Manager
          </button>
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
          {loginMode === 'CASHIER' ? 'Terminal Access' : 'Management Portal'}
        </h2>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold text-center mb-6 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter username" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" disabled={loading} className={`w-full font-bold py-3 rounded-xl transition-colors shadow-md mt-4 disabled:opacity-70 ${loginMode === 'ADMIN' ? 'bg-slate-800 hover:bg-slate-900 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
            {loading ? "Verifying..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}