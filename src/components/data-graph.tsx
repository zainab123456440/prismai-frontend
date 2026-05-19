'use client';

/**
 * DataGraph — lightweight chart primitives re-used across the app.
 * Import these in analytics-content.tsx (or anywhere) for consistent styling.
 */

import React from 'react';
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChartPoint { label: string; value: number; }

// ── Shared tooltip ────────────────────────────────────────────────────────────

export const DataTooltip = ({ active, payload, label, unit = '' }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0f0c29',
      padding: '10px 14px',
      borderRadius: 10,
      border: '1px solid rgba(139,92,246,0.3)',
      boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
    }}>
      <p style={{ margin: 0, fontSize: 10, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </p>
      <p style={{ margin: '4px 0 0', fontSize: 17, fontWeight: 800, color: '#fff' }}>
        {payload[0].value}
        {unit && <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 500, marginLeft: 4 }}>{unit}</span>}
      </p>
    </div>
  );
};

// ── Area / Line chart ─────────────────────────────────────────────────────────

interface AreaGraphProps {
  data: ChartPoint[];
  color?: string;
  unit?: string;
  height?: number;
  gradientId?: string;
}

export function AreaGraph({
  data,
  color = '#7c3aed',
  unit = '',
  height = 280,
  gradientId = 'areaGrad',
}: AreaGraphProps) {
  if (!data.length) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4b5fd', fontSize: 13 }}>
      No data yet
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f0ff" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#c4b5fd', fontWeight: 600 }}
          tickLine={false} axisLine={false}
          interval={data.length > 15 ? 2 : 0}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#c4b5fd', fontWeight: 600 }}
          tickLine={false} axisLine={false} width={28}
        />
        <Tooltip content={<DataTooltip unit={unit} />} cursor={{ stroke: '#c084fc', strokeWidth: 1, strokeDasharray: '4 4' }} />
        <Area
          type="monotone" dataKey="value"
          stroke={color} strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={{ r: 3, fill: color, stroke: '#fff', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2.5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Bar chart ─────────────────────────────────────────────────────────────────

interface BarGraphProps {
  data: ChartPoint[];
  colorFrom?: string;
  colorTo?: string;
  unit?: string;
  height?: number;
  gradientId?: string;
  showAvgLine?: boolean;
  yTickFormatter?: (v: number) => string;
}

export function BarGraph({
  data,
  colorFrom = '#a855f7',
  colorTo   = '#7c3aed',
  unit      = '',
  height    = 280,
  gradientId = 'barGrad',
  showAvgLine = false,
  yTickFormatter,
}: BarGraphProps) {
  if (!data.length) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4b5fd', fontSize: 13 }}>
      No data yet
    </div>
  );

  const avg = data.reduce((s, d) => s + d.value, 0) / data.length;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={colorFrom} stopOpacity={1} />
            <stop offset="100%" stopColor={colorTo}   stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f9f0ff" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#c4b5fd', fontWeight: 600 }}
          tickLine={false} axisLine={false}
          interval={data.length > 15 ? 2 : 0}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#c4b5fd', fontWeight: 600 }}
          tickLine={false} axisLine={false} width={44}
          tickFormatter={yTickFormatter ?? ((v) => (unit ? `${v}${unit}` : String(v)))}
        />
        <Tooltip content={<DataTooltip unit={unit} />} cursor={{ fill: '#f5f3ff', opacity: 0.5 }} />
        {showAvgLine && (
          <ReferenceLine
            y={avg}
            stroke="#f0abfc"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            label={{ value: 'avg', position: 'insideTopRight', fontSize: 10, fill: '#c084fc' }}
          />
        )}
        <Bar dataKey="value" fill={`url(#${gradientId})`} radius={[8, 8, 0, 0]} maxBarSize={42} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Default export (for backward-compat import: import DataGraph from './data-graph') ──

const DataGraph = { AreaGraph, BarGraph, DataTooltip };
export default DataGraph;
