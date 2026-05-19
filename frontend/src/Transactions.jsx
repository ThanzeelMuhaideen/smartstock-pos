import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, ReceiptText, RotateCcw, Calendar, CheckCircle2, AlertTriangle, User, CreditCard } from 'lucide-react';

export default function Transactions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/orders');
      setOrders(response.data);
      if (response.data.length > 0) {
        setSelectedOrder(response.data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch orders from database.", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefund = async (order) => {
    if (window.confirm(`Are you sure you want to process a full refund for ${order.id}? This will restock the inventory.`)) {
      try {
        await axios.put(`http://localhost:5000/api/orders/${order.originalId}/refund`);
        setOrders(orders.map(o => o.id === order.id ? { ...o, status: 'REFUNDED' } : o));
        setSelectedOrder({ ...selectedOrder, status: 'REFUNDED' });
        alert("Refund processed successfully. Inventory has been restocked.");
      } catch (error) {
        alert("Error processing refund: " + (error.response?.data?.error || "Server error"));
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-6 min-h-full lg:h-[calc(100vh-5rem)] pb-4 lg:pb-0">
      
      {/* LEFT SIDE: SEARCH & LIST */}
      <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Invoices & Returns</h1>
          <p className="text-slate-500 text-sm">Search transaction history and process refunds</p>
        </div>

        <div className="relative shrink-0">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
            placeholder="Search by Order ID or Customer Name..." 
          />
        </div>

        <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500 font-bold animate-pulse">Loading transaction history...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-bold">No transactions found in database.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredOrders.map(order => (
                <div 
                  key={order.id} 
                  onClick={() => setSelectedOrder(order)}
                  className={`p-4 cursor-pointer transition-colors flex items-center justify-between ${selectedOrder?.id === order.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}
                >
                  <div>
                    <h3 className="font-bold text-slate-800">{order.id}</h3>
                    <div className="flex items-center text-sm text-slate-500 mt-1 gap-3">
                      <span className="flex items-center gap-1"><User size={14}/> {order.customer.name}</span>
                      <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(order.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-slate-700">Rs. {order.total.toFixed(2)}</p>
                    <span className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: RECEIPT PREVIEW */}
      <div className="w-full lg:w-[450px] bg-slate-900 text-white rounded-xl shadow-xl flex flex-col overflow-hidden shrink-0 h-full">
        {selectedOrder ? (
          <>
            <div className="p-6 border-b border-slate-800 text-center shrink-0">
              <ReceiptText className="w-10 h-10 mx-auto mb-3 text-blue-400" />
              <h2 className="text-lg font-bold tracking-widest uppercase">Receipt Details</h2>
              <p className="text-slate-400 text-sm font-mono mt-1">{selectedOrder.id}</p>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {selectedOrder.status === 'REFUNDED' && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-lg flex items-center justify-center gap-2 font-bold">
                  <AlertTriangle size={18} /> THIS ORDER WAS REFUNDED
                </div>
              )}
              {selectedOrder.status === 'COMPLETED' && (
                <div className="bg-green-500/20 border border-green-500/50 text-green-400 p-3 rounded-lg flex items-center justify-center gap-2 font-bold">
                  <CheckCircle2 size={18} /> PAYMENT COMPLETED
                </div>
              )}

              <div className="bg-slate-800/50 p-4 rounded-lg">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Customer Information</p>
                <p className="font-bold text-slate-200">{selectedOrder.customer.name}</p>
                <p className="text-sm text-slate-400">Phone: {selectedOrder.customer.phone}</p>
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-3 border-b border-slate-800 pb-2">Items Purchased</p>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-start text-sm">
                      <div>
                        <p className="font-bold text-slate-200">{item.quantity}x {item.name}</p>
                        <p className="text-slate-500 font-mono text-xs mt-0.5">SKU: {item.sku}</p>
                      </div>
                      <p className="font-bold text-slate-300">Rs. {(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 space-y-2">
                <div className="flex justify-between text-slate-400 text-sm">
                  <span>Subtotal</span><span>Rs. {selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-sm">
                  <span>Tax</span><span>Rs. {selectedOrder.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-end pt-2">
                  <span className="text-lg font-bold text-slate-200">Total</span>
                  <span className="text-3xl font-extrabold text-white font-mono">Rs. {selectedOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 text-slate-500 text-sm">
                  <span>Payment Method</span>
                  <span className="flex items-center gap-1 font-bold text-slate-300">
                    <CreditCard size={14} /> {selectedOrder.paymentMethod}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-950 shrink-0">
              <button 
                disabled={selectedOrder.status === 'REFUNDED'}
                onClick={() => handleRefund(selectedOrder)}
                className={`w-full py-4 text-base font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${
                  selectedOrder.status === 'REFUNDED' 
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                }`}
              >
                <RotateCcw size={18} />
                {selectedOrder.status === 'REFUNDED' ? 'Already Refunded' : 'Process Refund'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-2">
            <ReceiptText size={48} className="opacity-20" />
            <p className="font-bold">Select an order to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}