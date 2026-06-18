import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Invoice, StoreSettings } from '../types';
import { TrendingUp, Award, HelpCircle, AlertCircle } from 'lucide-react';

interface InteractiveChartsProps {
  invoices: Invoice[];
  settings: StoreSettings;
}

export const InteractiveCharts: React.FC<InteractiveChartsProps> = ({ invoices, settings }) => {
  const { t } = useTranslation();
  // 1. Calculate past 7 days sales trend
  const last7DaysTrend = useMemo(() => {
    const trend: { [key: string]: number } = {};
    const dateNames: string[] = [];

    // Initialize past 7 days keys
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      // Format as "السبت", "الأحد" etc. or dynamic date format
      const arDay = d.toLocaleDateString('ar-SA', { weekday: 'short' });
      trend[key] = 0;
      dateNames.push(arDay + ' ' + d.getDate());
    }

    invoices.forEach((inv) => {
      const invDateStr = inv.datetime.split('T')[0];
      if (trend[invDateStr] !== undefined) {
        trend[invDateStr] += inv.total;
      }
    });

    const dataPoints = Object.keys(trend).map((k, idx) => ({
      key: k,
      label: dateNames[idx],
      value: trend[k]
    }));

    const maxVal = Math.max(...dataPoints.map(d => d.value), 100);

    return { dataPoints, maxVal };
  }, [invoices]);

  // 3. Leaderboard of best-selling products
  const bestSellers = useMemo(() => {
    const leaderboard: { [key: string]: { name: string; qty: number; total: number } } = {};

    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        if (!leaderboard[item.productId]) {
          leaderboard[item.productId] = { name: item.name, qty: 0, total: 0 };
        }
        leaderboard[item.productId].qty += item.quantity;
        leaderboard[item.productId].total += item.subtotal;
      });
    });

    return Object.values(leaderboard)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [invoices]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-5 2xl:gap-6">
      {/* Sales Trend Chart (7 Column Span) */}
      <div className="xl:col-span-8 2xl:col-span-9 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 xl:p-7 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 rounded-xl">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50">{t('charts.salesChart.title')}</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">{t('charts.salesChart.subtitle')}</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center gap-1 leading-none">
            {last7DaysTrend.dataPoints.reduce((acc, c) => acc + c.value, 0).toFixed(2)} {settings.currencySymbol}
          </span>
        </div>

        {/* Custom SVG Line & Area Chart */}
        <div className="relative mt-2 h-64 xl:h-80 2xl:h-[24rem] w-full">
          <svg className="w-full h-full" viewBox="0 0 700 240" preserveAspectRatio="none">
            <defs>
              <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line x1="40" y1="30" x2="680" y2="30" stroke="#f1f5f9" strokeWidth="1" className="stroke-gray-100 dark:stroke-zinc-800" />
            <line x1="40" y1="80" x2="680" y2="80" stroke="#f1f5f9" strokeWidth="1" className="stroke-gray-100 dark:stroke-zinc-800" />
            <line x1="40" y1="130" x2="680" y2="130" stroke="#f1f5f9" strokeWidth="1" className="stroke-gray-100 dark:stroke-zinc-800" />
            <line x1="40" y1="180" x2="680" y2="180" stroke="#f1f5f9" strokeWidth="1" className="stroke-gray-100 dark:stroke-zinc-800" />

            {/* Area and Line Path compilation */}
            {(() => {
              const points = last7DaysTrend.dataPoints.map((dp, i) => {
                const x = 50 + (i * (620 / 6));
                const y = 200 - (dp.value / last7DaysTrend.maxVal) * 160;
                return { x, y };
              });

              if (points.length === 0) return null;

              const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const areaPath = `${linePath} L ${points[points.length - 1].x} 200 L ${points[0].x} 200 Z`;

              return (
                <>
                  <path d={areaPath} fill="url(#gradient-area)" />
                  <path d={linePath} fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  
                  {/* Scatter Points */}
                  {points.map((p, i) => (
                    <g key={i} className="group cursor-pointer">
                      <circle cx={p.x} cy={p.y} r="6" fill="#ffffff" stroke="#0ea5e9" strokeWidth="3" />
                      <circle cx={p.x} cy={p.y} r="12" fill="#0ea5e9" opacity="0" className="hover:opacity-20 transition-opacity" />
                    </g>
                  ))}
                </>
              );
            })()}
          </svg>

          {/* X Axis Labels */}
          <div className="absolute bottom-0 left-[40px] right-[20px] flex justify-between text-[10px] font-medium text-gray-500 dark:text-zinc-400 select-none">
            {last7DaysTrend.dataPoints.map((dp, i) => (
              <span key={i} className="text-center w-[60px]" style={{ transform: 'translateX(-5px)' }}>
                {dp.label}
              </span>
            ))}
          </div>

          {/* Y Axis Guides */}
          <div className="absolute left-0 top-[10px] bottom-[35px] flex flex-col justify-between text-[9px] text-gray-400 font-mono pr-1 select-none">
            <span>{last7DaysTrend.maxVal.toFixed(0)}</span>
            <span>{(last7DaysTrend.maxVal * 0.75).toFixed(0)}</span>
            <span>{(last7DaysTrend.maxVal * 0.50).toFixed(0)}</span>
            <span>{(last7DaysTrend.maxVal * 0.25).toFixed(0)}</span>
            <span>0</span>
          </div>
        </div>
      </div>

      {/* Best Sellers Leaderboard (4 Column Span) */}
      <div className="xl:col-span-4 2xl:col-span-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6 xl:p-7 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50">{t('charts.bestSellers.title')}</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">{t('charts.bestSellers.subtitle')}</p>
            </div>
          </div>

          {bestSellers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-zinc-800 flex items-center justify-center mb-3">
                <HelpCircle className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-xs text-gray-400 dark:text-zinc-500">{t('charts.bestSellers.empty')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bestSellers.map((item, index) => {
                const totalQtyMax = Math.max(...bestSellers.map(s => s.qty), 1);
                const percent = (item.qty / totalQtyMax) * 100;
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700 dark:text-zinc-300 truncate max-w-[180px]">
                        {index + 1}. {item.name}
                      </span>
                      <span className="font-mono text-gray-900 dark:text-white font-bold">
                        {t('charts.bestSellers.unit', { count: item.qty })}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-400 text-left">
                      {t('charts.bestSellers.total', { total: item.total.toFixed(2), currency: settings.currencySymbol })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom indicator */}
        <div className="mt-4 pt-4 border-t border-gray-50 dark:border-zinc-800/80 flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
          <AlertCircle className="h-4 w-4 text-sky-500" />
          <span>{t('charts.bestSellers.footerNote')}</span>
        </div>
      </div>
    </div>
  );
};
