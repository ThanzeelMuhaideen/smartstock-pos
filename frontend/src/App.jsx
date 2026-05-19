import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Search, ShoppingCart, Trash2, ReceiptText, Plus, Minus, X, User, Phone, MapPin as MapPinIcon, CreditCard, Banknote, UserSearch } from 'lucide-react';

// Import all your pages
import Dashboard from './Dashboard';
import ProductCatalog from './ProductCatalog';
import Categories from './Categories.jsx';
import Customers from './Customers.jsx';
import Login from './Login';
import Layout from './Layout';
import Settings from './Settings';
import Transactions from './Transactions';
import StockIntake from './StockIntake';
import AIInsights from './AIInsights';

export default function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  return (
    <Routes>
      <Route element={<Layout user={user} handleLogout={handleLogout} />}>
        <Route path="/" element={<POSInterface />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="customers" element={<Customers />} />
        <Route path="products" element={<ProductCatalog user={user} />} />
        
        {/* === ADMIN ONLY ACCESS === */}
        <Route path="intake" element={user.role === 'ADMIN' ? <StockIntake /> : <Navigate to="/" replace />} />
        <Route path="categories" element={user.role === 'ADMIN' ? <Categories /> : <Navigate to="/" replace />} />
        <Route path="/reports" element={user.role === 'ADMIN' ? <Dashboard /> : <Navigate to="/" replace />} />
        <Route path="ai-insights" element={user.role === 'ADMIN' ? <AIInsights /> : <Navigate to="/" replace />} />
        <Route path="settings" element={user.role === 'ADMIN' ? <Settings /> : <Navigate to="/" replace />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

// =========================================================================
// SUB-COMPONENT: POS INTERFACE
// =========================================================================
function POSInterface() {
  const [skuInput, setSkuInput] = useState('');
  const [cart, setCart] = useState([]);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [taxRate, setTaxRate] = useState(0);
  const [discountRate, setDiscountRate] = useState(0); 
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleLiveSearch = async (e) => {
    const value = e.target.value;
    setSkuInput(value);
    setError('');
    if (value.trim().length >= 2) {
      try {
        const response = await axios.get(`https://smartstock-pos.vercel.app//api/products/search?q=${value}`);
        setSearchResults(response.data);
        setShowDropdown(true);
      } catch (err) { console.error("Failed to fetch search results", err); }
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const addToCart = (productToAdd) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.modelNumber === productToAdd.modelNumber);
      if (existingItemIndex >= 0) {
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = { ...updatedCart[existingItemIndex], quantity: (parseInt(updatedCart[existingItemIndex].quantity) || 0) + 1 };
        return updatedCart;
      } else {
        return [...prevCart, { ...productToAdd, quantity: 1, serialNumber: '', warrantyMonths: 0 }];
      }
    });
    setSkuInput('');
    setSearchResults([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleExactScan = async (e) => {
    e.preventDefault(); 
    if (!skuInput.trim()) return;
    try {
      const response = await axios.get(`https://smartstock-pos.vercel.app//api/products/sku/${skuInput}`);
      addToCart(response.data);
    } catch (err) {
      setError(`Model '${skuInput.toUpperCase()}' not found.`);
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const handleQuantityChange = (index, newValue) => {
    setCart(prevCart => {
      const updatedCart = [...prevCart];
      updatedCart[index] = { ...updatedCart[index], quantity: newValue };
      return updatedCart;
    });
  };

  const handleItemDetailsChange = (index, field, value) => {
    setCart(prevCart => {
      const updatedCart = [...prevCart];
      updatedCart[index] = { ...updatedCart[index], [field]: value };
      return updatedCart;
    });
  };

  const removeFromCart = (indexToRemove) => { setCart(cart.filter((_, index) => index !== indexToRemove)); };

  const handleCustomerSearch = async (e) => {
    const val = e.target.value;
    setCustomerQuery(val);
    if (val.trim().length >= 2) {
      try {
        const response = await axios.get(`https://smartstock-pos.vercel.app//api/customers/search?q=${val}`);
        setCustomerResults(response.data);
        setShowCustDropdown(true);
      } catch (err) { console.error("Failed to search customers", err); }
    } else {
      setCustomerResults([]);
      setShowCustDropdown(false);
    }
  };

  const handleSelectCustomer = (selectedCustomer) => {
    setCustomer({ name: selectedCustomer.name, phone: selectedCustomer.phone, address: selectedCustomer.address });
    setCustomerQuery(''); 
    setShowCustDropdown(false); 
  };

  const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * (parseInt(item.quantity) || 0)), 0);
  const parsedDiscountRate = parseFloat(discountRate) || 0;
  const discountAmount = subtotal * (parsedDiscountRate / 100);
  const discountedSubtotal = subtotal - discountAmount; 
  const parsedTaxRate = parseFloat(taxRate) || 0; 
  const taxAmount = discountedSubtotal * (parsedTaxRate / 100); 
  const grandTotal = discountedSubtotal + taxAmount;

  const handleConfirmOrder = async (e) => {
    e.preventDefault(); 
    const orderData = {
      cart, customer, paymentMethod, subtotal,
      discountRate: parsedDiscountRate, taxRate: parsedTaxRate, grandTotal
    };

    try {
      const response = await axios.post(import.meta.env.VITE_API_URL + '//api/orders', orderData);
      alert(`Payment Successful! 🎉\nOrder #${response.data.orderId}\nTotal: Rs. ${grandTotal.toFixed(2)}`);
      setCart([]);
      setIsCheckoutOpen(false);
      setCustomer({ name: '', phone: '', address: '' });
      setCustomerQuery('');
      setPaymentMethod('card');
      setDiscountRate(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (error) {
      alert("Error processing payment: " + (error.response?.data?.error || "Server error"));
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 relative w-full min-h-full lg:h-[calc(100vh-4rem)]">
      
      {/* LEFT SIDE: Scanner Terminal */}
      <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Checkout Terminal</h1>
          <p className="text-slate-500">Search by Model Name, Brand, or SKU</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm z-10 shrink-0">
          <form onSubmit={handleExactScan} className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20"><Search className="h-6 w-6 text-slate-400" /></div>
            <input ref={inputRef} type="text" value={skuInput} onChange={handleLiveSearch} className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-lg text-xl focus:ring-0 focus:border-blue-500 focus:bg-white transition-colors" placeholder="Start typing... (e.g., Samsung, RT38, Fridge)" autoComplete="off" />
            <button type="submit" className="absolute inset-y-2 right-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 rounded-md transition-colors z-20">Enter</button>

            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto top-full left-0">
                {searchResults.map((item) => (
                  <div key={item.id} onClick={() => addToCart(item)} className="p-4 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0 flex justify-between items-center transition-colors">
                    <div>
                      <div className="font-bold text-slate-800">{item.brand} {item.modelName}</div>
                      <div className="text-sm text-slate-500 font-mono mt-1">SKU: {item.modelNumber}</div>
                    </div>
                    <div className="font-extrabold text-slate-700">Rs. {parseFloat(item.price).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </form>
          {error && <p className="mt-3 text-red-500 font-medium flex items-center">⚠️ {error}</p>}
        </div>

        {/* Cart List */}
        <div className="bg-white flex-1 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col z-0">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
            <h2 className="font-bold text-slate-700 flex items-center gap-2"><ShoppingCart size={20} /> Current Cart</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">{cart.reduce((total, item) => total + (parseInt(item.quantity) || 0), 0)} Items</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2"><ShoppingCart size={48} className="opacity-20" /><p>Cart is empty. Scan an item to begin.</p></div>
            ) : (
              cart.map((item, index) => (
                <div key={index} className="flex flex-col p-4 bg-slate-50 border border-slate-100 rounded-lg hover:border-slate-300 transition-colors">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800">{item.brand} {item.modelName}</h3>
                      <p className="text-sm text-slate-500 font-mono">SKU: {item.modelNumber}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                        <button onClick={() => handleQuantityChange(index, (parseInt(item.quantity) || 1) - 1)} disabled={item.quantity <= 1} className="p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30"><Minus size={16} strokeWidth={3} /></button>
                        <input type="text" value={item.quantity} onChange={(e) => { if (/^\d*$/.test(e.target.value)) handleQuantityChange(index, e.target.value); }} className="w-12 py-1 text-center font-bold text-slate-800 focus:outline-none" />
                        <button onClick={() => handleQuantityChange(index, (parseInt(item.quantity) || 0) + 1)} className="p-2 text-slate-600 hover:bg-slate-100"><Plus size={16} strokeWidth={3} /></button>
                      </div>
                      <div className="text-right min-w-[120px]">
                        <span className="font-extrabold text-lg text-slate-700">Rs. {(parseFloat(item.price) * (parseInt(item.quantity) || 0)).toFixed(2)}</span>
                      </div>
                      <button onClick={() => removeFromCart(index)} className="text-red-400 hover:text-red-600 p-2 rounded-md hover:bg-red-50"><Trash2 size={20} /></button>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-3 border-t border-slate-200 mt-1">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Serial Number (Optional)</label>
                      <input type="text" placeholder="e.g. SN-987654321" value={item.serialNumber || ''} onChange={(e) => handleItemDetailsChange(index, 'serialNumber', e.target.value)} className="w-full text-sm px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none uppercase font-mono" />
                    </div>
                    <div className="w-1/3">
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Warranty</label>
                      <select value={item.warrantyMonths || 0} onChange={(e) => handleItemDetailsChange(index, 'warrantyMonths', e.target.value)} className="w-full text-sm px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white">
                        <option value={0}>No Warranty</option>
                        <option value={6}>6 Months</option>
                        <option value={12}>1 Year</option>
                        <option value={24}>2 Years</option>
                        <option value={60}>5 Years</option>
                        <option value={120}>10 Years</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Invoice Preview */}
      <div className="w-full lg:w-[400px] h-fit bg-slate-900 text-white rounded-xl shadow-xl flex flex-col overflow-hidden z-0">
        <div className="p-6 border-b border-slate-800 text-center">
          <ReceiptText className="w-12 h-12 mx-auto mb-2 text-blue-400" />
          <h2 className="text-xl font-bold tracking-widest uppercase">SmartStock</h2>
          <p className="text-slate-400 text-sm">Customer Invoice</p>
        </div>

        <div className="p-6 space-y-4 flex-1">
          <div className="flex justify-between items-center text-slate-300">
            <span>Subtotal</span><span className="font-mono text-lg">Rs. {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-green-400">Discount</span>
              <div className="relative w-16">
                <input type="text" value={discountRate} onChange={(e) => { const val = e.target.value; if (val === '' || /^\d*\.?\d*$/.test(val)) setDiscountRate(val); }} onBlur={() => { if (discountRate === '') setDiscountRate(0); }} className="w-full bg-slate-800 text-green-400 px-2 py-1 rounded border border-slate-700 focus:border-green-500 focus:outline-none text-right pr-5 text-sm font-bold" />
                <span className="absolute right-1.5 top-1.5 text-green-500 text-sm">%</span>
              </div>
            </div>
            <span className="font-mono text-lg text-green-400">-Rs. {discountAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-300">
            <div className="flex items-center gap-2">
              <span>Tax Rate</span>
              <div className="relative w-16">
                <input type="text" value={taxRate} onChange={(e) => { const val = e.target.value; if (val === '' || /^\d*\.?\d*$/.test(val)) setTaxRate(val); }} onBlur={() => { if (taxRate === '') setTaxRate(0); }} className="w-full bg-slate-800 text-white px-2 py-1 rounded border border-slate-700 focus:border-blue-500 focus:outline-none text-right pr-5 text-sm" />
                <span className="absolute right-1.5 top-1.5 text-slate-400 text-sm">%</span>
              </div>
            </div>
            <span className="font-mono text-lg">Rs. {taxAmount.toFixed(2)}</span>
          </div>

          <div className="border-t border-slate-700 pt-4 mt-4 flex justify-between items-end">
            <span className="text-lg font-bold text-slate-200">Total Due</span><span className="text-3xl font-extrabold text-white font-mono">Rs. {grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="p-6 bg-slate-950">
          <button disabled={cart.length === 0} onClick={() => setIsCheckoutOpen(true)} className={`w-full py-4 text-lg font-bold rounded-lg transition-all ${cart.length === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]'}`}>Process Payment</button>
        </div>
      </div>

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-slate-800 p-6 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Finalize Order</h2>
                <p className="text-blue-200 text-sm mt-1">Amount Due: <span className="font-mono font-bold text-lg">Rs. {grandTotal.toFixed(2)}</span></p>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-700 hover:bg-slate-600 p-2 rounded-full"><X size={20} /></button>
            </div>

            <form onSubmit={handleConfirmOrder} className="p-6 space-y-6 overflow-y-auto">
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800 border-b pb-2">Customer Details</h3>
                <div className="relative z-50">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserSearch className="h-5 w-5 text-blue-500" /></div>
                  <input type="text" placeholder="Search returning customer (Name or Phone)..." value={customerQuery} onChange={handleCustomerSearch} className="w-full pl-10 pr-4 py-2 bg-blue-50 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-medium text-blue-900 placeholder:text-blue-400" />
                  {showCustDropdown && customerResults.length > 0 && (
                    <div className="absolute w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {customerResults.map(c => (
                        <div key={c.id} onClick={() => handleSelectCustomer(c)} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0">
                          <div className="font-bold text-slate-800">{c.name}</div>
                          <div className="text-sm text-slate-500 font-mono">{c.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" /><input type="text" required placeholder="Full Name" value={customer.name} onChange={(e) => setCustomer({...customer, name: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-400" /><input type="tel" required placeholder="Phone Number" value={customer.phone} onChange={(e) => setCustomer({...customer, phone: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" /><textarea required placeholder="Delivery Address" value={customer.address} onChange={(e) => setCustomer({...customer, address: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px]" />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-800 border-b pb-2">Payment Method</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setPaymentMethod('card')} className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all font-bold ${paymentMethod === 'card' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}><CreditCard size={20} /> Card</button>
                  <button type="button" onClick={() => setPaymentMethod('cash')} className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all font-bold ${paymentMethod === 'cash' ? 'border-green-600 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}><Banknote size={20} /> Cash</button>
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-colors text-lg flex justify-center items-center gap-2 shrink-0">Confirm & Pay <span className="font-mono">Rs. {grandTotal.toFixed(2)}</span></button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
