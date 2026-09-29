import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { DailyAqiTrend } from '../types';
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3, Clock, Sparkles } from 'lucide-react';

interface D3AqiTrendsChartProps {
  data: DailyAqiTrend[];
  hourlyHistory?: {
    time: string[];
    usAqi: (number | null)[];
    pm2_5: (number | null)[];
  };
  locationName: string;
}

export const D3AqiTrendsChart: React.FC<D3AqiTrendsChartProps> = ({
  data,
  hourlyHistory,
  locationName
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [viewMode, setViewMode] = useState<'daily' | 'hourly'>('daily');
  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    aqi: number;
    pm25?: number;
    category: string;
    color: string;
    date: string;
  } | null>(null);

  // Fallback 7-day mock data if data is empty
  const chartData = useMemo(() => {
    if (data && data.length > 0) return data;
    // Default 7 days if not yet cached
    const now = Date.now();
    return Array.from({ length: 7 }, (_, i) => {
      const dayOffset = 6 - i;
      const d = new Date(now - dayOffset * 86400000);
      const sampleAqi = Math.round(75 + Math.sin(i * 1.3) * 45);
      return {
        date: d.toISOString().split('T')[0],
        dayLabel: d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
        avgAqi: sampleAqi,
        maxAqi: Math.round(sampleAqi * 1.2),
        minAqi: Math.round(sampleAqi * 0.8),
        avgPm25: Math.round(sampleAqi * 0.45 * 10) / 10,
        category: sampleAqi <= 50 ? 'Good' : sampleAqi <= 100 ? 'Moderate' : sampleAqi <= 150 ? 'Unhealthy for Sensitive Groups' : 'Unhealthy',
        color: sampleAqi <= 50 ? '#10B981' : sampleAqi <= 100 ? '#84CC16' : sampleAqi <= 150 ? '#F59E0B' : '#EF4444',
        timestamp: d.getTime()
      };
    });
  }, [data]);

  // Hourly points for continuous mode
  const continuousHourlyData = useMemo(() => {
    if (!hourlyHistory || !hourlyHistory.time || hourlyHistory.time.length === 0) return [];
    return hourlyHistory.time.map((t, idx) => ({
      date: new Date(t),
      aqi: hourlyHistory.usAqi[idx] ?? 50,
      pm25: hourlyHistory.pm2_5[idx] ?? 25
    })).filter(d => !isNaN(d.date.getTime()));
  }, [hourlyHistory]);

  // Key stats
  const stats = useMemo(() => {
    const aqiVals = chartData.map(d => d.avgAqi);
    const avg = Math.round(aqiVals.reduce((a, b) => a + b, 0) / (aqiVals.length || 1));
    const max = Math.max(...aqiVals);
    const min = Math.min(...aqiVals);
    const cleanDays = chartData.filter(d => d.avgAqi <= 100).length;

    // Trend: compare first 3 days average vs last 3 days average
    const firstHalf = aqiVals.slice(0, 3);
    const secondHalf = aqiVals.slice(-3);
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1);
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / (secondHalf.length || 1);
    const diff = avgSecond - avgFirst;

    return {
      avg,
      max,
      min,
      cleanDays,
      trend: diff > 15 ? 'worsening' : diff < -15 ? 'improving' : 'stable'
    };
  }, [chartData]);

  // Render D3 chart
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerRef.current.clientWidth || 700;
    const height = 300;
    const margin = { top: 25, right: 30, bottom: 40, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height);

    // Defs for Gradients & Filters
    const defs = svg.append('defs');

    // AQI Multi-Stop Vertical Gradient
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'aqiAreaGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#EF4444').attr('stop-opacity', 0.45);
    gradient.append('stop').attr('offset', '40%').attr('stop-color', '#F59E0B').attr('stop-opacity', 0.35);
    gradient.append('stop').attr('offset', '70%').attr('stop-color', '#84CC16').attr('stop-opacity', 0.25);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#10B981').attr('stop-opacity', 0.05);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Grid lines
    const yGridMax = Math.max(220, Math.ceil(stats.max / 50) * 50);
    const yScale = d3.scaleLinear().domain([0, yGridMax]).range([innerHeight, 0]);

    // Horizontal grid lines
    const yTicks = [50, 100, 150, 200];
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#334155')
      .attr('stroke-dasharray', '3 3')
      .attr('stroke-opacity', 0.4);

    // WHO Reference Baseline (50 AQI threshold)
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(50))
      .attr('y2', yScale(50))
      .attr('stroke', '#10B981')
      .attr('stroke-dasharray', '4 4')
      .attr('stroke-width', 1.2)
      .attr('opacity', 0.7);

    g.append('text')
      .attr('x', innerWidth - 8)
      .attr('y', yScale(50) - 5)
      .attr('text-anchor', 'end')
      .attr('fill', '#10B981')
      .attr('font-size', '9px')
      .attr('font-family', 'sans-serif')
      .text('WHO / Good Baseline (50 AQI)');

    // ---------------- Daily View Mode ----------------
    if (viewMode === 'daily') {
      const xScale = d3
        .scalePoint<string>()
        .domain(chartData.map(d => d.dayLabel))
        .range([20, innerWidth - 20]);

      // D3 Area Generator
      const areaGen = d3
        .area<DailyAqiTrend>()
        .x(d => xScale(d.dayLabel) ?? 0)
        .y0(innerHeight)
        .y1(d => yScale(d.avgAqi))
        .curve(d3.curveMonotoneX);

      // D3 Line Generator
      const lineGen = d3
        .line<DailyAqiTrend>()
        .x(d => xScale(d.dayLabel) ?? 0)
        .y(d => yScale(d.avgAqi))
        .curve(d3.curveMonotoneX);

      // Render Area Path
      g.append('path')
        .datum(chartData)
        .attr('fill', 'url(#aqiAreaGradient)')
        .attr('d', areaGen);

      // Render Main Trend Curve
      const linePath = g
        .append('path')
        .datum(chartData)
        .attr('fill', 'none')
        .attr('stroke', '#2DD4BF')
        .attr('stroke-width', 3)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('d', lineGen);

      // Animate line stroke
      const totalLength = (linePath.node() as SVGPathElement)?.getTotalLength() || 1000;
      linePath
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(900)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);

      // Range bars for Min-Max spread per day
      g.selectAll('.range-bar')
        .data(chartData)
        .enter()
        .append('line')
        .attr('x1', d => xScale(d.dayLabel) ?? 0)
        .attr('x2', d => xScale(d.dayLabel) ?? 0)
        .attr('y1', d => yScale(d.minAqi))
        .attr('y2', d => yScale(d.maxAqi))
        .attr('stroke', '#64748B')
        .attr('stroke-width', 2)
        .attr('opacity', 0.5);

      // Interactive Data Point Circles
      const points = g
        .selectAll('.point')
        .data(chartData)
        .enter()
        .append('g')
        .attr('class', 'point')
        .attr('transform', d => `translate(${xScale(d.dayLabel) ?? 0},${yScale(d.avgAqi)})`);

      points
        .append('circle')
        .attr('r', 5.5)
        .attr('fill', d => d.color)
        .attr('stroke', '#0F172A')
        .attr('stroke-width', 2.5)
        .attr('cursor', 'pointer');

      // Value labels above points
      points
        .append('text')
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#E2E8F0')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'monospace')
        .text(d => d.avgAqi);

      // Transparent hover overlay to track closest point
      const bisect = d3.bisector((d: DailyAqiTrend) => xScale(d.dayLabel) ?? 0).center;

      svg
        .append('rect')
        .attr('transform', `translate(${margin.left},${margin.top})`)
        .attr('width', innerWidth)
        .attr('height', innerHeight)
        .attr('fill', 'transparent')
        .attr('cursor', 'crosshair')
        .on('mousemove', function (event) {
          const [mx] = d3.pointer(event);
          const index = Math.round((mx / innerWidth) * (chartData.length - 1));
          const boundedIdx = Math.max(0, Math.min(chartData.length - 1, index));
          const p = chartData[boundedIdx];
          setHoveredPoint({
            label: p.dayLabel,
            aqi: p.avgAqi,
            pm25: p.avgPm25,
            category: p.category,
            color: p.color,
            date: p.date
          });
        })
        .on('mouseleave', () => setHoveredPoint(null));

      // X Axis
      const xAxis = d3.axisBottom(xScale).tickSize(0).tickPadding(12);
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis)
        .attr('color', '#94A3B8')
        .selectAll('text')
        .attr('font-size', '11px')
        .attr('font-family', 'sans-serif');
    }

    // ---------------- Continuous Hourly View Mode ----------------
    else if (viewMode === 'hourly' && continuousHourlyData.length > 0) {
      const xTimeScale = d3
        .scaleTime()
        .domain(d3.extent(continuousHourlyData, d => d.date) as [Date, Date])
        .range([0, innerWidth]);

      const areaHourly = d3
        .area<{ date: Date; aqi: number }>()
        .x(d => xTimeScale(d.date))
        .y0(innerHeight)
        .y1(d => yScale(d.aqi))
        .curve(d3.curveMonotoneX);

      const lineHourly = d3
        .line<{ date: Date; aqi: number }>()
        .x(d => xTimeScale(d.date))
        .y(d => yScale(d.aqi))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(continuousHourlyData)
        .attr('fill', 'url(#aqiAreaGradient)')
        .attr('d', areaHourly);

      g.append('path')
        .datum(continuousHourlyData)
        .attr('fill', 'none')
        .attr('stroke', '#38BDF8')
        .attr('stroke-width', 2)
        .attr('d', lineHourly);

      // Hourly Hover tracker
      svg
        .append('rect')
        .attr('transform', `translate(${margin.left},${margin.top})`)
        .attr('width', innerWidth)
        .attr('height', innerHeight)
        .attr('fill', 'transparent')
        .attr('cursor', 'crosshair')
        .on('mousemove', function (event) {
          const [mx] = d3.pointer(event);
          const hoveredDate = xTimeScale.invert(mx);
          const bisector = d3.bisector((d: { date: Date }) => d.date).center;
          const idx = bisector(continuousHourlyData, hoveredDate);
          const p = continuousHourlyData[idx];
          if (p) {
            setHoveredPoint({
              label: p.date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
              aqi: p.aqi,
              pm25: p.pm25,
              category: p.aqi <= 50 ? 'Good' : p.aqi <= 100 ? 'Moderate' : p.aqi <= 150 ? 'Sensitive' : 'Unhealthy',
              color: p.aqi <= 50 ? '#10B981' : p.aqi <= 100 ? '#84CC16' : p.aqi <= 150 ? '#F59E0B' : '#EF4444',
              date: p.date.toLocaleDateString()
            });
          }
        })
        .on('mouseleave', () => setHoveredPoint(null));

      // X Axis (Time)
      const xAxisHourly = d3
        .axisBottom<Date>(xTimeScale)
        .ticks(7)
        .tickFormat(d => d3.timeFormat('%a %d')(d as Date))
        .tickSize(0)
        .tickPadding(12);

      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxisHourly)
        .attr('color', '#94A3B8')
        .selectAll('text')
        .attr('font-size', '10px');
    }

    // Y Axis (AQI values)
    const yAxis = d3.axisLeft(yScale).ticks(5).tickSize(0).tickPadding(8);
    g.append('g')
      .call(yAxis)
      .attr('color', '#94A3B8')
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Remove domain axis lines for ultra-modern minimal look
    g.selectAll('.domain').remove();

  }, [chartData, continuousHourlyData, viewMode, stats]);

  return (
    <div className="bg-slate-900/95 border border-teal-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-5">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  7-Day Air Quality Index (AQI) Historical Trends
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono font-bold uppercase border border-teal-500/40">
                  D3 Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-day numerical trajectory based on Open-Meteo CAMS atmospheric model cached archives for <strong className="text-slate-200">{locationName}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* View Toggle Buttons */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'daily'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Daily Min-Max</span>
          </button>
          <button
            onClick={() => setViewMode('hourly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'hourly'
                ? 'bg-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>168-Hour Continuous</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            7-Day Mean AQI
          </span>
          <div className="text-2xl font-black font-mono text-white mt-0.5">
            {stats.avg}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Average Exposure</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Peak Recorded AQI
          </span>
          <div className="text-2xl font-black font-mono text-amber-400 mt-0.5">
            {stats.max}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Worst Day Spike</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Clean Air Days (≤100)
          </span>
          <div className="text-2xl font-black font-mono text-emerald-400 mt-0.5">
            {stats.cleanDays} <span className="text-xs text-slate-500 font-normal">/ 7 Days</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Acceptable Air</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Weekly Trajectory
          </span>
          <div className="flex items-center gap-1.5 mt-1 font-bold text-sm">
            {stats.trend === 'improving' ? (
              <>
                <TrendingDown className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Improving (-Δ)</span>
              </>
            ) : stats.trend === 'worsening' ? (
              <>
                <TrendingUp className="w-4 h-4 text-red-400" />
                <span className="text-red-400">Deteriorating (+Δ)</span>
              </>
            ) : (
              <>
                <Minus className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">Stable</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Aerosol Dynamics</span>
        </div>
      </div>

      {/* D3 SVG Container with Live Hover Tooltip */}
      <div ref={containerRef} className="relative w-full overflow-hidden">
        <svg ref={svgRef} className="w-full select-none" />

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div className="absolute top-2 right-4 bg-slate-950/95 border border-slate-700/80 rounded-2xl p-3 shadow-2xl text-xs space-y-1 pointer-events-none animate-fadeIn">
            <div className="font-semibold text-white flex items-center justify-between gap-4">
              <span>{hoveredPoint.label}</span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                style={{ backgroundColor: `${hoveredPoint.color}25`, color: hoveredPoint.color }}
              >
                {hoveredPoint.category}
              </span>
            </div>
            <div className="flex items-center gap-3 pt-1 text-slate-300 font-mono">
              <span>AQI: <strong className="text-white">{hoveredPoint.aqi}</strong></span>
              {hoveredPoint.pm25 != null && (
                <span>PM2.5: <strong className="text-teal-400">{hoveredPoint.pm25} µg/m³</strong></span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Legend and Info Bar */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>
            Hover over the curve to inspect daily or hourly PM2.5 and AQI values. The dashed emerald line denotes the <strong>WHO Good Air Standard (50 AQI)</strong>.
          </span>
        </div>
        <div className="text-slate-500 font-mono text-[10px] shrink-0">
          Source: Open-Meteo CAMS Model Past Cache
        </div>
      </div>
    </div>
  );
};
