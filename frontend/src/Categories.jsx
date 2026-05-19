import { useState, useEffect } from 'react';
import axios from 'axios';
import { Pencil, Trash2 } from 'lucide-react'; // Importing our new icons!

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState(null); // Track if we are editing

  const fetchCategories = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/categories');
      setCategories(response.data);
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      if (editingId) {
        // Update existing category
        await axios.put(`http://localhost:5000/api/categories/${editingId}`, { name: newCategoryName });
      } else {
        // Create new category
        await axios.post('http://localhost:5000/api/categories', { name: newCategoryName });
      }
      
      setNewCategoryName(''); 
      setEditingId(null);
      fetchCategories(); 
    } catch (error) {
      alert("Failed to save category");
    }
  };

  const handleEdit = (category) => {
    setEditingId(category.id);
    setNewCategoryName(category.name);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this category?")) {
      try {
        await axios.delete(`http://localhost:5000/api/categories/${id}`);
        fetchCategories();
      } catch (error) {
        // This alerts the user if products are still using this category!
        alert(error.response?.data?.error || "Failed to delete category.");
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewCategoryName('');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Categories & Brands</h1>
        <p className="text-slate-500">Manage appliance classifications</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-fit">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">
            {editingId ? "Edit Category" : "Create Category"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Category Name</label>
              <input 
                type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Televisions"
              />
            </div>
            
            {/* MAKE SURE THIS BUTTON CONTAINER IS HERE */}
            <div className="flex space-x-2 pt-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200">
                {editingId ? "Update" : "Add Category"}
              </button>
              
              {/* Show the Cancel button ONLY if we are editing */}
              {editingId && (
                <button type="button" onClick={cancelEdit} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded-md transition duration-200">
                  Cancel
                </button>
              )}
            </div>
          
                 
          </form>
        </div>

        
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
           <h2 className="text-lg font-semibold text-slate-700 mb-4">Existing Categories</h2>
           <ul className="divide-y divide-slate-200">
             {categories.map((cat) => (
               <li key={cat.id} className="py-3 flex justify-between items-center hover:bg-slate-50 px-2 rounded-md transition-colors group">
                 <span className="font-medium text-slate-700">{cat.name}</span>
                 
                 
                 {/* Professional Icon Buttons - Always Visible & Fixed Size */}
                 <div className="flex space-x-2">
                   <button onClick={() => handleEdit(cat)} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors" title="Edit">
                     <Pencil className="w-4 h-4" />
                   </button>
                   <button onClick={() => handleDelete(cat.id)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors" title="Delete">
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </div>

               </li>
             ))}
           </ul>
        </div>

      </div>
    </div>
  );
}