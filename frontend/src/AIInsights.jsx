import { useState, useEffect } from 'react';
import axios from 'axios';
import { BrainCircuit, AlertTriangle, PackagePlus, CalendarClock, TrendingDown, Activity, CheckCircle2, Search, Filter, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';

export default function AIInsights() {
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');

  useEffect(() => {
    generateAIForecast();
  }, []);

  const generateAIForecast = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        axios.get(import.meta.env.VITE_API_URL + '/api/products'),
        axios.get(import.meta.env.VITE_API_URL + '/api/orders')
      ]);

      const products = productsRes.data;
      const orders = ordersRes.data.filter(o => o.status === 'COMPLETED');

      const TIME_FRAME_DAYS = 30;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - TIME_FRAME_DAYS);

      const recentOrders = orders.filter(o => new Date(o.date) >= thirtyDaysAgo);

      const predictions = products.map(product => {
        let unitsSoldLast30Days = 0;
        recentOrders.forEach(order => {
          const itemInOrder = order.items.find(i => i.sku === product.modelNumber);
          if (itemInOrder) {
            unitsSoldLast30Days += itemInOrder.quantity;
          }
        });

        const dailyVelocity = unitsSoldLast30Days / TIME_FRAME_DAYS;
        
        let daysUntilEmpty = 'Infinity';
        let emptyDate = 'N/A';
        let riskLevel = 'SAFE'; 
        let recommendedOrder = 0;

        if (product.stock === 0) {
          riskLevel = 'OUT_OF_STOCK';
          daysUntilEmpty = 0;
          recommendedOrder = Math.ceil(dailyVelocity * 30) || 10; 
        } else if (dailyVelocity > 0) {
          daysUntilEmpty = Math.floor(product.stock / dailyVelocity);
          
          const depletion = new Date();
          depletion.setDate(depletion.getDate() + daysUntilEmpty);
          emptyDate = depletion.toLocaleDateString();

          if (daysUntilEmpty <= 7) riskLevel = 'CRITICAL';
          else if (daysUntilEmpty <= 14) riskLevel = 'WARNING';

          recommendedOrder = Math.ceil((dailyVelocity * 30) - product.stock);
          if (recommendedOrder < 0) recommendedOrder = 0;
        }

        return {
          ...product,
          unitsSoldLast30Days,
          dailyVelocity,
          daysUntilEmpty,
          emptyDate,
          riskLevel,
          recommendedOrder
        };
      });

      const sortedPredictions = predictions.sort((a, b) => {
        if (a.daysUntilEmpty === 'Infinity') return 1;
        if (b.daysUntilEmpty === 'Infinity') return -1;
        return a.daysUntilEmpty - b.daysUntilEmpty;
      });

      setForecasts(sortedPredictions);
    } catch (error) {
      console.error("AI Forecast failed to calculate:", error);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FILTER LOGIC
  // ==========================================
  const filteredForecasts = forecasts.filter(item => {
    const matchesSearch = `${item.brand} ${item.modelName} ${item.modelNumber}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesRisk = true;
    if (riskFilter === 'ACTION_REQUIRED') {
      matchesRisk = item.riskLevel === 'CRITICAL' || item.riskLevel === 'OUT_OF_STOCK';
    } else if (riskFilter !== 'ALL') {
      matchesRisk = item.riskLevel === riskFilter;
    }

    return matchesSearch && matchesRisk;
  });

  // ==========================================
  // PDF GENERATION LOGIC (BOARD REPORT)
  // ==========================================
  const generatePDFReport = () => {
    // Landscape orientation is better for data-heavy tables
    const doc = new jsPDF('landscape'); 

    doc.setFontSize(22);
    doc.setTextColor(49, 46, 129); // Indigo-900 to match the AI theme
    doc.text("SmartStock", 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("AI Demand Forecast & Executive Reorder Report", 14, 28);
    
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);
    
    doc.text(`Filters Applied:`, 14, 46);
    doc.setFontSize(9);
    doc.text(`Risk Level: ${riskFilter.replace('_', ' ')} | Search Term: ${searchQuery || 'None'}`, 14, 52);

    const tableColumn = ["Risk Status", "SKU", "Appliance", "Current Stock", "30-Day Sales", "Velocity", "Est. Depletion", "Reorder Qty"];
    const tableRows = [];

    filteredForecasts.forEach(item => {
      const itemData = [
        item.riskLevel.replace('_', ' '),
        item.modelNumber,
        `${item.brand} ${item.modelName}`,
        item.stock.toString(),
        item.unitsSoldLast30Days.toString(),
        `${item.dailyVelocity.toFixed(1)} / day`,
        item.emptyDate,
        `+${item.recommendedOrder}`
      ];
      tableRows.push(itemData);
    });

    autoTable(doc, {
      startY: 60,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [67, 56, 202] }, // Indigo-700
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 9, cellPadding: 4 },
      // Highlight the Reorder Qty column for the board
      columnStyles: {
        0: { fontStyle: 'bold' },
        7: { fontStyle: 'bold', textColor: [67, 56, 202] } 
      }
    });

    doc.save(`SmartStock_AI_Forecast_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-indigo-500 animate-pulse">
        <BrainCircuit size={64} className="mb-4" />
        <h2 className="text-xl font-bold">SmartStock Engine analyzing sales velocity...</h2>
      </div>
    );
  }

  const criticalItems = forecasts.filter(f => f.riskLevel === 'CRITICAL' || f.riskLevel === 'OUT_OF_STOCK');

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      
      {/* HEADER */}
      <div className="bg-indigo-900 text-white p-8 rounded-2xl shadow-lg relative overflow-hidden flex justify-between items-center">
        <div className="relative z-10">
          <h1 className="text-3xl font-black flex items-center gap-3">
            <BrainCircuit className="text-indigo-400" size={32} /> AI Demand Forecast
          </h1>
          <p className="text-indigo-200 mt-2 font-medium">Predictive inventory modeling based on 30-day sales velocity.</p>
        </div>
        <Activity size={120} className="text-indigo-800 absolute right-10 opacity-50" />
      </div>

      {/* SUMMARY BAR */}
      {criticalItems.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-center gap-4">
          <AlertTriangle className="text-red-500" size={28} />
          <div>
            <h3 className="font-bold text-red-800">Action Required</h3>
            <p className="text-red-600 text-sm">{criticalItems.length} appliances are at risk of stocking out within the next 7 days.</p>
          </div>
        </div>
      )}

      {/* SEARCH & FILTER BAR WITH EXPORT BUTTON */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center z-40 relative">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search AI forecasts by brand, model, or SKU..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
          />
        </div>
        
        <div className="w-full md:w-72 flex items-center gap-2">
          <Filter size={20} className="text-slate-400 shrink-0" />
          <select 
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium text-slate-700"
          >
            <option value="ALL">Show All Inventory</option>
            <option value="ACTION_REQUIRED">Action Required (Critical/Empty)</option>
            <option value="WARNING">Low Stock Warning</option>
            <option value="SAFE">Optimal Levels (Safe)</option>
          </select>
        </div>

        {/* NEW: PDF EXPORT BUTTON */}
        <button 
          onClick={generatePDFReport}
          className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2 shrink-0"
        >
          <FileDown size={20} /> Export Report
        </button>
      </div>

      {/* PREDICTION CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredForecasts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 font-bold bg-white rounded-xl border border-slate-200 border-dashed">
            No items match your search criteria.
          </div>
        ) : (
          filteredForecasts.map(item => {
            
            let cardStyle = "border-slate-200 bg-white";
            let badgeStyle = "bg-slate-100 text-slate-600";
            let icon = <CheckCircle2 className="text-green-500" />;

            if (item.riskLevel === 'OUT_OF_STOCK') {
              cardStyle = "border-red-300 bg-red-50";
              badgeStyle = "bg-red-100 text-red-700";
              icon = <AlertTriangle className="text-red-500" />;
            } else if (item.riskLevel === 'CRITICAL') {
              cardStyle = "border-orange-300 bg-orange-50";
              badgeStyle = "bg-orange-100 text-orange-700";
              icon = <TrendingDown className="text-orange-500" />;
            } else if (item.riskLevel === 'WARNING') {
              cardStyle = "border-yellow-300 bg-yellow-50";
              badgeStyle = "bg-yellow-100 text-yellow-700";
            }

            return (
              <div key={item.id} className={`p-6 rounded-2xl border-2 shadow-sm transition-all hover:shadow-md ${cardStyle} flex flex-col justify-between animate-in fade-in zoom-in-95 duration-200`}>
                
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      {icon}
                      <span className={`text-xs font-black uppercase tracking-widest px-2 py-1 rounded-md ${badgeStyle}`}>
                        {item.riskLevel.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-slate-500">SKU: {item.modelNumber}</span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 leading-tight mb-1">{item.brand} {item.modelName}</h3>
                  <p className="text-sm font-semibold text-slate-500 mb-6">Current Stock: <span className="text-slate-800 text-base">{item.stock} Units</span></p>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
                      <span className="text-slate-500">30-Day Sales</span>
                      <span className="font-bold text-slate-700">{item.unitsSoldLast30Days} Units</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Sales Velocity</span>
                      <span className="font-bold text-slate-700">{item.dailyVelocity.toFixed(1)} / day</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-1">
                      <span className="text-slate-500 flex items-center gap-1"><CalendarClock size={16}/> Depletion Date</span>
                      <span className={`font-bold ${item.riskLevel === 'CRITICAL' || item.riskLevel === 'OUT_OF_STOCK' ? 'text-red-600' : 'text-slate-700'}`}>
                        {item.emptyDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* REORDER RECOMMENDATION */}
                <div className="mt-6 pt-4 border-t border-slate-200/50">
                  {item.recommendedOrder > 0 ? (
                    <div className="flex items-center justify-between bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                      <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm">
                        <PackagePlus size={18} /> Reorder Suggestion
                      </div>
                      <span className="text-lg font-black text-indigo-600">+{item.recommendedOrder} Units</span>
                    </div>
                  ) : (
                    <div className="text-center text-sm font-bold text-slate-400 py-3">
                      Stock levels are optimal.
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
