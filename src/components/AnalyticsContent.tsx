'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
  Area, AreaChart,
} from 'recharts';

interface ChartPoint { label: string; value: number; }
interface UserStats {
  total_queries?: number; user_queries?: number; queries_today?: number;
  questions_today?: number; avg_response_time?: number; avg_response_time_ms?: number;
  average_response_time?: number; total_documents?: number; user_docs?: number;
  most_active_day?: string; docs_ready?: number; docs_processing?: number;
  queries_count?: number; today_queries?: number; queries_count_today?: number;
  docs_count?: number; total?: number; [key: string]: unknown;
}
interface QueryHistoryItem {
  question?: string; query?: string;
  created_at?: string; timestamp?: string; response_time?: number;
}

const API = 'https://prismai-backend-3hsi.onrender.com';

// ── Indigo palette (light-mode) ───────────────────────────────────────────────
const C = {
  pageBg:    '#f5f5ff',
  cardBg:    '#ffffff',
  border:    '#e0e7ff',
  borderHov: '#c7d2fe',
  i50:  '#eef2ff',
  i100: '#e0e7ff',
  i200: '#c7d2fe',
  i300: '#a5b4fc',
  i400: '#818cf8',
  i500: '#6366f1',
  i600: '#4f46e5',
  i700: '#4338ca',
  i800: '#3730a3',
  i900: '#312e81',
  text:    '#1e1b4b',
  textSub: '#6b7280',
  textMid: '#374151',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractLabel(item: Record<string, unknown>): string {
  return String(item.date ?? item.day ?? item.created_at ?? item.timestamp ?? item.label ?? item.name ?? item.period ?? '');
}
function extractQueryValue(item: Record<string, unknown>): number {
  for (const k of ['count','queries','num_queries','query_count','total_queries','total','value'])
    if (item[k] != null && !isNaN(Number(item[k]))) return Number(item[k]);
  return 0;
}
function extractResponseValue(item: Record<string, unknown>): number {
  for (const k of ['avg_response_time','avg_response_time_ms','average_response_time','avg_ms','response_time','latency','avg_latency','average_ms','mean_response_time']) {
    const v = item[k]; if (v != null && !isNaN(Number(v))) return Number(v);
  }
  return 0;
}
function toChartData(raw: unknown, type: 'queries'|'response' = 'queries'): ChartPoint[] {
  if (!raw) return [];
  const ex = type === 'response' ? extractResponseValue : extractQueryValue;
  if (Array.isArray(raw))
    return (raw as Record<string,unknown>[]).map(i=>({label:extractLabel(i),value:ex(i)})).filter(d=>d.label!==''&&!isNaN(d.value));
  const obj = raw as Record<string,unknown>;
  for (const k of ['data','result','records']) if (obj[k]&&Array.isArray(obj[k])) return toChartData(obj[k],type);
  const ak = Object.keys(obj).find(k=>Array.isArray(obj[k]));
  if (ak) return toChartData(obj[ak],type);
  return Object.entries(obj).map(([k,v])=>({label:k,value:Number(v)||0}));
}
function fmtDate(label: string): string {
  if (!label||label==='—') return label;
  const p = Date.parse(label); if (isNaN(p)) return label;
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(p);
}
function safeVal(v: number|string|undefined|null, fmt?: (n:number)=>string): string {
  if (v==null) return '—'; if (typeof v==='string') return v||'—';
  return fmt ? fmt(v) : String(v);
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
const ChartTooltip = ({active,payload,label,unit=''}: any) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{background:'#fff',padding:'10px 14px',borderRadius:10,border:`1.5px solid ${C.i200}`,boxShadow:`0 8px 24px rgba(99,102,241,0.15)`}}>
      <p style={{margin:0,fontSize:10,color:C.i500,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em'}}>{fmtDate(label)}</p>
      <p style={{margin:'3px 0 0',fontSize:22,fontWeight:800,color:C.i700,lineHeight:1}}>
        {payload[0].value}{unit&&<span style={{fontSize:12,color:C.i400,marginLeft:4,fontWeight:600}}>{unit}</span>}
      </p>
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({icon,label,value,sub,accent,accentBg,trend}:{
  icon:string;label:string;value:string;sub:string;
  accent:string;accentBg:string;trend?:string;
}) {
  const [hov,setHov]=useState(false);
  const empty = value==='—';
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      position:'relative', overflow:'hidden', borderRadius:18, padding:'22px 20px 18px',
      background: hov ? C.i50 : C.cardBg,
      border:`1.5px solid ${hov?C.i300:C.i100}`,
      boxShadow: hov ? `0 8px 24px rgba(99,102,241,0.14)` : `0 1px 4px rgba(99,102,241,0.07)`,
      transition:'all 0.22s cubic-bezier(.4,0,.2,1)', cursor:'default',
    }}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${accent},${accent}88)`}} />

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div style={{
          width:40,height:40,borderRadius:11,
          background:accentBg, border:`1.5px solid ${accent}25`,
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.15rem',
        }}>{icon}</div>
        {trend&&(
          <div style={{
            fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:7,
            color:trend.startsWith('+')?'#059669':'#dc2626',
            background:trend.startsWith('+')?'#d1fae5':'#fee2e2',
            border:`1px solid ${trend.startsWith('+')?'#a7f3d0':'#fecaca'}`,
          }}>{trend}</div>
        )}
      </div>

      <div style={{
        fontSize:empty?'1.5rem':'2.15rem', fontWeight:800,
        color:empty?'#d1d5db':C.text,
        letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:5,
        fontFamily:"'JetBrains Mono','Fira Mono',monospace",
      }}>{value}</div>

      <div style={{fontSize:11,fontWeight:700,color:C.textMid,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:2}}>{label}</div>
      <div style={{fontSize:12,color:C.textSub}}>{sub}</div>
    </div>
  );
}

// ── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({children}: {children:React.ReactNode}) {
  return (
    <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:C.i500,margin:'0 0 14px',display:'flex',alignItems:'center',gap:10}}>
      <span style={{width:16,height:2.5,borderRadius:2,background:`linear-gradient(90deg,${C.i500},${C.i300})`,display:'inline-block'}} />
      {children}
      <span style={{flex:1,height:1,background:`linear-gradient(90deg,${C.i200},transparent)`,display:'inline-block'}} />
    </div>
  );
}

// ── Chart Card ────────────────────────────────────────────────────────────────
function ChartCard({title,badge,badgeAccent=C.i600,desc,rightNode,children,empty,emptyIcon}:{
  title:string;badge?:string;badgeAccent?:string;
  desc?:string;rightNode?:React.ReactNode;
  children:React.ReactNode;empty:boolean;emptyIcon?:string;
}) {
  return (
    <div style={{
      background:C.cardBg, borderRadius:18, padding:'22px 24px 20px',
      border:`1.5px solid ${C.i100}`,
      boxShadow:'0 2px 12px rgba(99,102,241,0.07)',
      position:'relative',overflow:'hidden',
    }}>
      <div style={{position:'absolute',top:0,left:'15%',right:'15%',height:1.5,background:`linear-gradient(90deg,transparent,${C.i300},transparent)`}} />

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:9,flexWrap:'wrap'}}>
            <span style={{fontSize:16,fontWeight:700,color:C.text,letterSpacing:'-0.02em'}}>{title}</span>
            {badge&&(
              <span style={{
                fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:5,
                background:badgeAccent,color:'#fff',
                letterSpacing:'0.07em',textTransform:'uppercase',
              }}>{badge}</span>
            )}
          </div>
          {desc&&<p style={{margin:'4px 0 0',fontSize:12,color:C.textSub}}>{desc}</p>}
        </div>
        {rightNode}
      </div>

      {empty ? (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:240,gap:12}}>
          <div style={{
            width:52,height:52,borderRadius:14,
            background:C.i50,border:`1.5px solid ${C.i200}`,
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem',
          }}>{emptyIcon??'📊'}</div>
          <span style={{fontSize:13,fontWeight:500,color:C.textSub}}>No data available yet</span>
        </div>
      ):children}
    </div>
  );
}

// ── History Row ───────────────────────────────────────────────────────────────
function HistoryRow({q,i}:{q:QueryHistoryItem;i:number}) {
  const [hov,setHov]=useState(false);
  const rawTs=q.created_at??q.timestamp;
  const tsStr=rawTs ? (()=>{
    const p=Date.parse(rawTs); if(isNaN(p)) return `#${i+1}`;
    return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(p);
  })() : `#${i+1}`;

  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      padding:'11px 14px',
      background: hov ? C.i50 : C.cardBg,
      border:`1.5px solid ${hov?C.i200:C.border}`,
      borderRadius:10,display:'flex',alignItems:'flex-start',gap:12,
      transition:'all 0.15s ease',cursor:'default',
    }}>
      <span style={{
        fontSize:10,fontWeight:800,color:C.i600,
        background:C.i50,border:`1.5px solid ${C.i200}`,
        borderRadius:6,padding:'2px 7px',whiteSpace:'nowrap',flexShrink:0,
        fontFamily:"'JetBrains Mono',monospace",letterSpacing:'0.04em',
      }}>#{String(i+1).padStart(2,'0')}</span>
      <span style={{flex:1,fontSize:13,color:C.textMid,lineHeight:1.55,fontWeight:500}}>
        {q.question??q.query??'—'}
      </span>
      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5,flexShrink:0}}>
        <span style={{fontSize:11,color:C.textSub,fontWeight:500,whiteSpace:'nowrap'}}>{tsStr}</span>
        {q.response_time!=null&&(
          <span style={{
            fontSize:10,fontWeight:700,borderRadius:5,padding:'2px 6px',
            background:q.response_time<500?'#d1fae5':'#fff7ed',
            color:q.response_time<500?'#059669':'#d97706',
            border:`1px solid ${q.response_time<500?'#a7f3d0':'#fde68a'}`,
          }}>{q.response_time}ms</span>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AnalyticsContent() {
  const [userStats,    setUserStats]    = useState<UserStats|null>(null);
  const [queriesPerDay,setQueriesPerDay]= useState<unknown>(null);
  const [responseTimes,setResponseTimes]= useState<unknown>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [lastRefresh,  setLastRefresh]  = useState('');
  const [refreshing,   setRefreshing]   = useState(false);

  const fetchAll = useCallback(async (silent=false) => {
    if (!silent) setLoading(true);
    setRefreshing(true); setError('');
    const token = typeof window!=='undefined' ? localStorage.getItem('token') : null;
    if (!token) { setError('Not logged in — please log in to view analytics.'); setLoading(false); setRefreshing(false); return; }
    const headers: Record<string,string> = { Authorization:`Bearer ${token}`, 'Content-Type':'application/json' };
    const safeFetch = async (url:string) => {
      try {
        const res = await fetch(url,{headers});
        if (res.status===401) { setError('Session expired — please log in again.'); return null; }
        if (!res.ok) { console.warn(`[analytics] ${res.status} ${url}`); return null; }
        const text = await res.text(); if (!text?.trim()) return null;
        try { const j=JSON.parse(text); return j?.data??j?.result??j; } catch(e) { return null; }
      } catch(e) { return null; }
    };
    const [statsData,qpdData,rtData,histData] = await Promise.all([
      safeFetch(`${API}/analytics/user-stats`),
      safeFetch(`${API}/analytics/queries-per-day`),
      safeFetch(`${API}/analytics/response-times`),
      safeFetch(`${API}/analytics/query-history?limit=20`),
    ]);
    if (statsData&&typeof statsData==='object') setUserStats(((statsData as any).data??statsData) as UserStats);
    if (qpdData!==null) setQueriesPerDay(qpdData);
    if (rtData!==null)  setResponseTimes(rtData);
    if (histData) {
      let list: QueryHistoryItem[]=[];
      if (Array.isArray(histData)) list=histData;
      else if (typeof histData==='object') { const o=histData as any; list=o.history??o.queries??o.items??o.records??[]; }
      setQueryHistory(Array.isArray(list)?list:[]);
    }
    if (!statsData&&!qpdData&&!rtData) setError('Could not reach the backend — make sure it is running on port 8000.');
    setLastRefresh(new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));
    setLoading(false); setRefreshing(false);
  },[]);

  useEffect(()=>{ fetchAll(); },[fetchAll]);

  const queriesChartData = useMemo(()=>{
    if (!queryHistory.length) return [];
    const g: Record<string,number>={};
    queryHistory.forEach(item=>{
      const rd=item.created_at||item.timestamp; if(!rd) return;
      const d=new Date(rd).toLocaleDateString(); g[d]=(g[d]||0)+1;
    });
    return Object.entries(g).map(([date,count])=>({label:date,value:count}));
  },[queryHistory]);

  const calculatedTotalQueries = useMemo(()=>{
    if (queriesChartData.length) return queriesChartData.reduce((s,d)=>s+d.value,0);
    const f=userStats?.total_queries??userStats?.user_queries??userStats?.queries_count??userStats?.total;
    return f?Number(f):0;
  },[queriesChartData,userStats]);

  const responseChartData = useMemo(()=>
    toChartData(responseTimes,'response').map(d=>({...d,label:fmtDate(d.label),value:Math.round(d.value)})),
    [responseTimes]
  );

  const calculatedAvgLatency = useMemo(()=>{
    if (responseChartData.length) return Math.round(responseChartData.reduce((s,d)=>s+d.value,0)/responseChartData.length);
    const f=userStats?.avg_response_time??userStats?.avg_response_time_ms??userStats?.average_response_time;
    return f?Math.round(Number(f)):null;
  },[responseChartData,userStats]);

  const totalDocs = userStats?.total_documents??userStats?.user_docs??(userStats?.docs_count as number|undefined);

  const statCards = [
    { icon:'💬', label:'Total Queries',   value:safeVal(calculatedTotalQueries), sub:'all time data',          accent:C.i600,   accentBg:C.i50 },
    { icon:'⚡', label:'Avg Response',    value:safeVal(calculatedAvgLatency,n=>`${n.toFixed(0)}ms`), sub:'average system latency', accent:'#7c3aed', accentBg:'#f5f3ff' },
    { icon:'📄', label:'Documents',       value:safeVal(totalDocs),              sub:'uploaded to system',     accent:'#0891b2', accentBg:'#ecfeff' },
    { icon:'📆', label:'Most Active Day', value:userStats?.most_active_day?fmtDate(userStats.most_active_day):'—', sub:'peak usage threshold', accent:'#d97706', accentBg:'#fffbeb' },
  ];

  if (loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',gap:16,background:C.pageBg,fontFamily:"'Outfit',system-ui,sans-serif"}}>
      <div style={{width:38,height:38,border:`3px solid ${C.i100}`,borderTopColor:C.i500,borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />
      <p style={{margin:0,fontWeight:600,color:C.i600,fontSize:14}}>Loading Analytics…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );

  return (
    <div style={{
      padding:'2.5rem 1.5rem 5rem',
      minHeight:'100vh',
      background:C.pageBg,
      fontFamily:"'Outfit','DM Sans',system-ui,sans-serif",
      position:'relative',
    }}>
      {/* subtle indigo dot grid */}
      <div style={{
        position:'fixed',inset:0,zIndex:0,pointerEvents:'none',
        backgroundImage:`radial-gradient(${C.i200} 1px, transparent 1px)`,
        backgroundSize:'28px 28px', opacity:0.5,
      }} />

      <div style={{maxWidth:1200,margin:'0 auto',position:'relative',zIndex:1}}>

        {/* ── Header ── */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'2.5rem',flexWrap:'wrap',gap:16}}>
          <div>
            <div style={{
              display:'inline-flex',alignItems:'center',gap:6,
              fontSize:10,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',
              color:C.i600, background:C.i50, border:`1.5px solid ${C.i200}`,
              borderRadius:6, padding:'4px 10px', marginBottom:8,
            }}>
              <span style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 6px #22c55e80'}} />
              Dashboard Workspace
            </div>
            <h2 style={{
              margin:0,fontSize:'2.4rem',fontWeight:800,
              letterSpacing:'-0.03em',lineHeight:1.15,
              background:`linear-gradient(135deg,${C.i800} 0%,${C.i600} 45%,#7c3aed 100%)`,
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            }}>
              Analytics &amp; Insights
            </h2>
            <p style={{margin:'6px 0 0',fontSize:13,color:C.textSub,fontWeight:500}}>
              {lastRefresh?`Last refreshed at ${lastRefresh}`:'Fetching live data…'}
            </p>
          </div>

          <button
            onClick={()=>fetchAll(true)} disabled={refreshing}
            style={{
              display:'flex',alignItems:'center',gap:8,padding:'10px 20px',
              background:refreshing?C.i50:C.cardBg,
              border:`1.5px solid ${refreshing?C.i200:C.i300}`,
              borderRadius:10,fontSize:13,fontWeight:600,
              color:refreshing?C.i400:C.i600,cursor:refreshing?'not-allowed':'pointer',
              boxShadow:`0 1px 4px rgba(99,102,241,0.1)`,
              transition:'all 0.2s ease',
            }}
            onMouseEnter={e=>{ if(!refreshing){e.currentTarget.style.background=C.i50; e.currentTarget.style.borderColor=C.i400; e.currentTarget.style.boxShadow=`0 4px 12px rgba(99,102,241,0.18)`;}}}
            onMouseLeave={e=>{ e.currentTarget.style.background=C.cardBg; e.currentTarget.style.borderColor=C.i300; e.currentTarget.style.boxShadow=`0 1px 4px rgba(99,102,241,0.1)`;}}
          >
            <span style={{display:'inline-block',animation:refreshing?'spin 1s linear infinite':'none',fontSize:15}}>↻</span>
            {refreshing?'Refreshing…':'Refresh'}
          </button>
        </div>

        {/* ── Error ── */}
        {error&&(
          <div style={{background:'#fef2f2',border:'1.5px solid #fecaca',color:'#b91c1c',padding:'13px 18px',borderRadius:12,fontSize:13,marginBottom:'2rem',display:'flex',alignItems:'center',gap:10,fontWeight:500}}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div style={{marginBottom:'2.5rem'}}>
          <SectionLabel>Key Performance Metrics</SectionLabel>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:16}}>
            {statCards.map(c=><StatCard key={c.label} {...c} />)}
          </div>
        </div>

        {/* ── Queries Chart ── */}
        <div style={{marginBottom:'1.5rem'}}>
          <SectionLabel>Activity Analytics</SectionLabel>
          <ChartCard
            title="Queries Profile" badge="Volume" badgeAccent={C.i600}
            desc="Total volume of analytics requests submitted on a daily axis"
            empty={queriesChartData.length===0} emptyIcon="📊"
            rightNode={calculatedTotalQueries>0?(
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'1.9rem',fontWeight:800,color:C.i700,letterSpacing:'-0.04em',lineHeight:1,fontFamily:"'JetBrains Mono',monospace"}}>{calculatedTotalQueries}</div>
                <div style={{fontSize:9,color:C.textSub,fontWeight:700,textTransform:'uppercase',marginTop:4,letterSpacing:'0.08em'}}>Total This Month</div>
              </div>
            ):null}
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={queriesChartData} margin={{top:10,right:10,left:-20,bottom:0}}>
                <defs>
                  <linearGradient id="qGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={C.i500} stopOpacity={0.22}/>
                    <stop offset="100%" stopColor={C.i500} stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.i100} vertical={false}/>
                <XAxis dataKey="label" tick={{fontSize:11,fill:C.textSub}} tickLine={false} axisLine={false}/>
                <YAxis tick={{fontSize:11,fill:C.textSub}} tickLine={false} axisLine={false} width={36}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Area type="monotone" dataKey="value" stroke={C.i500} strokeWidth={2.5} fill="url(#qGrad)"
                  dot={{r:4,strokeWidth:2,fill:'#fff',stroke:C.i500}}
                  activeDot={{r:6,fill:C.i500,stroke:'#fff',strokeWidth:2}}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── Response Chart ── */}
        <div style={{marginBottom:'1.5rem'}}>
          <SectionLabel>Response Assessment</SectionLabel>
          <ChartCard
            title="System Speed Profile" badge="Latency" badgeAccent="#7c3aed"
            desc="Average backend engine latency calculated dynamically (milliseconds)"
            empty={responseChartData.length===0} emptyIcon="⚡"
            rightNode={calculatedAvgLatency!==null?(
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:'1.9rem',fontWeight:800,color:'#7c3aed',letterSpacing:'-0.04em',lineHeight:1,fontFamily:"'JetBrains Mono',monospace"}}>
                  {calculatedAvgLatency}<span style={{fontSize:'1rem',color:'#7c3aed',marginLeft:3,fontWeight:600}}>ms</span>
                </div>
                <div style={{fontSize:9,color:C.textSub,fontWeight:700,textTransform:'uppercase',marginTop:4,letterSpacing:'0.08em'}}>Rolling Average</div>
              </div>
            ):null}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={responseChartData} margin={{top:10,right:10,left:-20,bottom:0}}>
                <defs>
                  <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#8b5cf6" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#c4b5fd" stopOpacity={0.5}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.i100} vertical={false}/>
                <XAxis dataKey="label" tick={{fontSize:11,fill:C.textSub}} tickLine={false} axisLine={false}
                  interval={responseChartData.length>12?Math.floor(responseChartData.length/8):0}/>
                <YAxis tick={{fontSize:11,fill:C.textSub}} tickLine={false} axisLine={false} width={45}
                  tickFormatter={v=>v>=1000?`${(v/1000).toFixed(1)}s`:`${v}ms`}/>
                <Tooltip content={<ChartTooltip unit="ms"/>} cursor={{fill:`${C.i100}80`}}/>
                {calculatedAvgLatency!==null&&(
                  <ReferenceLine y={calculatedAvgLatency} stroke="#7c3aed" strokeDasharray="5 4" strokeWidth={1.5}
                    label={{value:`Avg: ${calculatedAvgLatency}ms`,position:'insideTopRight',fontSize:10,fill:'#7c3aed',fontWeight:700,offset:10}}/>
                )}
                <Bar dataKey="value" fill="url(#rGrad)" radius={[5,5,0,0]} maxBarSize={36}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── History ── */}
        <div>
          <SectionLabel>Historical Archive</SectionLabel>
          <ChartCard title="Real-time Queries Log" desc="Complete chronological layout of user submitted inputs" empty={queryHistory.length===0} emptyIcon="📜">
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {queryHistory.slice(0,15).map((q,i)=><HistoryRow key={i} q={q} i={i}/>)}
            </div>
            {queryHistory.length>15&&(
              <div style={{marginTop:14,textAlign:'center',fontSize:12,color:C.textSub,fontWeight:600}}>
                Showing most recent 15 of {queryHistory.length} entries
              </div>
            )}
          </ChartCard>
        </div>

      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg);}}
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600;700;800&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:6px;}
        ::-webkit-scrollbar-track{background:#f5f5ff;}
        ::-webkit-scrollbar-thumb{background:${C.i200};border-radius:3px;}
        ::-webkit-scrollbar-thumb:hover{background:${C.i400};}
      `}</style>
    </div>
  );
}