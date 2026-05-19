import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileDown, DollarSign, Receipt, TrendingUp, Package, Search, ChevronDown, Calendar, AlertTriangle, X, List } from 'lucide-react';

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('sales');
  const [isModalOpen, setIsModalOpen] = useState(false); 

  // --- FILTER STATES ---
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', productId: '', store: 'ALL' });
  
  // Search Box States
  const [productSearch, setProductSearch] = useState('');
  const [displayProduct, setDisplayProduct] = useState('All Products');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchDashboardData();
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [ordersRes, productsRes, intakesRes] = await Promise.all([
        axios.get('http://localhost:5000/api/orders'),
        axios.get('http://localhost:5000/api/products'),
        axios.get('http://localhost:5000/api/intake')
      ]);
      setOrders(ordersRes.data);
      setProducts(productsRes.data);
      setIntakes(intakesRes.data);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FILTER LOGIC
  // ==========================================
  const filteredProducts = products.filter(p => 
    `${p.brand} ${p.modelName} ${p.modelNumber}`.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleSelectProduct = (product) => {
    if (product === 'ALL') {
      setFilters({ ...filters, productId: '' });
      setDisplayProduct('All Products');
    } else {
      setFilters({ ...filters, productId: product.id });
      setDisplayProduct(`${product.brand} ${product.modelName}`);
    }
    setProductSearch('');
    setShowDropdown(false);
  };

  let filteredOrders = orders.filter(o => o.status === 'COMPLETED');
  let filteredIntakes = [...intakes];

  if (filters.dateFrom) {
    filteredOrders = filteredOrders.filter(o => new Date(o.date) >= new Date(filters.dateFrom));
    filteredIntakes = filteredIntakes.filter(i => new Date(i.receivedAt) >= new Date(filters.dateFrom));
  }
  if (filters.dateTo) {
    const endDate = new Date(filters.dateTo);
    endDate.setDate(endDate.getDate() + 1);
    filteredOrders = filteredOrders.filter(o => new Date(o.date) < endDate);
    filteredIntakes = filteredIntakes.filter(i => new Date(i.receivedAt) < endDate);
  }
  if (filters.productId) {
    filteredOrders = filteredOrders.filter(o => o.items.some(i => i.sku === products.find(p => p.id === filters.productId)?.modelNumber));
    filteredIntakes = filteredIntakes.filter(i => i.productId === filters.productId);
  }
  if (filters.store !== 'ALL') {
    filteredIntakes = filteredIntakes.filter(i => i.destination.includes(filters.store));
  }

  // ==========================================
  // KPI & CHART CALCULATIONS
  // ==========================================
  const totalSales = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const inventoryCost = filteredOrders.reduce((sum, order) => {
    return sum + order.items.reduce((itemSum, item) => {
      const productDef = products.find(p => p.modelNumber === item.sku);
      return itemSum + ((productDef?.costPrice || 0) * item.quantity);
    }, 0);
  }, 0);
  
  const netProfit = totalSales - inventoryCost;
  const totalOrders = filteredOrders.length;
  const outOfStockItems = products.filter(p => p.stock === 0);

  const categoryData = {};
  filteredOrders.forEach(order => {
    order.items.forEach(item => {
      let cat = 'Other';
      const name = item.name.toLowerCase();
      if (name.includes('refrigerat') || name.includes('fridge') || name.includes('freezer')) cat = 'Refrigerators';
      else if (name.includes('wash') || name.includes('dry')) cat = 'Washing Machine';
      else if (name.includes('air condition') || name.includes('ac ') || name.includes('btu')) cat = 'Air Conditioners';
      
      categoryData[cat] = (categoryData[cat] || 0) + (item.price * item.quantity);
    });
  });
  const pieData = Object.keys(categoryData).map(key => ({ name: key, value: categoryData[key] }));
  const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];

  // ==========================================
  // PDF GENERATION LOGIC
  // ==========================================
  const drawPDFHeader = (doc, title) => {
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text("SmartStock", 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(title, 14, 28);
    
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);
    
    doc.text(`Filters Applied:`, 14, 46);
    doc.setFontSize(9);
    doc.text(`Store: ${activeTab === 'stock' ? filters.store : 'ALL'} | Product: ${filters.productId === '' ? 'All Items' : displayProduct}`, 14, 52);
    if (filters.dateFrom || filters.dateTo) {
      doc.text(`Date Range: ${filters.dateFrom || 'Beginning'} to ${filters.dateTo || 'Today'}`, 14, 57);
    }
  };

  const generateSalesPDF = () => {
    const doc = new jsPDF();
    drawPDFHeader(doc, "Filtered Sales & Revenue Report");
    doc.setFontSize(10);
    doc.text(`Total Sales: Rs. ${totalSales.toFixed(2)}  |  Net Profit: Rs. ${netProfit.toFixed(2)}  |  Total Orders: ${totalOrders}`, 14, 65);

    const tableRows = filteredOrders.map(order => [
      new Date(order.date).toLocaleDateString(),
      order.id,
      order.customer.name,
      order.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
      `Rs. ${order.total.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 70,
      head: [["Date", "Order ID", "Customer", "Items Sold", "Total Amount"]],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }
    });
    doc.save(`Sales_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const generateStockPDF = () => {
    const doc = new jsPDF();
    drawPDFHeader(doc, "Filtered Stock Intake Report");

    const tableRows = filteredIntakes.map(record => [
      new Date(record.receivedAt).toLocaleDateString(),
      record.destination,
      `${record.product?.brand} ${record.product?.modelName}`,
      record.product?.modelNumber,
      `+${record.quantity}`,
      record.supplier || 'N/A'
    ]);

    autoTable(doc, {
      startY: 65,
      head: [["Date", "Store Destination", "Brand & Model", "SKU", "Qty Received", "Supplier"]],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }
    });
    doc.save(`Stock_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) return <div className="flex justify-center items-center h-full font-bold text-slate-500">Loading Analytics...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>
        <p className="text-slate-500">Track your revenue, costs, and profits.</p>
      </div>

      {/* THE SHARED FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-4 items-center z-40 relative">
        <div className="flex items-center gap-2 text-slate-500 font-bold shrink-0">
          <Search size={18} /> Filters:
        </div>
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Start Date</label>
            <input type="date" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">End Date</label>
            <input type="date" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700" />
          </div>
          
          <div className="relative" ref={dropdownRef}>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Filter by Item</label>
            <div className="relative">
              <input
                type="text"
                placeholder={displayProduct}
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full pl-3 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-700 placeholder:font-medium"
              />
              <ChevronDown className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" size={18} />
            </div>
            {showDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                <div onClick={() => handleSelectProduct('ALL')} className="p-3 hover:bg-blue-50 cursor-pointer font-bold text-slate-700 border-b">All Products</div>
                {filteredProducts.map(p => (
                  <div key={p.id} onClick={() => handleSelectProduct(p)} className="p-3 hover:bg-blue-50 cursor-pointer border-b text-sm transition-colors">
                    <div className="font-bold text-slate-800">{p.brand} {p.modelName}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activeTab === 'stock' && (
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Store Location</label>
              <select 
                value={filters.store} 
                onChange={e => setFilters({...filters, store: e.target.value})} 
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 font-medium"
              >
                <option value="ALL">All Stores</option>
                <option value="Store 1">Store 1 - Main Showroom</option>
                <option value="Store 2">Store 2 - Branch</option>
              </select>
            </div>
          )}
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full xl:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2 shrink-0 h-full mt-4 xl:mt-0"
        >
          <List size={20} /> View Details
        </button>
      </div>

      {/* TABS CONTROLLER */}
      <div className="flex border-b border-slate-200 gap-6">
        <button onClick={() => { setActiveTab('sales'); setFilters({...filters, store: 'ALL'}); }} className={`pb-3 font-bold text-lg transition-colors border-b-4 ${activeTab === 'sales' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Sales Analytics</button>
        <button onClick={() => setActiveTab('stock')} className={`pb-3 font-bold text-lg transition-colors border-b-4 ${activeTab === 'stock' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Stock Intake History</button>
      </div>

      {/* MAIN DASHBOARD (KPIs and Charts) */}
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center md:text-left">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-center md:justify-start gap-2"><DollarSign className="text-blue-500" size={18} /> Total Sales</h3>
            <p className="text-3xl font-black text-slate-800">Rs. {totalSales.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center md:text-left">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-center md:justify-start gap-2"><Receipt className="text-red-500" size={18} /> Inventory Cost</h3>
            <p className="text-3xl font-black text-slate-800">Rs. {inventoryCost.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border-2 border-green-400 shadow-sm text-center md:text-left relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-green-500"></div>
            <h3 className="text-xs font-bold text-green-700 uppercase tracking-widest mb-2 flex items-center justify-center md:justify-start gap-2"><TrendingUp size={18} /> Net Profit</h3>
            <p className="text-3xl font-black text-green-700">Rs. {netProfit.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center md:text-left">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-center md:justify-start gap-2"><Package className="text-purple-500" size={18} /> Orders Placed</h3>
            <p className="text-3xl font-black text-slate-800">{totalOrders}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><TrendingUp className="text-blue-600" size={20} /> Sales by Category</h3>
            {pieData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => `Rs. ${value.toFixed(2)}`} />
                    <Legend verticalAlign="bottom" height={36} iconType="square" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400 font-medium">No sales data for these filters.</div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm">
            <h3 className="font-bold text-red-700 flex items-center gap-2 mb-4 border-b border-red-50 pb-3"><AlertTriangle size={20} /> Low Stock Alerts</h3>
            {outOfStockItems.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {outOfStockItems.map(p => (
                  <div key={p.id} className="bg-red-50 p-3 rounded-lg border border-red-100 flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">{p.brand} {p.modelName}</span>
                    <span className="text-red-600 font-extrabold text-sm mt-1">0 Units Available</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">
                All inventory is well stocked!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* THE DETAILED DATA POP-UP (MODAL) */}
      {/* ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {activeTab === 'sales' ? 'Detailed Sales Data' : 'Detailed Stock Intake Data'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Showing {activeTab === 'sales' ? filteredOrders.length : filteredIntakes.length} records based on your filters.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'sales' ? (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0">
                    <tr>
                      <th className="p-3 font-bold">Date</th>
                      <th className="p-3 font-bold">Order ID</th>
                      <th className="p-3 font-bold">Customer</th>
                      <th className="p-3 font-bold">Items Sold</th>
                      <th className="p-3 font-bold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-slate-500 font-bold">No sales records found.</td></tr>
                    ) : (
                      filteredOrders.map(order => (
                        <tr key={order.id} className="hover:bg-blue-50">
                          <td className="p-3">{new Date(order.date).toLocaleDateString()}</td>
                          <td className="p-3 font-mono text-xs">{order.id}</td>
                          <td className="p-3 font-medium">{order.customer.name}</td>
                          <td className="p-3 text-xs">{order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</td>
                          <td className="p-3 text-right font-bold text-slate-800">Rs. {order.total.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0">
                    <tr>
                      <th className="p-3 font-bold">Date</th>
                      <th className="p-3 font-bold">Destination</th>
                      <th className="p-3 font-bold">Appliance</th>
                      <th className="p-3 font-bold text-right">Qty Received</th>
                      <th className="p-3 font-bold">Supplier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredIntakes.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-slate-500 font-bold">No intake records found.</td></tr>
                    ) : (
                      filteredIntakes.map(record => (
                        <tr key={record.id} className="hover:bg-green-50">
                          <td className="p-3">{new Date(record.receivedAt).toLocaleDateString()}</td>
                          <td className="p-3 font-medium">{record.destination}</td>
                          <td className="p-3 font-bold">{record.product?.brand} {record.product?.modelName}</td>
                          <td className="p-3 text-right font-extrabold text-green-600">+{record.quantity}</td>
                          <td className="p-3">{record.supplier || 'N/A'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl shrink-0 flex justify-end">
              <button 
                onClick={activeTab === 'sales' ? generateSalesPDF : generateStockPDF}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-lg font-bold shadow-md transition-all"
              >
                <FileDown size={20} /> Export to PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}