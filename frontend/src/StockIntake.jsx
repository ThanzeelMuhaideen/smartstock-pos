import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { PackagePlus, Truck, MapPin, Calendar, CheckCircle2, ChevronDown, Pencil, Trash2, X } from 'lucide-react';

export default function StockIntake() {
  const [products, setProducts] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(false);

  // NEW: State to track if we are editing an existing record
  const [editingIntakeId, setEditingIntakeId] = useState(null);

  const [productSearch, setProductSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    destination: 'Store 1 - Main Showroom',
    supplier: '',
    receivedAt: new Date().toISOString().split('T')[0] 
  });

  useEffect(() => {
    fetchData();
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, intakesRes] = await Promise.all([
        axios.get('https://smartstock-pos.vercel.app//api/products'),
        axios.get('https://smartstock-pos.vercel.app//api/intake')
      ]);
      setProducts(productsRes.data);
      setIntakes(intakesRes.data);
    } catch (error) {
      console.error("Failed to load intake data", error);
    }
  };

  const filteredProducts = products.filter(p => 
    `${p.brand} ${p.modelName} ${p.modelNumber}`.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleSelectProduct = (product) => {
    setFormData({ ...formData, productId: product.id });
    setProductSearch(`${product.brand} ${product.modelName} (SKU: ${product.modelNumber})`);
    setShowDropdown(false);
  };

  // ==========================================
  // ACTION HANDLERS
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingIntakeId) {
        await axios.put(`https://smartstock-pos.vercel.app//api/intake/${editingIntakeId}`, formData);
        alert('Record updated and inventory adjusted!');
      } else {
        await axios.post('https://smartstock-pos.vercel.app//api/intake', formData);
        alert('Stock successfully received and added to inventory!');
      }
      
      resetForm();
      fetchData(); 
    } catch (error) {
      alert("Failed to process intake.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record) => {
    if (window.confirm(`Are you sure you want to delete this record? This will subtract ${record.quantity} units from your global inventory.`)) {
      try {
        await axios.delete(`https://smartstock-pos.vercel.app//api/intake/${record.id}`);
        fetchData();
      } catch (error) {
        alert("Failed to delete record.");
      }
    }
  };

  const handleEditClick = (record) => {
    setEditingIntakeId(record.id);
    setProductSearch(`${record.product.brand} ${record.product.modelName} (SKU: ${record.product.modelNumber})`);
    setFormData({
      productId: record.productId,
      quantity: record.quantity,
      destination: record.destination,
      supplier: record.supplier || '',
      receivedAt: new Date(record.receivedAt).toISOString().split('T')[0]
    });
  };

  const resetForm = () => {
    setEditingIntakeId(null);
    setProductSearch('');
    setFormData({ 
      productId: '', quantity: '', destination: 'Store 1 - Main Showroom', 
      supplier: '', receivedAt: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-6 min-h-full lg:h-[calc(100vh-5rem)] pb-4 lg:pb-0">
      
      {/* LEFT SIDE: INTAKE FORM */}
      <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit shrink-0">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {editingIntakeId ? <Pencil className="text-orange-500" /> : <Truck className="text-blue-600" />} 
            {editingIntakeId ? "Edit Delivery Record" : "Process Incoming Delivery"}
          </h2>
          {editingIntakeId && (
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-md flex items-center gap-1 text-sm font-bold">
              <X size={16} /> Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-bold text-slate-700 mb-1">Select Product</label>
            <div className="relative">
              <input
                type="text"
                required
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setFormData({ ...formData, productId: '' });
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search by Brand, Model, or SKU..."
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium outline-none transition-all"
              />
              <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={20} />
            </div>

            {showDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="p-4 text-slate-500 text-sm">No products found.</div>
                ) : (
                  filteredProducts.map(p => (
                    <div key={p.id} onClick={() => handleSelectProduct(p)} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors">
                      <div className="font-bold text-slate-800">{p.brand} {p.modelName}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">SKU: {p.modelNumber}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Quantity</label>
              <input type="number" min="1" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-lg outline-none" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Supplier Name</label>
              <input type="text" required value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. LG Electronics" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Date Received</label>
              <input type="date" required value={formData.receivedAt} onChange={e => setFormData({...formData, receivedAt: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700" />
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-sm font-bold text-slate-700 mb-2 border-t border-slate-100 pt-4">Destination Store</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setFormData({...formData, destination: 'Store 1 - Main Showroom'})} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${formData.destination === 'Store 1 - Main Showroom' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                <MapPin size={24} className="mb-1" />
                <span className="font-bold text-sm">Store 1</span>
                <span className="text-xs opacity-70">Main Showroom</span>
              </button>
              <button type="button" onClick={() => setFormData({...formData, destination: 'Store 2 - Branch'})} className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${formData.destination === 'Store 2 - Branch' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                <MapPin size={24} className="mb-1" />
                <span className="font-bold text-sm">Store 2</span>
                <span className="text-xs opacity-70">Branch Location</span>
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading || !formData.productId} className={`w-full text-white font-bold py-4 rounded-xl shadow-lg mt-4 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 ${editingIntakeId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
            {loading ? "Processing..." : editingIntakeId ? <><Pencil size={20} /> Update Record</> : <><PackagePlus size={20} /> Receive & Update Database</>}
          </button>
        </form>
      </div>

      {/* RIGHT SIDE: AUDIT LOG */}
      <div className="w-full lg:w-[450px] bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0 h-full">
        <div className="p-6 border-b border-slate-200 bg-slate-50 text-slate-800 flex justify-between items-center shrink-0">
          <h2 className="font-bold flex items-center gap-2"><CheckCircle2 className="text-green-600" /> Intake Audit Log</h2>
          <span className="bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">{intakes.length} Records</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {intakes.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 font-medium">No recent deliveries found.</div>
          ) : (
            intakes.map(record => (
              <div key={record.id} className={`p-4 border rounded-lg transition-colors relative group ${editingIntakeId === record.id ? 'bg-orange-50 border-orange-300' : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}>
                
                {/* ACTION BUTTONS (Appear on Hover) */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-md shadow-sm border border-slate-200">
                  <button onClick={() => handleEditClick(record)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Edit Record"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(record)} className="p-1.5 text-red-600 hover:bg-red-100 rounded" title="Delete Record"><Trash2 size={14} /></button>
                </div>

                <div className="flex justify-between items-start mb-2 pr-16">
                  <div>
                    <h3 className="font-bold text-slate-800">{record.product?.brand} {record.product?.modelName}</h3>
                    <p className="text-xs font-mono text-slate-500">SKU: {record.product?.modelNumber}</p>
                  </div>
                  <div className="bg-green-100 text-green-800 font-extrabold px-2.5 py-1 rounded-md text-sm shrink-0 h-fit">
                    +{record.quantity}
                  </div>
                </div>
                
                <div className="pt-2 border-t border-slate-200 mt-2 space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider">Destination</span>
                    <span className={`font-bold ${record.destination.includes('Store 1') ? 'text-blue-600' : 'text-purple-600'}`}>{record.destination}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider">Supplier</span>
                    <span className="font-medium">{record.supplier}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="font-semibold text-slate-400 uppercase tracking-wider">Date Received</span>
                    <span className="font-medium flex items-center gap-1"><Calendar size={12}/> {new Date(record.receivedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
