import { useState, useEffect } from 'react';
import axios from 'axios';
import { Pencil, Trash2, User, Phone, MapPin, ReceiptText, X, Clock, Download, ShieldCheck, ShieldAlert, History } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState(null); 
  const [orderHistory, setOrderHistory] = useState([]);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(import.meta.env.VITE_API_URL + '/api/customers');
      setCustomers(response.data);
    } catch (err) { console.error("Failed to fetch customers", err); }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', phone: '', address: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Fixed route and ID usage
        await axios.put(`${import.meta.env.VITE_API_URL}/api/customers/${editingId}`, formData);
      } else {
        await axios.post(import.meta.env.VITE_API_URL + '/api/customers', formData);
      }
      fetchCustomers();
      resetForm();
    } catch (error) { alert(error.response?.data?.error || "Failed to save customer."); }
  };

  const handleEdit = (customer) => {
    setEditingId(customer.id);
    setFormData({ name: customer.name, phone: customer.phone, address: customer.address });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/customers/${id}`);
        fetchCustomers();
      } catch (error) { alert("Failed to delete customer."); }
    }
  };

  const handleViewHistory = async (customer) => {
    setActiveCustomer(customer); 
    try {
      // FIXED: Used customer.id here to fix the "undefined" history error
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/customers/${customer.id}/orders`);
      setOrderHistory(response.data);
      setIsHistoryOpen(true);
    } catch (error) { 
      console.error("History fetch error:", error);
      alert("Failed to load customer history."); 
    }
  };

  const checkWarranty = (purchaseDate, warrantyMonths) => {
    if (!warrantyMonths || warrantyMonths === 0) return null;
    
    const purchase = new Date(purchaseDate);
    const expiry = new Date(purchase.setMonth(purchase.getMonth() + warrantyMonths));
    const now = new Date();
    
    return {
      isValid: expiry > now,
      expiryDate: expiry.toLocaleDateString()
    };
  };

  const generateInvoicePDF = (order) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138);
    doc.text("SMARTSTOCK", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Official Customer Invoice", 14, 28);
    
    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text(`Invoice Number: #${order.id}`, 14, 45);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 14, 52);
    doc.text(`Customer Name: ${activeCustomer?.name || ''}`, 14, 59);
    doc.text(`Payment Method: ${order.paymentMethod.toUpperCase()}`, 14, 66);

    const tableColumn = ["Item Description", "SKU", "Serial Number", "Qty", "Price", "Total"];
    const tableRows = [];

    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        const itemData = [
          `${item.product?.brand || ''} ${item.product?.modelName || 'Unknown'}`,
          item.product?.modelNumber || 'N/A',
          item.serialNumber || 'N/A',
          item.quantity.toString(),
          `Rs. ${item.priceAtSale.toFixed(2)}`,
          `Rs. ${(item.quantity * item.priceAtSale).toFixed(2)}`
        ];
        tableRows.push(itemData);
      });
    }

    autoTable(doc, {
      startY: 75,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9 }
    });

    const finalY = doc.lastAutoTable?.finalY || 75;

    doc.setFontSize(10);
    doc.text(`Subtotal: Rs. ${(order.subtotal || 0).toFixed(2)}`, 140, finalY + 15);
    if (order.discountRate > 0) {
      doc.setTextColor(22, 163, 74);
      doc.text(`Discount: ${order.discountRate}%`, 140, finalY + 22);
      doc.setTextColor(50);
    }
    doc.text(`Tax Rate: ${(order.taxRate || 0)}%`, 140, finalY + 29);
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Grand Total: Rs. ${(order.grandTotal || 0).toFixed(2)}`, 140, finalY + 40);

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150);
    doc.text("Thank you for your business! Please keep this invoice for warranty claims.", 14, 280);

    doc.save(`Invoice_${order.id}_${(activeCustomer?.name || '').replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Customer Directory</h1>
        <p className="text-slate-500">Manage client profiles and view purchase history</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm lg:col-span-1 h-fit">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">{editingId ? "Edit Customer Profile" : "Register New Customer"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="e.g., John Doe" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono" placeholder="0771234567" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Delivery Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <textarea name="address" value={formData.address} onChange={handleInputChange} required className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 min-h-[80px]" placeholder="123 Main St, City" />
              </div>
            </div>
            
            <div className="flex space-x-2 pt-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 shadow-sm">{editingId ? "Update Profile" : "Save Customer"}</button>
              {editingId && <button type="button" onClick={resetForm} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded-md transition duration-200">Cancel</button>}
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm lg:col-span-2 overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Customer Name</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Address</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {customers.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">No customers registered yet.</td></tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{customer.name}</td>
                    <td className="px-6 py-4 font-mono text-blue-600">{customer.phone}</td>
                    <td className="px-6 py-4 text-slate-500 truncate max-w-[150px]" title={customer.address}>{customer.address}</td>
                    <td className="px-6 py-4 text-right space-x-2 flex justify-end">
                      <button onClick={() => handleViewHistory(customer)} className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors" title="Purchase History"><ReceiptText className="w-4 h-4" /></button>
                      <button onClick={() => handleEdit(customer)} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(customer.id)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isHistoryOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex justify-between items-start bg-white rounded-t-2xl shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full">
                  <User size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">{activeCustomer?.name}</h2>
                  <p className="text-sm font-medium text-slate-500 flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1"><Phone size={14}/> {activeCustomer?.phone}</span>
                    <span className="flex items-center gap-1"><MapPin size={14}/> {activeCustomer?.address}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50 flex-1">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                <History size={20} className="text-indigo-600"/> Order & Warranty History
              </h3>

              {orderHistory.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <ReceiptText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p>This customer hasn't made any purchases yet.</p>
                </div>
              ) : (
                orderHistory.map((order) => (
                  <div key={order.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-slate-100 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-800 mr-3 text-lg">Order #{order.id}</span>
                        <span className="text-sm text-slate-500 font-medium">{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-extrabold text-blue-600 text-lg">Rs. {order.grandTotal.toFixed(2)}</div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{order.paymentMethod}</div>
                        </div>
                        <button onClick={() => generateInvoicePDF(order)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">
                          <Download size={16} /> PDF
                        </button>
                      </div>
                    </div>
                    
                    <div className="px-5 py-3 divide-y divide-slate-100">
                      {order.items.map((item) => {
                        const warranty = checkWarranty(order.createdAt, item.warrantyMonths);
                        return (
                          <div key={item.id} className="py-4 flex justify-between items-start">
                            <div>
                              <div className="font-bold text-slate-800 text-md mb-1">
                                {item.quantity}x {item.product?.brand} {item.product?.modelName || "Unknown Item"}
                              </div>
                              <div className="text-sm text-slate-500 font-mono mb-2">SKU: {item.product?.modelNumber || "N/A"}</div>
                              <div className="flex flex-wrap items-center gap-2">
                                {item.serialNumber && (
                                  <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1">
                                    SN: {item.serialNumber}
                                  </span>
                                )}
                                {warranty && (
                                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 border ${warranty.isValid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                    {warranty.isValid ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                                    {warranty.isValid ? 'Warranty Valid' : 'Warranty Expired'} 
                                    <span className="font-normal opacity-80">(Ends {warranty.expiryDate})</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-md font-bold text-slate-700">
                              Rs. {item.priceAtSale.toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {order.discountRate > 0 && (
                      <div className="bg-green-50 px-5 py-2 border-t border-green-100 text-xs font-bold text-green-700 text-right">
                        Applied a {order.discountRate}% Discount on this order.
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}