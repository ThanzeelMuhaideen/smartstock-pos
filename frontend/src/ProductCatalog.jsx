import { useState, useEffect } from 'react';
import axios from 'axios';
import { Pencil, Trash2, Package, Tag, Hash, Layers, Plus, X } from 'lucide-react';

// NEW: We accept the { user } prop here so we know if it's a CASHIER or ADMIN
export default function ProductCatalog({ user }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); 
  const [editingId, setEditingId] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    modelNumber: '',
    brand: '',
    modelName: '',
    price: '',
    costPrice: '',
    stock: '',
    categoryId: ''
  });

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        axios.get('https://smartstock-pos.vercel.app//api/products'),
        axios.get('https://smartstock-pos.vercel.app//api/categories')
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ modelNumber: '', brand: '', modelName: '', price: '', costPrice: '', stock: '', categoryId: '' });
    setIsModalOpen(false); 
  };

  const handleAddNew = () => {
    resetForm();
    setIsModalOpen(true); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.categoryId) {
      alert("Please select a category!");
      return;
    }

    try {
      if (editingId) {
        await axios.put(`https://smartstock-pos.vercel.app//api/products/${editingId}`, formData);
      } else {
        await axios.post('https://smartstock-pos.vercel.app//api/products', formData);
      }
      fetchData();
      resetForm(); 
    } catch (error) {
      alert(error.response?.data?.error || "Failed to save product.");
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setFormData({
      modelNumber: product.modelNumber,
      brand: product.brand,
      modelName: product.modelName,
      price: product.price,
      costPrice: product.costPrice || '', 
      stock: product.stock,
      categoryId: product.categoryId || ''
    });
    setIsModalOpen(true); 
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await axios.delete(`https://smartstock-pos.vercel.app//api/products/${id}`);
        fetchData();
      } catch (error) {
        alert("Failed to delete product.");
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* HEADER & ADD BUTTON */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Product Catalog</h1>
          <p className="text-slate-500">Manage your showroom inventory and pricing</p>
        </div>
        
        {/* SECURED: Only Admins can see the Add Product button */}
        {user?.role === 'ADMIN' && (
          <button 
            onClick={handleAddNew} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm"
          >
            <Plus size={20} /> Add New Product
          </button>
        )}
      </div>

      {/* FULL WIDTH PRODUCTS TABLE */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                
                {/* SECURED: Only Admins can see the Cost column header */}
                {user?.role === 'ADMIN' && (
                  <th className="px-6 py-4 text-red-600">Cost</th>
                )}
                
                <th className="px-6 py-4 text-blue-600">Price</th>
                <th className="px-6 py-4">Stock</th>
                
                {/* SECURED: Only Admins can see the Actions column header */}
                {user?.role === 'ADMIN' && (
                  <th className="px-6 py-4 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-500 text-lg">No products found. Click "Add New Product" to get started!</td></tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-blue-600 font-bold">{product.modelNumber}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-base">{product.brand}</div>
                      <div className="text-xs text-slate-500">{product.modelName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md text-xs font-bold border border-slate-200 tracking-wide uppercase">
                        {product.category?.name || "Uncategorized"}
                      </span>
                    </td>

                    {/* SECURED: Only Admins can see the Cost data */}
                    {user?.role === 'ADMIN' && (
                      <td className="px-6 py-4 font-bold text-red-500 text-base">
                        Rs. {parseFloat(product.costPrice || 0).toFixed(2)}
                      </td>
                    )}

                    <td className="px-6 py-4 font-extrabold text-slate-700 text-base">
                      Rs. {parseFloat(product.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-md text-xs font-bold ${product.stock > 5 ? 'bg-green-100 text-green-700' : product.stock > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                        {product.stock} Left
                      </span>
                    </td>

                    {/* SECURED: Only Admins can see the Edit/Delete buttons */}
                    {user?.role === 'ADMIN' && (
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => handleEdit(product)} className="p-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(product.id)} className="p-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================= */}
      {/* POPUP MODAL FOR ADD/EDIT FORM (Admin Only technically sees this) */}
      {/* ========================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-slate-800">
                {editingId ? "Edit Product Details" : "Register New Product"}
              </h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-red-500 transition-colors bg-white hover:bg-red-50 p-1.5 rounded-full border border-transparent hover:border-red-100">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Model Number (SKU)</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                      <input type="text" name="modelNumber" value={formData.modelNumber} onChange={handleInputChange} required className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm" placeholder="e.g. RT38" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Brand</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                      <input type="text" name="brand" value={formData.brand} onChange={handleInputChange} required className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" placeholder="e.g. Samsung" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Model Name / Description</label>
                  <textarea name="modelName" value={formData.modelName} onChange={handleInputChange} required className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[80px] text-sm" placeholder="e.g. 2 Door Inverter 380L" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Category</label>
                    <div className="relative">
                      <Layers className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                      <select name="categoryId" value={formData.categoryId} onChange={handleInputChange} required className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-sm">
                        <option value="" disabled>Select...</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-red-600 mb-1">Wholesale Cost (Rs.)</label>
                    <input type="number" name="costPrice" value={formData.costPrice} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-red-200 bg-red-50 rounded-lg focus:ring-2 focus:ring-red-500 font-bold text-red-700 text-sm" placeholder="0.00" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-blue-600 mb-1">Selling Price (Rs.)</label>
                    <input type="number" name="price" value={formData.price} onChange={handleInputChange} required className="w-full px-4 py-2.5 border border-blue-200 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-blue-700 text-sm" placeholder="0.00" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Initial Stock Qty</label>
                  <div className="relative">
                    <Package className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                    <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} required className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" placeholder="0" />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4 mt-6 border-t border-slate-100">
                  <button type="button" onClick={resetForm} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition duration-200">
                    Cancel
                  </button>
                  <button type="submit" className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition duration-200 shadow-sm flex justify-center items-center gap-2">
                    {editingId ? "Save Changes" : "Create Product"}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
