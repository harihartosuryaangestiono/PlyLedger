"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, Truck } from "lucide-react";

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
  const formatCompactCurrency = (value: number) => `Rp${(value/1000).toLocaleString("id-ID")}k`;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 pt-4">
      
      {/* 1. KPI Cards Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        
        {/* Dominant Profit/Loss Card (Hidden for SALES) */}
        {!isSales && (
          <Card className={`col-span-1 md:col-span-2 shadow-md relative overflow-hidden ${isLoss ? 'border-red-200 bg-red-50/30' : 'border-emerald-200 bg-emerald-50/30'}`}>
            <div className={`absolute top-0 left-0 w-full h-1.5 ${isLoss ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
            <CardContent className="p-6">
              <div className="flex flex-col gap-1 h-full justify-center">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  {isLoss ? "Net Loss" : "Net Profit"}
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <div className={`text-4xl font-extrabold tracking-tight ${isLoss ? 'text-red-700' : 'text-emerald-700'}`}>
                    {formatCurrency(Math.abs(metrics.netProfit))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-500">Total Revenue</span>
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {formatCurrency(metrics.totalRevenue)}
              </div>
            </div>
          </CardContent>
        </Card>

        {!isSales && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-500">Total Cost</span>
                <div className="text-2xl font-bold tracking-tight text-slate-900">
                  {formatCurrency(metrics.totalCost)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-500">Outstanding Receivables</span>
              <div className="text-2xl font-bold tracking-tight text-amber-600">
                {formatCurrency(metrics.outstandingReceivables)}
              </div>
            </div>
          </CardContent>
        </Card>

        {!isSales && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-500">Outstanding Payables</span>
                <div className="text-2xl font-bold tracking-tight text-rose-600">
                  {formatCurrency(metrics.outstandingPayables)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isSales && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-500">Cash Balance</span>
                <div className="text-2xl font-bold tracking-tight text-blue-700">
                  {formatCurrency(metrics.cashBalance)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 2. Charts Row */}
      <div className={`grid gap-6 ${isSales ? 'grid-cols-1' : 'lg:grid-cols-2 xl:grid-cols-3'}`}>
        
        {/* Revenue vs Cost */}
        <Card className={`border-slate-200 shadow-sm ${isSales ? 'col-span-1' : 'col-span-1 xl:col-span-2'}`}>
          <CardHeader className="pb-2 pt-6 px-6">
            <CardTitle className="text-lg font-bold text-slate-900">Revenue {isSales ? '' : 'vs Cost'}</CardTitle>
          </CardHeader>
          <CardContent className="pl-0 pb-6 pr-6 pt-4 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} tickFormatter={formatCompactCurrency} />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), undefined]}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Line type="monotone" name="Revenue" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{r:4}} activeDot={{ r: 6 }} />
                {!isSales && <Line type="monotone" name="Cost" dataKey="cost" stroke="#ef4444" strokeWidth={3} dot={{r:4}} activeDot={{ r: 6 }} />}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Profit Trend (Hidden for SALES) */}
        {!isSales && (
          <Card className="border-slate-200 shadow-sm col-span-1">
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-lg font-bold text-slate-900">Profit / Loss Trend</CardTitle>
            </CardHeader>
            <CardContent className="pl-0 pb-6 pr-6 pt-4 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} tickFormatter={formatCompactCurrency} />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(value), "Net Profit"]}
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="profit" radius={[4, 4, 4, 4]}>
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
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2 pt-6 px-6">
            <CardTitle className="text-lg font-bold text-slate-900">Cashflow Movement</CardTitle>
          </CardHeader>
          <CardContent className="pl-0 pb-6 pr-6 pt-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} tickFormatter={formatCompactCurrency} />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), undefined]}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Line type="monotone" name="Inflow (Received)" dataKey="inflow" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" name="Outflow (Paid)" dataKey="outflow" stroke="#f43f5e" strokeWidth={2} dot={false} />
                <Line type="monotone" name="Net Cash" dataKey="netCash" stroke="#0f172a" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 3. Operational Summary Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Recent Transactions */}
        <Card className="border-slate-200 shadow-sm col-span-1 lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500"/> Recent Transactions
            </CardTitle>
          </CardHeader>
          <div className="flex-1 p-0">
            <Table>
              <TableBody>
                {recentTransactions.map((tx, idx) => (
                  <TableRow key={tx.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <TableCell className="py-3 px-4">
                      <div className="font-medium text-slate-900 text-sm">{tx.party}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{tx.date} • {tx.id}</div>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <div className="font-medium text-slate-900 text-sm">{formatCurrency(tx.amount)}</div>
                      <div className="mt-1 flex justify-end">
                        <Badge variant={tx.type === 'Sale' ? 'success' : 'secondary'} className="text-[10px] px-1.5 py-0">
                          {tx.type}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {recentTransactions.length === 0 && (
                  <TableRow><TableCell className="text-center py-6 text-slate-500 text-sm">No transactions</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Pending Payments */}
        <Card className="border-slate-200 shadow-sm col-span-1 lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500"/> Pending Payments
            </CardTitle>
          </CardHeader>
          <div className="flex-1 p-0">
            <Table>
              <TableBody>
                {pendingPayments.map((p, idx) => (
                  <TableRow key={p.id} className={`border-b border-slate-100 hover:bg-slate-50 ${p.isOverdue ? 'bg-red-50/30' : ''}`}>
                    <TableCell className="py-3 px-4">
                      <div className="font-medium text-slate-900 text-sm flex items-center gap-1.5">
                        {p.type === 'PAYABLE' ? <ArrowUpRight className="w-3 h-3 text-red-500"/> : <ArrowDownRight className="w-3 h-3 text-green-500"/>}
                        {p.party}
                      </div>
                      <div className={`text-xs mt-0.5 ${p.isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                        Due: {p.dueDate} {p.isOverdue && '(Overdue)'}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <div className="font-semibold text-amber-600 text-sm">{formatCurrency(p.outstanding)}</div>
                      <div className="text-xs text-slate-400 mt-0.5">of {formatCurrency(p.total)}</div>
                    </TableCell>
                  </TableRow>
                ))}
                {pendingPayments.length === 0 && (
                  <TableRow><TableCell className="text-center py-6 text-slate-500 text-sm">No pending payments</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Active Shipments */}
        <Card className="border-slate-200 shadow-sm col-span-1 lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-500"/> Active Shipments
            </CardTitle>
          </CardHeader>
          <div className="flex-1 p-0">
            <Table>
              <TableBody>
                {activeShipments.map((s, idx) => (
                  <TableRow key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <TableCell className="py-3 px-4">
                      <div className="font-medium text-slate-900 text-sm truncate max-w-[150px]" title={s.id}>{s.id}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.origin} → {s.destination}</div>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 mb-1">
                        In Transit
                      </Badge>
                      <div className="text-xs text-slate-500">ETA: {s.eta}</div>
                    </TableCell>
                  </TableRow>
                ))}
                {activeShipments.length === 0 && (
                  <TableRow><TableCell className="text-center py-6 text-slate-500 text-sm">No active shipments</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

      </div>

    </div>
  );
}
