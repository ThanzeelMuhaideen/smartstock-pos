import { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Shield, User, Key, Trash2, Pencil, X } from 'lucide-react';

export default function Settings() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // New state to track if we are editing an existing user
  const [editingUserId, setEditingUserId] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', username: '', password: '', role: 'CASHIER' });

  const fetchStaff = async () => {
    try {
      const response = await axios.get(import.meta.env.VITE_API_URL + '//api/users');
      setStaff(response.data);
    } catch (error) {
      console.error("Failed to load staff", error);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Form Submission handles BOTH Create and Update now!
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingUserId) {
        // UPDATE EXISTING USER
        await axios.put(`https://smartstock-pos.vercel.app//api/users/${editingUserId}`, formData);
        alert(`Account updated successfully!`);
      } else {
        // CREATE NEW USER
        await axios.post(import.meta.env.VITE_API_URL + '//api/users', formData);
        alert(`Account created successfully for ${formData.name}!`);
      }
      
      resetForm();
      fetchStaff(); 
    } catch (error) {
      alert(error.response?.data?.error || "Failed to save account.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}'s account? They will lose all access.`)) {
      try {
        await axios.delete(`https://smartstock-pos.vercel.app//api/users/${id}`);
        fetchStaff();
      } catch (error) {
        alert(error.response?.data?.error || "Failed to delete account.");
      }
    }
  };

  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      username: user.username,
      role: user.role,
      password: '' // Leave blank so Manager only types here if they want to reset it
    });
  };

  const resetForm = () => {
    setEditingUserId(null);
    setFormData({ name: '', username: '', password: '', role: 'CASHIER' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings & Staff</h1>
        <p className="text-slate-500">Manage system access and employee accounts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: DYNAMIC FORM (CREATE OR UPDATE) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {editingUserId ? <Pencil size={20} className="text-orange-500" /> : <UserPlus size={20} className="text-blue-600" />} 
              {editingUserId ? "Edit Account" : "Create Account"}
            </h2>
            {editingUserId && (
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-700 bg-slate-100 p-1 rounded-md">
                <X size={16} />
              </button>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. John Doe" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Account Role</label>
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-bold">
                <option value="CASHIER">Cashier (Limited Access)</option>
                <option value="ADMIN">Manager (Full Access)</option>
              </select>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-sm font-bold text-slate-700 mb-1">Login Username</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  required 
                  disabled={editingUserId !== null} // Prevent changing username during edit
                  value={formData.username} 
                  onChange={e => setFormData({...formData, username: e.target.value.toLowerCase()})} 
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400" 
                  placeholder="e.g. john.d" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                {editingUserId ? "Reset Password (Optional)" : "Temporary Password"}
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  required={!editingUserId} // Only required when creating a new user
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                  placeholder={editingUserId ? "Leave blank to keep current" : "Set a password"} 
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className={`w-full text-white font-bold py-3 rounded-lg mt-2 transition-colors disabled:opacity-50 ${editingUserId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {loading ? "Saving..." : (editingUserId ? "Update Account" : "Create Account")}
            </button>
          </form>
        </div>

        {/* RIGHT: STAFF DIRECTORY */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm lg:col-span-2 overflow-hidden h-fit">
          <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Shield size={20} className="text-slate-600" /> Staff Directory
            </h2>
            <span className="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-full">{staff.length} Active Accounts</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold">Name</th>
                  <th className="px-6 py-4 font-bold">Username</th>
                  <th className="px-6 py-4 font-bold">Role</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{user.name}</td>
                    <td className="px-6 py-4 font-mono text-blue-600">{user.username}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-extrabold tracking-wider ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleEditClick(user)} 
                        className="p-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors" 
                        title="Edit Account"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id, user.name)} 
                        className="p-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors" 
                        title="Delete Account"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
