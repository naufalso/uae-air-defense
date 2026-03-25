import React, { useState, useMemo } from 'react';
import { ShieldAlert, Crosshair, Activity, Database, Info, MapPin } from 'lucide-react';
import {
  Area,
  Bar,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  formatData,
  getLatestLocalCsv,
  parseCSV,
  toTimelineData,
} from './lib/dashboardData';

const formatCompactNumber = (value) => {
  if (typeof value !== 'number') return value;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toLocaleString();
};

function ThreatTooltip({ active, payload, type, color, isCumulative }) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;
  const prefix = type === 'ballistic' ? 'ballistic' : 'UAV';
  const detected = point[`${prefix}_detected`] || 0;
  const neutralized = point[`${prefix}_neutralized`] || 0;
  const intercepted = point[`${prefix}_intercepted`] || 0;
  const seaImpact = point[`${prefix}_sea`] || 0;
  const landImpact = point[`${prefix}_land`] || 0;
  const protectionRate = detected > 0 ? ((neutralized / detected) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-w-[180px] rounded-lg border border-slate-700 bg-slate-950/95 p-3 text-xs text-slate-200 shadow-2xl backdrop-blur">
      <div className="mb-2 border-b border-slate-800 pb-2">
        <div className="font-semibold text-white">{point.Date}</div>
        <div className="text-[11px] uppercase tracking-wide text-slate-500">
          {isCumulative ? 'Cumulative' : 'Daily'} {type === 'ballistic' ? 'Ballistic Missiles' : 'UAV / Drones'}
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Detected</span>
          <span className="font-mono text-slate-200">{detected.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Neutralized</span>
          <span className="font-mono" style={{ color }}>{neutralized.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4 text-slate-400">
          <span>Intercepted</span>
          <span className="font-mono text-slate-200">{intercepted.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4 text-slate-400">
          <span>Sea Impact</span>
          <span className="font-mono text-slate-200">{seaImpact.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4 text-slate-400">
          <span>Land Impact</span>
          <span className={`font-mono ${landImpact > 0 ? 'text-red-400' : 'text-slate-200'}`}>{landImpact.toLocaleString()}</span>
        </div>
      </div>
      <div className="mt-2 border-t border-slate-800 pt-2 text-slate-300">
        Protection Rate: <span className="font-semibold text-white">{protectionRate}%</span>
      </div>
    </div>
  );
}

function ThreatChart({ data, title, type, color, isCumulative }) {
  const prefix = type === 'ballistic' ? 'ballistic' : 'UAV';
  const detectedKey = `${prefix}_detected`;
  const neutralizedKey = `${prefix}_neutralized`;

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col h-80">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="text-slate-300 font-semibold">{title}</h3>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm bg-slate-500/70" />
            <span className="text-slate-400">Detected</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-slate-400">Neutralized</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 20 }}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              minTickGap={20}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={formatCompactNumber}
              tickLine={false}
              axisLine={false}
              width={42}
            />
            <Tooltip
              cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
              content={<ThreatTooltip type={type} color={color} isCumulative={isCumulative} />}
            />
            {isCumulative ? (
              <>
                <Line
                  type="monotone"
                  dataKey={detectedKey}
                  stroke="#64748b"
                  strokeWidth={2}
                  dot={false}
                  name="Detected"
                />
                <Area
                  type="monotone"
                  dataKey={neutralizedKey}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.2}
                  strokeWidth={2.5}
                  dot={false}
                  name="Neutralized"
                />
              </>
            ) : (
              <>
                <Bar dataKey={detectedKey} fill="rgba(100, 116, 139, 0.45)" radius={[4, 4, 0, 0]} name="Detected" />
                <Bar dataKey={neutralizedKey} fill={color} radius={[4, 4, 0, 0]} name="Neutralized" />
              </>
            )}
            <Brush
              dataKey="dateLabel"
              height={20}
              startIndex={0}
              endIndex={Math.max(0, data.length - 1)}
              travellerWidth={10}
              stroke={color}
              fill="#0f172a"
              tickFormatter={() => ''}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function getInitialDashboardState() {
  const latestCsv = getLatestLocalCsv();
  if (!latestCsv) {
    return {
      data: [],
      fileName: 'No local CSV found in /data',
      dateRangeLabel: 'Date range unavailable',
      loadError: 'No local CSV found in /data',
    };
  }

  const parsed = parseCSV(latestCsv.content);
  if (parsed.length === 0) {
    return {
      data: [],
      fileName: latestCsv.fileName,
      dateRangeLabel: latestCsv.dateRange
        ? `${latestCsv.dateRange.start} - ${latestCsv.dateRange.end}`
        : latestCsv.fileName,
      loadError: `No valid dashboard rows were found in ${latestCsv.fileName}.`,
    };
  }

  return {
    data: formatData(parsed),
    fileName: latestCsv.fileName,
    dateRangeLabel: latestCsv.dateRange
      ? `${latestCsv.dateRange.start} - ${latestCsv.dateRange.end}`
      : latestCsv.fileName,
    loadError: '',
  };
}

export default function App() {
  const initialState = useMemo(() => getInitialDashboardState(), []);
  const [data] = useState(initialState.data);
  const [dateRangeLabel] = useState(initialState.dateRangeLabel);
  const [isCumulative, setIsCumulative] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadError] = useState(initialState.loadError);
  const PAGE_SIZE = 10;

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

  const chartTimelineData = useMemo(() => toTimelineData(data), [data]);

  const cumulativeData = useMemo(() => {
    return chartTimelineData.reduce(
      (acc, day) => {
        const totals = {
          ballistic_detected: acc.totals.ballistic_detected + day.ballistic_detected,
          ballistic_intercepted: acc.totals.ballistic_intercepted + day.ballistic_intercepted,
          ballistic_sea: acc.totals.ballistic_sea + (day.ballistic_sea || 0),
          ballistic_land: acc.totals.ballistic_land + (day.ballistic_land || 0),
          UAV_detected: acc.totals.UAV_detected + day.UAV_detected,
          UAV_intercepted: acc.totals.UAV_intercepted + day.UAV_intercepted,
          UAV_sea: acc.totals.UAV_sea + (day.UAV_sea || 0),
          UAV_land: acc.totals.UAV_land + (day.UAV_land || 0),
        };

        acc.rows.push({
          ...day,
          ...totals,
          ballistic_neutralized: totals.ballistic_intercepted + totals.ballistic_sea,
          UAV_neutralized: totals.UAV_intercepted + totals.UAV_sea,
        });

        acc.totals = totals;
        return acc;
      },
      {
        rows: [],
        totals: {
          ballistic_detected: 0,
          ballistic_intercepted: 0,
          ballistic_sea: 0,
          ballistic_land: 0,
          UAV_detected: 0,
          UAV_intercepted: 0,
          UAV_sea: 0,
          UAV_land: 0,
        },
      }
    ).rows;
  }, [chartTimelineData]);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (activePage - 1) * PAGE_SIZE;
    return data.slice(start, start + PAGE_SIZE);
  }, [activePage, data]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8 selection:bg-blue-500/30 flex flex-col">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <ShieldAlert className="text-red-500 h-8 w-8" />
            UAE Air Defense Incident Dashboard
          </h1>
          <p className="text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Database className="w-4 h-4" />
            <span>Data Source: Instagram</span>
            <a
              href="https://www.instagram.com/modgovae"
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 transition-colors hover:text-blue-300 hover:underline"
            >
              @modgovae
            </a>
            <span className="text-slate-600">•</span>
            <span>{dateRangeLabel}</span>
            <span className="text-slate-600">•</span>
            <a
              href="https://github.com/naufalso/uae-air-defense"
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 transition-colors hover:text-blue-300 hover:underline"
            >
              GitHub source code
            </a>
          </p>
        </div>
      </header>

      {loadError && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {loadError}
        </div>
      )}

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
            <ThreatChart data={cumulativeData} title="Cumulative Ballistic Missiles" type="ballistic" color="#ef4444" isCumulative />
            <ThreatChart data={cumulativeData} title="Cumulative UAV / Drones" type="UAV" color="#3b82f6" isCumulative />
          </>
        ) : (
          <>
            <ThreatChart data={chartTimelineData} title="Daily Ballistic Missiles" type="ballistic" color="#ef4444" isCumulative={false} />
            <ThreatChart data={chartTimelineData} title="Daily UAV / Drones" type="UAV" color="#3b82f6" isCumulative={false} />
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
          <div className="flex flex-col items-end gap-2">
            <div className="text-xs text-slate-400 flex gap-4">
               <div><span className="text-emerald-400 font-bold">Int:</span> Intercepted</div>
               <div><span className="text-blue-400 font-bold">Sea:</span> Sea Impact</div>
               <div><span className="text-red-400 font-bold">Lnd:</span> Land Impact</div>
            </div>
            {data.length > 0 && (
              <div className="text-xs text-slate-500">
                Showing {Math.min((activePage - 1) * PAGE_SIZE + 1, data.length)}-{Math.min(activePage * PAGE_SIZE, data.length)} of {data.length}
              </div>
            )}
          </div>
        </div>
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="sticky top-0 z-10 bg-slate-800 text-slate-400 uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Title/Summary</th>
                <th className="px-4 py-3 text-center">Ballistic (Int / Sea / Lnd)</th>
                <th className="px-4 py-3 text-center">UAV (Int / Sea / Lnd)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {paginatedData.map((row, idx) => (
                <tr key={`${row.Date}-${row.URL || idx}`} className="hover:bg-slate-800/50 transition-colors">
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
                    No data available from the local dashboard dataset.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-4 border-t border-slate-800 bg-slate-900/70 px-4 py-3">
            <p className="text-xs text-slate-500">
              Page {activePage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={activePage === 1}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={activePage === totalPages}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Disclaimer */}
      <footer className="mt-16 pt-8 border-t border-slate-800 text-center text-slate-400 text-sm pb-8">
        <div className="mb-6 flex w-full flex-col items-center rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
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
        <p className="w-full">
          If you spot any inaccuracies or discrepancies in the data extraction, please report them to me so the dataset can be promptly updated.
        </p>
        <p className="mt-3 w-full">
          Maintained by{' '}
          <a
            href="https://github.com/naufalso"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-blue-400 transition-colors hover:text-blue-300 hover:underline"
          >
            github.com/naufalso
          </a>
          .
        </p>
      </footer>

    </div>
  );
}
