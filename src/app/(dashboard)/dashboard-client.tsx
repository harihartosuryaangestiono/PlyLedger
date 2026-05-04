"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function DashboardClient({ 
  metrics,
  chartData,
  recentTransactions
}: {
  metrics: {
    totalRevenue: number;
    totalCost: number;
    netProfit: number;
    outstandingReceivables: number;
    receivablesCount: number;
    outstandingPayables: number;
    payablesCount: number;
  },
  chartData: any[],
  recentTransactions: any[]
}) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8 pt-4">
      
      {/* KPI Cards Top Row */}
      <div className="grid gap-6 md:grid-cols-4 lg:grid-cols-5">
        
        {/* Total Revenue */}
        <Card className="col-span-1 border-slate-200">
          <CardContent className="p-5">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-500">Total Revenue</span>
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                Rp {metrics.totalRevenue.toLocaleString("id-ID")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost of Goods Sold */}
        <Card className="col-span-1 border-slate-200">
          <CardContent className="p-5">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-500">Cost of Goods Sold</span>
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                Rp {metrics.totalCost.toLocaleString("id-ID")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit - Dominant Card */}
        <Card className="col-span-1 md:col-span-2 border-slate-300 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
          <CardContent className="p-5">
            <div className="flex flex-col gap-1 h-full justify-center">
              <span className="text-sm font-medium text-slate-500">Net Profit (Current)</span>
              <div className="flex items-baseline gap-3">
                <div className="text-4xl font-extrabold tracking-tight text-slate-900">
                  Rp {metrics.netProfit.toLocaleString("id-ID")}
                </div>
                {metrics.netProfit > 0 && (
                  <span className="text-sm font-medium text-green-600 flex items-center">
                    ↑ Positive
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Receivables */}
        <Card className="col-span-1 border-slate-200">
          <CardContent className="p-5">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-500">Outstanding Invoices</span>
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                Rp {metrics.outstandingReceivables.toLocaleString("id-ID")}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-1">
        <Card className="border-slate-200">
          <CardHeader className="pb-2 pt-6 px-6">
            <CardTitle className="text-lg font-bold text-slate-900">Revenue vs Cost</CardTitle>
            <p className="text-sm text-slate-500 font-medium">Monthly Plywood Sales & Costs (2024)</p>
          </CardHeader>
          <CardContent className="pl-0 pb-6 pr-6 pt-4 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="month" 
                  axisLine={{ stroke: '#E2E8F0' }} 
                  tickLine={false} 
                  tick={{fill: '#64748B', fontSize: 12, fontWeight: 500}} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748B', fontSize: 12, fontWeight: 500}} 
                  tickFormatter={(value) => `Rp${value/1000}k`}
                  width={60}
                />
                <Tooltip 
                  formatter={(value: any) => [`Rp ${Number(value || 0).toLocaleString("id-ID")}`, undefined]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px', fontWeight: 500 }}
                  labelStyle={{ color: '#64748B', marginBottom: '4px' }}
                />
                <Legend iconType="plainline" wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500, color: '#0F172A' }} />
                <Line 
                  type="monotone" 
                  name="Revenue"
                  dataKey="revenue" 
                  stroke="#0F172A" 
                  strokeWidth={2.5} 
                  dot={false}
                  activeDot={{ r: 6, fill: '#0F172A', stroke: '#fff', strokeWidth: 2 }} 
                />
                <Line 
                  type="monotone" 
                  name="Cost"
                  dataKey="cost" 
                  stroke="#94A3B8" 
                  strokeWidth={2.5} 
                  dot={false}
                  activeDot={{ r: 6, fill: '#94A3B8', stroke: '#fff', strokeWidth: 2 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="border-slate-200 overflow-hidden flex flex-col">
        <CardHeader className="pb-4 pt-6 px-6 border-b border-slate-100">
          <CardTitle className="text-lg font-bold text-slate-900">Recent Transactions</CardTitle>
          <p className="text-sm text-slate-500 font-medium">Subtle zebra rows, sticky headers</p>
        </CardHeader>
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-[#F8FAFC] sticky top-0 border-b border-slate-200">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[120px] text-xs font-semibold text-slate-900 py-3">Date</TableHead>
                <TableHead className="text-xs font-semibold text-slate-900 py-3">Invoice #</TableHead>
                <TableHead className="text-xs font-semibold text-slate-900 py-3">Client / Party</TableHead>
                <TableHead className="text-xs font-semibold text-slate-900 py-3">Type</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-900 py-3">Amount</TableHead>
                <TableHead className="text-center text-xs font-semibold text-slate-900 py-3">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map((tx, idx) => (
                <TableRow key={tx.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]/60'}>
                  <TableCell className="text-sm text-slate-600 py-3.5 border-b border-slate-100">{tx.date}</TableCell>
                  <TableCell className="font-medium text-slate-900 text-sm py-3.5 border-b border-slate-100">{tx.id}</TableCell>
                  <TableCell className="text-slate-600 text-sm py-3.5 border-b border-slate-100">{tx.party}</TableCell>
                  <TableCell className="text-slate-600 text-sm py-3.5 border-b border-slate-100">{tx.type}</TableCell>
                  <TableCell className="text-right font-medium text-sm text-slate-900 py-3.5 border-b border-slate-100">
                    Rp {tx.amount.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-center py-3.5 border-b border-slate-100">
                    <Badge variant={
                      tx.status === 'PAID' ? 'success' : 
                      tx.status === 'PARTIALLY_PAID' ? 'warning' : 'error'
                    }>
                      {tx.status === 'PARTIALLY_PAID' ? 'PARTIAL' : tx.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {recentTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No recent transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

    </div>
  );
}
