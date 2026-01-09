"use client";
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldAlert, Activity } from 'lucide-react';

export default function Dashboard() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false); 

  useEffect(() => {
    setMounted(true);
    const socket = io('http://127.0.0.1:5000');

    socket.on('connect', () => {
      console.log("Connected to Python WebSocket!");
    });

    socket.on('anomaly_detected', (data) => {
      console.log("New Anomaly Received:", data);
      setAlerts((prev) => {
        const newAlerts = [data, ...prev];
        return newAlerts.slice(0, 15); 
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (!mounted) return <div className="min-h-screen bg-slate-950" />;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="text-red-500" /> AI Log Shield
        </h1>
        <div className="bg-slate-900 p-2 rounded border border-slate-800 text-xs">
          System Status: <span className="text-green-400 font-mono">ACTIVE</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART SECTION */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="text-blue-400" /> Latency Analysis (Real-time)
            </h2>
            <div className="h-[87.5] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...alerts].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timestamp" hide />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
                    itemStyle={{ color: '#ef4444' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="time" 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    dot={{ fill: '#ef4444', r: 4 }} 
                    isAnimationActive={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ALERTS PANEL */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col h-116.25">
          <h2 className="text-lg font-semibold mb-4 text-red-400">Live Threat Alerts</h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {alerts.length === 0 && (
              <p className="text-slate-500 italic text-sm text-center mt-10">
                Waiting for neural engine to detect anomalies...
              </p>
            )}
            {alerts.map((alert, i) => (
              <div key={i} className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-start">
                  <span className="font-mono text-xs text-red-400 font-bold">{alert.ip}</span>
                  <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                    {alert.time}ms
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-slate-400 flex justify-between">
                  <span>Status: {alert.status}</span>
                  <span className="opacity-50">Anomaly Detected</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}