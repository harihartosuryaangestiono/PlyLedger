"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AreaChart, Area, LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  AlertCircle, ArrowDownRight, ArrowUpRight, Clock, Truck, 
  TrendingUp, TrendingDown, DollarSign, CreditCard, Wallet, 
  Banknote, Briefcase, Activity
} from "lucide-react";

export function DashboardClient({ 
  role,
  metrics,
  chartData,
  recentTransactions,
  pendingPayments,
  activeShipments
}: {
  role: string;
  metrics: {
    totalRevenue: number;
    totalCost: number;
    netProfit: number;
    outstandingReceivables: number;
    outstandingPayables: number;
    cashBalance: number;
  },
  chartData: any[],
  recentTransactions: any[],
  pendingPayments: any[],
  activeShipments: any[]
}) {
  const isSales = role === "SALES";
  const isLoss = metrics.netProfit < 0;

  const formatCurrency = (value: number) => `Rp ${(value || 0).toLocaleString("id-ID")}`;
  const formatCompactCurrency = (value: number) => `Rp${(value/1000000).toLocaleString("id-ID", {maximumFractionDigits: 1})}M`;

  // Calculate profit trend
  const currentMonthData = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const previousMonthData = chartData.length > 1 ? chartData[chartData.length - 2] : null;
  
  let profitTrend = 0;
  if (previousMonthData && previousMonthData.profit !== 0) {
    profitTrend = ((currentMonthData.profit - previousMonthData.profit) / Math.abs(previousMonthData.profit)) * 100;
  } else if (currentMonthData && currentMonthData.profit > 0) {
    profitTrend = 100;
  }
  const isTrendUp = profitTrend >= 0;

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12 pt-6 px-4 sm:px-6 md:px-8 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      
      {/* 1. KPI Cards Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Dominant Profit/Loss Card (Hidden for SALES) */}
        {!isSales && (
          <Card className={`col-span-1 md:col-span-2 shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md border-0 ${isLoss ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white'}`}>
            <CardContent className="p-6 sm:p-8 h-full flex flex-col justify-between relative z-10">
              <div className="flex justify-between items-start">
                <span className="text-sm font-semibold uppercase tracking-widest opacity-80 whitespace-nowrap">
                  {isLoss ? "Net Loss" : "Net Profit"}
                </span>
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 opacity-50 shrink-0" />
              </div>
              
              <div className="mt-4 sm:mt-6">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight truncate">
                  {formatCurrency(Math.abs(metrics.netProfit))}
                </div>
                
                <div className="flex items-center gap-2 mt-4 text-sm font-medium">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm whitespace-nowrap`}>
                    {isTrendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {Math.abs(profitTrend).toFixed(1)}% vs last month
                  </span>
                </div>
              </div>
            </CardContent>
            {/* Decorative background element */}
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          </Card>
        )}

        <Card className="col-span-1 border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-900 transition-all duration-200 hover:shadow-md rounded-2xl">
          <CardContent className="p-5 sm:p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4 gap-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap truncate">Revenue</span>
              <div className="p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg shrink-0">
                <Banknote className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
              {formatCurrency(metrics.totalRevenue)}
            </div>
          </CardContent>
        </Card>

        {!isSales && (
          <Card className="col-span-1 border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-900 transition-all duration-200 hover:shadow-md rounded-2xl">
            <CardContent className="p-5 sm:p-6 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start mb-4 gap-2">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap truncate">Total Cost</span>
                <div className="p-1.5 sm:p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg shrink-0">
                  <CreditCard className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
                {formatCurrency(metrics.totalCost)}
              </div>
            </CardContent>
          </Card>
        )}

        {!isSales && (
          <Card className="col-span-1 md:col-span-2 border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-900 transition-all duration-200 hover:shadow-md rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-bl-full -mr-16 -mt-16 pointer-events-none"></div>
            <CardContent className="p-5 sm:p-6 flex flex-col justify-between h-full relative z-10">
              <div className="flex justify-between items-start mb-4 gap-2">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap truncate">Cash Balance</span>
                <div className="p-1.5 sm:p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg shrink-0">
                  <Wallet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 truncate">
                {formatCurrency(metrics.cashBalance)}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="col-span-1 border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-900 transition-all duration-200 hover:shadow-md rounded-2xl">
          <CardContent className="p-5 sm:p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4 gap-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap truncate">Receivables</span>
              <div className="p-1.5 sm:p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg shrink-0">
                <ArrowDownRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-500 truncate">
              {formatCurrency(metrics.outstandingReceivables)}
            </div>
          </CardContent>
        </Card>

        {!isSales && (
          <Card className="col-span-1 border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-900 transition-all duration-200 hover:shadow-md rounded-2xl">
            <CardContent className="p-5 sm:p-6 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start mb-4 gap-2">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap truncate">Payables</span>
                <div className="p-1.5 sm:p-2 bg-red-50 dark:bg-red-900/20 rounded-lg shrink-0">
                  <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-500 truncate">
                {formatCurrency(metrics.outstandingPayables)}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 2. Charts Row */}
      <div className={`grid gap-6 ${isSales ? 'grid-cols-1' : 'lg:grid-cols-2 xl:grid-cols-3'}`}>
        
        {/* Revenue vs Cost */}
        <Card className={`border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-900 rounded-2xl ${isSales ? 'col-span-1' : 'col-span-1 xl:col-span-2'}`}>
          <CardHeader className="pb-2 pt-6 px-6">
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">Revenue {isSales ? '' : 'vs Cost'}</CardTitle>
          </CardHeader>
          <CardContent className="pl-0 pb-6 pr-6 pt-4 h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  {!isSales && (
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  )}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} tickFormatter={formatCompactCurrency} />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), undefined]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--card, #fff)' }}
                  itemStyle={{ color: 'var(--foreground, #0f172a)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                <Area type="monotone" name="Revenue" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" activeDot={{ r: 6, strokeWidth: 0 }} />
                {!isSales && <Area type="monotone" name="Cost" dataKey="cost" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" activeDot={{ r: 6, strokeWidth: 0 }} />}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Profit Trend (Hidden for SALES) */}
        {!isSales && (
          <Card className="col-span-1 border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-900 rounded-2xl flex flex-col">
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">Profit / Loss</CardTitle>
            </CardHeader>
            <CardContent className="pl-0 pb-6 pr-6 pt-4 flex-1 h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} tickFormatter={formatCompactCurrency} />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(value), "Net Profit"]}
                    cursor={{fill: 'var(--muted, #f1f5f9)', opacity: 0.5}}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--card, #fff)' }}
                  />
                  <Bar dataKey="profit" radius={[4, 4, 4, 4]} barSize={32}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

      </div>

      {/* Cashflow Chart (Hidden for SALES) */}
      {!isSales && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-900 rounded-2xl">
          <CardHeader className="pb-2 pt-6 px-6">
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">Cashflow Movement</CardTitle>
          </CardHeader>
          <CardContent className="pl-0 pb-6 pr-6 pt-4 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} tickFormatter={formatCompactCurrency} />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), undefined]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--card, #fff)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                <Line type="monotone" name="Inflow (Received)" dataKey="inflow" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" name="Outflow (Paid)" dataKey="outflow" stroke="#f43f5e" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" name="Net Cash" dataKey="netCash" stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 3. Operational Summary Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Recent Transactions */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-900 col-span-1 lg:col-span-1 flex flex-col rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-50 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400"/> Recent Transactions
            </CardTitle>
          </CardHeader>
          <div className="flex-1 overflow-auto max-h-[400px]">
            <Table>
              <TableBody>
                {recentTransactions.map((tx, idx) => (
                  <TableRow key={tx.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="py-4 px-5">
                      <div className="font-semibold text-slate-900 dark:text-slate-200 text-sm">{tx.party}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tx.date} &bull; {tx.id}</div>
                    </TableCell>
                    <TableCell className="py-4 px-5 text-right">
                      <div className="font-semibold text-slate-900 dark:text-slate-200 text-sm">{formatCurrency(tx.amount)}</div>
                      <div className="mt-1.5 flex justify-end">
                        <Badge variant={tx.type === 'Sale' ? 'outline' : 'secondary'} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tx.type === 'Sale' ? 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                          {tx.type}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {recentTransactions.length === 0 && (
                  <TableRow><TableCell className="text-center py-8 text-slate-500 text-sm dark:text-slate-400">No transactions</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Pending Payments */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-900 col-span-1 lg:col-span-1 flex flex-col rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-50 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500"/> Pending Payments
            </CardTitle>
          </CardHeader>
          <div className="flex-1 overflow-auto max-h-[400px]">
            <Table>
              <TableBody>
                {pendingPayments.map((p, idx) => (
                  <TableRow key={p.id} className={`border-b border-slate-100 dark:border-slate-800/50 transition-colors ${p.isOverdue ? 'bg-red-50/50 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                    <TableCell className="py-4 px-5">
                      <div className="font-semibold text-slate-900 dark:text-slate-200 text-sm flex items-center gap-1.5">
                        {p.type === 'PAYABLE' ? <ArrowUpRight className="w-3.5 h-3.5 text-rose-500"/> : <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500"/>}
                        {p.party}
                      </div>
                      <div className={`text-xs mt-1 font-medium ${p.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        Due: {p.dueDate} {p.isOverdue && <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">OVERDUE</span>}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-5 text-right">
                      <div className="font-semibold text-amber-600 dark:text-amber-500 text-sm">{formatCurrency(p.outstanding)}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">of {formatCurrency(p.total)}</div>
                    </TableCell>
                  </TableRow>
                ))}
                {pendingPayments.length === 0 && (
                  <TableRow><TableCell className="text-center py-8 text-slate-500 text-sm dark:text-slate-400">No pending payments</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Active Shipments */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm dark:bg-slate-900 col-span-1 lg:col-span-1 flex flex-col rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 pt-5 px-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
            <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-50 uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-500"/> Active Shipments
            </CardTitle>
          </CardHeader>
          <div className="flex-1 overflow-auto max-h-[400px]">
            <Table>
              <TableBody>
                {activeShipments.map((s, idx) => (
                  <TableRow key={idx} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="py-4 px-5">
                      <div className="font-semibold text-slate-900 dark:text-slate-200 text-sm truncate max-w-[150px]" title={s.id}>{s.id}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        {s.origin} <span className="text-slate-300 dark:text-slate-600">&rarr;</span> {s.destination}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-5 text-right">
                      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 mb-1.5 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50 px-2 py-0.5 rounded-full font-medium">
                        In Transit
                      </Badge>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">ETA: {s.eta}</div>
                    </TableCell>
                  </TableRow>
                ))}
                {activeShipments.length === 0 && (
                  <TableRow><TableCell className="text-center py-8 text-slate-500 text-sm dark:text-slate-400">No active shipments</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

      </div>

    </div>
  );
}
