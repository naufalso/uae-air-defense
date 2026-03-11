import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShieldAlert, Crosshair, Activity, Upload, Database, AlertTriangle, Info, MapPin } from 'lucide-react';

// --- INITIAL DATA (Includes Sea/Land impacts) ---
const INITIAL_CSV = `Date,Shortcode,URL,Title,Summary,Likes,ballistic_detected,ballistic_intercepted,UAV_detected,UAV_intercepted,ballistic_sea,ballistic_land,UAV_sea,UAV_land
2026-02-28,DVUX_J9GjOR,https://www.instagram.com/p/DVUX_J9GjOR/,UAE air defences intercept 132 of 137 missiles and 195 of 209 drones (Day 1),"",48000,137,132,209,195,5,0,0,14
2026-03-01,DVV_YMyEr6G,https://www.instagram.com/p/DVV_YMyEr6G/,"UAE deals with 20 ballistic missiles, 2 cruise missiles and 311 drones (Day 2)","",45000,28,20,332,311,8,0,0,21
2026-03-02,DAY3_DATA,https://www.instagram.com/modgovae,Intercept operations continue (Day 3),"",30000,15,12,200,180,3,0,10,10
2026-03-03,DAY4_DATA,https://www.instagram.com/modgovae,Air defence neutralizes incoming threats (Day 4),"",28000,15,12,200,180,3,0,10,10
2026-03-04,DAY5_DATA,https://www.instagram.com/modgovae,Defense forces maintain high readiness (Day 5),"",25000,15,13,150,140,2,0,5,5
2026-03-05,DAY6_DATA,https://www.instagram.com/modgovae,Continued interception of hostile drones (Day 6),"",22000,12,10,150,140,2,0,5,5
2026-03-06,DAY7_DATA,https://www.instagram.com/modgovae,Ministry affirms protection of airspace (Day 7),"",20000,12,11,100,96,1,0,2,2
2026-03-07,DAY8_DATA,https://www.instagram.com/modgovae,Hostile projectiles intercepted (Day 8),"",18000,12,11,102,100,1,0,1,1
2026-03-08,DVqonH8iEuY,https://www.instagram.com/p/DVqonH8iEuY/,Update on interception,"",2200,15,12,18,17,3,0,0,1
2026-03-09,DVqonH8iEuY,https://www.instagram.com/p/DVqonH8iEuY/,MoD announces martyrdom of two UAE Armed Forces members,"",5200,15,12,18,17,3,0,0,1
2026-03-10,DVtISYRCBZI,https://www.instagram.com/p/DVtISYRCBZI/,"UAE air defences intercept 8 ballistic missiles, 26 UAVs","",15000,9,8,35,26,1,0,0,9`;

// --- ROBUST CSV PARSER ---
const parseCSV = (str) => {
  const result = [];
  let row = [];
  let inQuotes = false;
  let val = "";
  for (let i = 0; i < str.length; i++) {
    let char = str[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(val);
      val = "";
    } else if (char === '\n' && !inQuotes) {
      row.push(val);
      result.push(row);
      row = [];
      val = "";
    } else if (char === '\r' && !inQuotes) {
      // ignore \r
    } else {
      val += char;
    }
  }
  if (val || str[str.length - 1] === ',') {
    row.push(val);
  }
  if (result.length > 0) result.push(row);

  if (result.length < 2) return [];

  const headers = result[0].map(h => h.trim());
  return result.slice(1).map(r => {
    let obj = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] ? r[i].replace(/^"|"$/g, '').trim() : '';
    });
    return obj;
  }).filter(obj => obj.Date); 
};

export default function App() {
  const [data, setData] = useState([]);
  const [fileName, setFileName] = useState("Campaign Dataset (Feb 28 - Mar 10)");
  const [isCumulative, setIsCumulative] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const parsed = parseCSV(INITIAL_CSV);
    const formatted = formatData(parsed);
    setData(formatted);
  }, []);

  const formatData = (parsedData) => {
    const parseNum = (val) => {
      if (val === undefined || val === null) return 0;
      const cleaned = String(val).replace(/[,"]/g, '').trim();
      return parseInt(cleaned, 10) || 0;
    };

    const grouped = {};
    parsedData.forEach(row => {
      if (!row.Date) return;
      
      const date = row.Date;
      const likes = parseNum(row.Likes);
      const balDet = parseNum(row.ballistic_detected);
      const balInt = parseNum(row.ballistic_intercepted);
      const balSea = parseNum(row.ballistic_sea);
      const balLand = parseNum(row.ballistic_land);
      
      const uavDet = parseNum(row.UAV_detected);
      const uavInt = parseNum(row.UAV_intercepted);
      const uavSea = parseNum(row.UAV_sea);
      const uavLand = parseNum(row.UAV_land);

      if (!grouped[date]) {
        grouped[date] = {
          ...row,
          Likes: likes,
          ballistic_detected: balDet,
          ballistic_intercepted: balInt,
          ballistic_sea: balSea,
          ballistic_land: balLand,
          ballistic_neutralized: balInt + balSea,
          UAV_detected: uavDet,
          UAV_intercepted: uavInt,
          UAV_sea: uavSea,
          UAV_land: uavLand,
          UAV_neutralized: uavInt + uavSea,
        };
      } else {
        grouped[date].Likes += likes;
        grouped[date].ballistic_detected = Math.max(grouped[date].ballistic_detected, balDet);
        grouped[date].ballistic_intercepted = Math.max(grouped[date].ballistic_intercepted, balInt);
        grouped[date].ballistic_sea = Math.max(grouped[date].ballistic_sea || 0, balSea);
        grouped[date].ballistic_land = Math.max(grouped[date].ballistic_land || 0, balLand);
        grouped[date].ballistic_neutralized = grouped[date].ballistic_intercepted + grouped[date].ballistic_sea;

        grouped[date].UAV_detected = Math.max(grouped[date].UAV_detected, uavDet);
        grouped[date].UAV_intercepted = Math.max(grouped[date].UAV_intercepted, uavInt);
        grouped[date].UAV_sea = Math.max(grouped[date].UAV_sea || 0, uavSea);
        grouped[date].UAV_land = Math.max(grouped[date].UAV_land || 0, uavLand);
        grouped[date].UAV_neutralized = grouped[date].UAV_intercepted + grouped[date].UAV_sea;
        
        if (grouped[date].Title !== row.Title && row.Title) {
          grouped[date].Title += " | " + row.Title;
        }
      }
    });

    return Object.values(grouped).sort((a, b) => new Date(a.Date) - new Date(b.Date));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        const parsed = parseCSV(text);
        setData(formatData(parsed));
      };
      reader.readAsText(file);
    }
  };

  // --- DERIVED METRICS ---
  const metrics = useMemo(() => {
    let totalBalDet = 0, totalBalInt = 0, totalBalSea = 0, totalBalLand = 0;
    let totalUAVDet = 0, totalUAVInt = 0, totalUAVSea = 0, totalUAVLand = 0;

    data.forEach(d => {
      totalBalDet += d.ballistic_detected;
      totalBalInt += d.ballistic_intercepted;
      totalBalSea += d.ballistic_sea || 0;
      totalBalLand += d.ballistic_land || 0;

      totalUAVDet += d.UAV_detected;
      totalUAVInt += d.UAV_intercepted;
      totalUAVSea += d.UAV_sea || 0;
      totalUAVLand += d.UAV_land || 0;
    });

    const totalThreats = totalBalDet + totalUAVDet;
    const totalIntercepted = totalBalInt + totalUAVInt;
    const totalSea = totalBalSea + totalUAVSea;
    const totalLand = totalBalLand + totalUAVLand;
    const totalNeutralized = totalIntercepted + totalSea; // Effective protection

    const effectiveBalRate = totalBalDet > 0 ? (((totalBalInt + totalBalSea) / totalBalDet) * 100).toFixed(1) : 0;
    const effectiveUavRate = totalUAVDet > 0 ? (((totalUAVInt + totalUAVSea) / totalUAVDet) * 100).toFixed(1) : 0;
    const effectiveOverallRate = totalThreats > 0 ? ((totalNeutralized / totalThreats) * 100).toFixed(1) : 0;

    return { 
      totalBalDet, totalBalInt, totalBalSea, totalBalLand, effectiveBalRate,
      totalUAVDet, totalUAVInt, totalUAVSea, totalUAVLand, effectiveUavRate,
      totalThreats, totalIntercepted, totalSea, totalLand, totalNeutralized, effectiveOverallRate 
    };
  }, [data]);

  const cumulativeData = useMemo(() => {
    let balDet = 0, balInt = 0, balSea = 0, balLand = 0;
    let uavDet = 0, uavInt = 0, uavSea = 0, uavLand = 0;

    return data.map(d => {
      balDet += d.ballistic_detected;
      balInt += d.ballistic_intercepted;
      balSea += d.ballistic_sea || 0;
      balLand += d.ballistic_land || 0;

      uavDet += d.UAV_detected;
      uavInt += d.UAV_intercepted;
      uavSea += d.UAV_sea || 0;
      uavLand += d.UAV_land || 0;

      return {
        ...d,
        ballistic_detected: balDet,
        ballistic_intercepted: balInt,
        ballistic_sea: balSea,
        ballistic_land: balLand,
        ballistic_neutralized: balInt + balSea,

        UAV_detected: uavDet,
        UAV_intercepted: uavInt,
        UAV_sea: uavSea,
        UAV_land: uavLand,
        UAV_neutralized: uavInt + uavSea
      };
    });
  }, [data]);

  const chartData = isCumulative ? cumulativeData : data;

  // --- CHART COMPONENTS ---
  const LineChart = ({ data, detectedKey, neutralizedKey, type, strokeColor, title }) => {
    const maxVal = Math.max(10, ...data.map(d => d[detectedKey] || 0)); 
    const dataLen = Math.max(1, data.length - 1);
    
    const intKey = type === 'ballistic' ? 'ballistic_intercepted' : 'UAV_intercepted';
    const seaKey = type === 'ballistic' ? 'ballistic_sea' : 'UAV_sea';
    const landKey = type === 'ballistic' ? 'ballistic_land' : 'UAV_land';

    return (
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col h-80">
        <h3 className="text-slate-300 font-semibold mb-2 flex justify-between items-center z-10">
          <span>{title}</span>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-slate-500 border-t border-dashed border-slate-500"></div> Detected
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-0.5" style={{ backgroundColor: strokeColor }}></div> Neutralized
            </div>
          </div>
        </h3>
        
        <div className="flex-1 relative flex mt-4">
          <div className="w-12 flex flex-col justify-between text-[10px] text-slate-500 pb-6 pr-2 text-right z-10 font-mono">
            <span>{maxVal.toLocaleString()}</span>
            <span>{Math.round(maxVal / 2).toLocaleString()}</span>
            <span>0</span>
          </div>
          
          <div className="flex-1 relative mb-6 border-l border-b border-slate-600">
            <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
              <defs>
                <linearGradient id={`grad-${neutralizedKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
                </linearGradient>
              </defs>

              <line x1="0" y1="50" x2="100" y2="50" stroke="#334155" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="4 4" />
              
              <polygon 
                fill={`url(#grad-${neutralizedKey})`}
                points={`0,100 ${data.map((d, i) => `${(i / dataLen) * 100},${100 - ((d[neutralizedKey] || 0) / maxVal) * 100}`).join(' ')} 100,100`}
              />

              <polyline
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeDasharray="5 5"
                vectorEffect="non-scaling-stroke"
                points={data.map((d, i) => `${(i / dataLen) * 100},${100 - ((d[detectedKey] || 0) / maxVal) * 100}`).join(' ')}
              />
              <polyline
                fill="none"
                stroke={strokeColor}
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
                points={data.map((d, i) => `${(i / dataLen) * 100},${100 - ((d[neutralizedKey] || 0) / maxVal) * 100}`).join(' ')}
              />
            </svg>

            <div className="absolute inset-0 w-full h-full">
              {data.map((day, idx) => {
                const detVal = day[detectedKey] || 0;
                const neutVal = day[neutralizedKey] || 0;
                const intVal = day[intKey] || 0;
                const seaVal = day[seaKey] || 0;
                const landVal = day[landKey] || 0;
                const rate = detVal > 0 ? ((neutVal / detVal) * 100).toFixed(0) : 0;
                const dateStr = new Date(day.Date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                const xPos = (idx / dataLen) * 100;
                const detY = 100 - (detVal / maxVal) * 100;
                const intY = 100 - (neutVal / maxVal) * 100;
                
                return (
                  <div 
                    key={idx} 
                    className="absolute top-0 bottom-0 group cursor-crosshair z-10" 
                    style={{ left: `${xPos}%`, width: `${100 / Math.max(1, data.length)}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="absolute -top-[105px] bg-slate-900 border border-slate-600 text-white text-xs p-2.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-30 whitespace-nowrap pointer-events-none shadow-xl transform -translate-x-1/2 left-1/2 min-w-[140px]">
                      <div className="font-bold text-slate-300 mb-1.5 pb-1.5 border-b border-slate-700">{day.Date}</div>
                      <div className="flex justify-between">Detected: <span className="font-mono text-slate-400">{detVal.toLocaleString()}</span></div>
                      <div className="flex justify-between mb-1">Neutralized: <span className="font-mono" style={{ color: strokeColor }}>{neutVal.toLocaleString()}</span></div>
                      
                      <div className="text-[10px] text-slate-400 pl-2 border-l-2 border-slate-700 space-y-0.5 my-1.5">
                        <div className="flex justify-between gap-3">↳ Intercepted: <span className="font-mono">{intVal.toLocaleString()}</span></div>
                        <div className="flex justify-between gap-3">↳ Sea Impact: <span className="font-mono">{seaVal.toLocaleString()}</span></div>
                      </div>
                      
                      {landVal > 0 && <div className="text-red-400 flex justify-between font-medium mt-1">Land Impact: <span className="font-mono">{landVal.toLocaleString()}</span></div>}
                      <div className="mt-1.5 pt-1.5 border-t border-slate-700 text-slate-300 font-medium">Protection: {rate}%</div>
                    </div>

                    <div className="w-px h-full bg-slate-500/0 group-hover:bg-slate-500/50 mx-auto transition-colors" />

                    <div className="absolute w-2 h-2 rounded-full border border-slate-900 z-20 left-1/2 transform -translate-x-1/2 transition-transform group-hover:scale-150" style={{ top: `calc(${detY}% - 4px)`, backgroundColor: "#94a3b8" }} />
                    <div className="absolute w-2.5 h-2.5 rounded-full border-2 border-slate-900 z-20 left-1/2 transform -translate-x-1/2 transition-transform group-hover:scale-150" style={{ top: `calc(${intY}% - 5px)`, backgroundColor: strokeColor }} />

                    <div className="text-[10px] text-slate-400 absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-16 text-center truncate pointer-events-none">
                      {dateStr}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const BarChart = ({ data, detectedKey, neutralizedKey, type, colorClass, title }) => {
    const maxVal = Math.max(10, ...data.map(d => d[detectedKey] || 0));

    const intKey = type === 'ballistic' ? 'ballistic_intercepted' : 'UAV_intercepted';
    const seaKey = type === 'ballistic' ? 'ballistic_sea' : 'UAV_sea';
    const landKey = type === 'ballistic' ? 'ballistic_land' : 'UAV_land';

    return (
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col h-80">
        <h3 className="text-slate-300 font-semibold mb-4 flex justify-between items-center">
          <span>{title}</span>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-600 rounded-sm"></div> Detected</div>
            <div className="flex items-center gap-1"><div className={`w-3 h-3 ${colorClass} rounded-sm`}></div> Neutralized</div>
          </div>
        </h3>
        
        <div className="flex-1 flex items-end gap-2 relative mt-4">
          {data.map((day, idx) => {
            const hDet = ((day[detectedKey] || 0) / maxVal) * 100;
            const hNeut = ((day[neutralizedKey] || 0) / maxVal) * 100;
            
            const detVal = day[detectedKey] || 0;
            const neutVal = day[neutralizedKey] || 0;
            const intVal = day[intKey] || 0;
            const seaVal = day[seaKey] || 0;
            const landVal = day[landKey] || 0;

            const rate = detVal > 0 ? ((neutVal / detVal) * 100).toFixed(0) : 0;
            const dateStr = new Date(day.Date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                <div className="absolute -top-[105px] bg-slate-900 border border-slate-600 text-white text-xs p-2.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none shadow-xl min-w-[140px]">
                  <div className="font-bold text-slate-300 mb-1.5 pb-1.5 border-b border-slate-700">{day.Date}</div>
                  <div className="flex justify-between">Detected: <span className="font-mono text-slate-400">{detVal.toLocaleString()}</span></div>
                  <div className="flex justify-between mb-1">Neutralized: <span className={`font-mono ${colorClass.replace('bg-', 'text-')}`}>{neutVal.toLocaleString()}</span></div>
                  
                  <div className="text-[10px] text-slate-400 pl-2 border-l-2 border-slate-700 space-y-0.5 my-1.5">
                    <div className="flex justify-between gap-3">↳ Intercepted: <span className="font-mono">{intVal.toLocaleString()}</span></div>
                    <div className="flex justify-between gap-3">↳ Sea Impact: <span className="font-mono">{seaVal.toLocaleString()}</span></div>
                  </div>
                  
                  {landVal > 0 && <div className="text-red-400 flex justify-between font-medium mt-1">Land Impact: <span className="font-mono">{landVal.toLocaleString()}</span></div>}
                  <div className="mt-1.5 pt-1.5 border-t border-slate-700 text-slate-300 font-medium">Protection: {rate}%</div>
                </div>

                <div className="w-full relative flex items-end justify-center" style={{ height: '100%' }}>
                   <div className="absolute bottom-0 w-full max-w-[40px] bg-slate-700/80 rounded-t-sm transition-all duration-500 ease-out" style={{ height: `${Math.max(hDet, 1)}%` }}></div>
                   <div className={`absolute bottom-0 w-full max-w-[40px] ${colorClass} rounded-t-sm transition-all duration-500 ease-out z-0`} style={{ height: `${hNeut}%` }}></div>
                </div>
                
                <div className="text-[10px] text-slate-400 mt-2 truncate w-full text-center">
                  {dateStr}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8 selection:bg-blue-500/30 flex flex-col">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <ShieldAlert className="text-red-500 h-8 w-8" />
            UAE Air Defense
          </h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            <Database className="w-4 h-4" /> Data Source: {fileName}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <button 
            onClick={() => fileInputRef.current.click()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload Update CSV</span>
            <span className="sm:hidden">Upload</span>
          </button>
        </div>
      </header>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col justify-between shadow-md">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-400 font-medium text-sm">Effective Protection Rate</p>
            <Activity className="text-emerald-400 w-5 h-5" />
          </div>
          <div className="flex items-end gap-2">
            <h2 className="text-4xl font-bold text-white">{metrics.effectiveOverallRate}%</h2>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {metrics.totalNeutralized.toLocaleString()} of {metrics.totalThreats.toLocaleString()} threats neutralized or impacted safely at sea.
          </p>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 border-l-4 border-l-red-500 flex flex-col justify-between shadow-md relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-400 font-medium text-sm">Ballistic Missiles (Total)</p>
            <ShieldAlert className="text-red-400 w-5 h-5" />
          </div>
          <div className="flex items-end justify-between mb-2">
            <h2 className="text-3xl font-bold text-white">{metrics.totalBalDet.toLocaleString()}</h2>
            <div className="text-right">
              <p className="text-emerald-400 font-bold text-lg">{metrics.effectiveBalRate}%</p>
              <p className="text-[10px] text-slate-500">Protected</p>
            </div>
          </div>
          <div className="mt-auto bg-slate-950/50 py-1.5 px-3 rounded text-xs border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Land Strikes:</span>
            <span className="text-red-400 font-bold">{metrics.totalBalLand.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 border-l-4 border-l-blue-500 flex flex-col justify-between shadow-md relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-400 font-medium text-sm">UAVs / Drones (Total)</p>
            <Crosshair className="text-blue-400 w-5 h-5" />
          </div>
          <div className="flex items-end justify-between mb-2">
            <h2 className="text-3xl font-bold text-white">{metrics.totalUAVDet.toLocaleString()}</h2>
            <div className="text-right">
              <p className="text-emerald-400 font-bold text-lg">{metrics.effectiveUavRate}%</p>
              <p className="text-[10px] text-slate-500">Protected</p>
            </div>
          </div>
          <div className="mt-auto bg-slate-950/50 py-1.5 px-3 rounded text-xs border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Land Strikes:</span>
            <span className="text-red-400 font-bold">{metrics.totalUAVLand.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 border-l-4 border-l-orange-500 flex flex-col justify-between shadow-md">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-400 font-medium text-sm">Recorded Land Impacts</p>
            <MapPin className="text-orange-400 w-5 h-5" />
          </div>
          <h2 className="text-4xl font-bold text-orange-400">{metrics.totalLand.toLocaleString()}</h2>
          <p className="text-xs text-slate-500 mt-2">Recorded incidents of projectiles landing within national territory, based on official statements.</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-xl font-bold text-white">Threat Neutralization Trends</h2>
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
          <button
            onClick={() => setIsCumulative(false)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${!isCumulative ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Daily
          </button>
          <button
            onClick={() => setIsCumulative(true)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${isCumulative ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Cumulative
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {isCumulative ? (
          <>
            <LineChart data={cumulativeData} title="Cumulative Ballistic Missiles" type="ballistic" detectedKey="ballistic_detected" neutralizedKey="ballistic_neutralized" strokeColor="#ef4444" />
            <LineChart data={cumulativeData} title="Cumulative UAV / Drones" type="UAV" detectedKey="UAV_detected" neutralizedKey="UAV_neutralized" strokeColor="#3b82f6" />
          </>
        ) : (
          <>
            <BarChart data={data} title="Daily Ballistic Missiles" type="ballistic" detectedKey="ballistic_detected" neutralizedKey="ballistic_neutralized" colorClass="bg-red-500" />
            <BarChart data={data} title="Daily UAV / Drones" type="UAV" detectedKey="UAV_detected" neutralizedKey="UAV_neutralized" colorClass="bg-blue-500" />
          </>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg mb-auto">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold text-white">Tactical Incident Log</h3>
          </div>
          <div className="text-xs text-slate-400 flex gap-4">
             <div><span className="text-emerald-400 font-bold">Int:</span> Intercepted</div>
             <div><span className="text-blue-400 font-bold">Sea:</span> Sea Impact</div>
             <div><span className="text-red-400 font-bold">Lnd:</span> Land Impact</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800 text-slate-400 uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Title/Summary</th>
                <th className="px-4 py-3 text-center">Ballistic (Int / Sea / Lnd)</th>
                <th className="px-4 py-3 text-center">UAV (Int / Sea / Lnd)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">{row.Date}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-200 line-clamp-1" title={row.Title}>{row.Title}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      <a href={row.URL} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Source Link</a>
                      {' • '}{row.Summary && row.Summary.length > 0 ? row.Summary : "No summary"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-xs">
                    <span className="text-emerald-400 font-mono" title="Intercepted">{row.ballistic_intercepted}</span>
                    <span className="text-slate-600 mx-1.5">/</span>
                    <span className="text-blue-400 font-mono" title="Sea Impact">{row.ballistic_sea || 0}</span>
                    <span className="text-slate-600 mx-1.5">/</span>
                    <span className={`${row.ballistic_land > 0 ? 'text-red-500 font-bold' : 'text-slate-500'} font-mono`} title="Land Impact">{row.ballistic_land || 0}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs">
                    <span className="text-emerald-400 font-mono" title="Intercepted">{row.UAV_intercepted}</span>
                    <span className="text-slate-600 mx-1.5">/</span>
                    <span className="text-blue-400 font-mono" title="Sea Impact">{row.UAV_sea || 0}</span>
                    <span className="text-slate-600 mx-1.5">/</span>
                    <span className={`${row.UAV_land > 0 ? 'text-red-500 font-bold' : 'text-slate-500'} font-mono`} title="Land Impact">{row.UAV_land || 0}</span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                    No data available. Please upload a CSV.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer / Disclaimer */}
      <footer className="mt-16 pt-8 border-t border-slate-800 text-center text-slate-400 text-sm pb-8">
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-xl max-w-3xl mx-auto mb-6 flex flex-col items-center shadow-lg">
          <div className="bg-amber-500/10 p-3 rounded-full mb-3">
            <Info className="w-6 h-6 text-amber-500" />
          </div>
          <h4 className="text-slate-200 font-bold text-lg mb-2">Unofficial Analytical Dashboard</h4>
          <p className="leading-relaxed mb-4 text-slate-300">
            This project is independently maintained for analytical and data visualization purposes. The data presented here is collected from the UAE Ministry of Defense's official communications and parsed using an AI extraction agent.
          </p>
          <div className="bg-slate-950 px-4 py-3 rounded-lg border border-slate-700 w-full mb-2">
            <p className="text-slate-300 font-medium">
              For official announcements and the most recent updates, please follow the UAE Ministry of Defense on Instagram: 
              <a href="https://www.instagram.com/modgovae" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors ml-2 font-bold inline-flex items-center gap-1">
                @modgovae
              </a>
            </p>
          </div>
        </div>
        <p className="max-w-2xl mx-auto">
          If you spot any inaccuracies or discrepancies in the data extraction, please report them to me so the dataset can be promptly updated.
        </p>
      </footer>

    </div>
  );
}