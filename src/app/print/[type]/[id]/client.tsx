"use client";

import { useEffect } from "react";

export default function PrintClient({ type, data }: { type: string, data: any }) {
  useEffect(() => {
    // Automatically trigger print dialog when component mounts
    setTimeout(() => {
      window.print();
    }, 500);
  }, []);

  const renderHeader = (title: string, subtitle: string, no: string, date: string) => (
    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">PLYLEDGER</h1>
        <p className="text-slate-500 mt-1">Plywood Trading Management</p>
      </div>
      <div className="text-right">
        <h2 className="text-3xl font-bold text-slate-900 uppercase">{title}</h2>
        <p className="text-slate-500 mt-1">{subtitle}</p>
        <div className="mt-4 grid grid-cols-2 gap-x-4 text-sm">
          <span className="font-semibold text-slate-700">No:</span>
          <span className="font-bold">{no}</span>
          <span className="font-semibold text-slate-700">Date:</span>
          <span>{date}</span>
        </div>
      </div>
    </div>
  );

  const renderEntity = (title: string, entity: any) => (
    <div className="mb-8">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
      <p className="text-lg font-bold text-slate-900">{entity?.name || "Unknown"}</p>
      {entity?.address && <p className="text-slate-600 mt-1">{entity.address}</p>}
      {(entity?.phone || entity?.email) && (
        <p className="text-slate-600 mt-1">
          {entity?.phone} {entity?.phone && entity?.email && "•"} {entity?.email}
        </p>
      )}
    </div>
  );

  const renderItems = (items: any[]) => (
    <table className="w-full text-left border-collapse mb-8">
      <thead>
        <tr className="border-b-2 border-slate-900">
          <th className="py-3 font-bold text-slate-900">Description</th>
          <th className="py-3 text-right font-bold text-slate-900">Qty</th>
          <th className="py-3 text-right font-bold text-slate-900">Unit Price</th>
          <th className="py-3 text-right font-bold text-slate-900">Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item: any, i: number) => (
          <tr key={i} className="border-b border-slate-200">
            <td className="py-4">
              <p className="font-semibold text-slate-900">{item.product.name}</p>
              <p className="text-sm text-slate-500">{item.product.type} • {item.product.thickness} • {item.product.grade}</p>
            </td>
            <td className="py-4 text-right">{item.quantity} {item.unit}</td>
            <td className="py-4 text-right">Rp {(item.unitPrice || item.sellingPrice).toLocaleString("id-ID")}</td>
            <td className="py-4 text-right font-semibold">Rp {item.totalPrice.toLocaleString("id-ID")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderFooter = (totalAmount: number) => (
    <div className="flex justify-end mb-16">
      <div className="w-1/2">
        <div className="flex justify-between items-center py-3 border-t-2 border-slate-900">
          <span className="text-lg font-bold text-slate-900">Grand Total</span>
          <span className="text-2xl font-extrabold text-slate-900">Rp {totalAmount.toLocaleString("id-ID")}</span>
        </div>
      </div>
    </div>
  );

  const renderSignatures = () => (
    <div className="grid grid-cols-2 gap-8 mt-16 pt-8">
      <div className="text-center">
        <p className="font-semibold text-slate-700 mb-20">Authorized Signature</p>
        <div className="border-t border-slate-400 w-48 mx-auto"></div>
      </div>
      <div className="text-center">
        <p className="font-semibold text-slate-700 mb-20">Customer / Supplier</p>
        <div className="border-t border-slate-400 w-48 mx-auto"></div>
      </div>
    </div>
  );

  if (type === "invoice") {
    const isReceivable = data.type === "RECEIVABLE";
    const order = isReceivable ? data.salesOrder : data.purchaseOrder;
    const entity = isReceivable ? order?.customer : order?.supplier;
    
    return (
      <div className="bg-white text-slate-900 p-10 max-w-4xl mx-auto min-h-screen">
        {renderHeader("INVOICE", isReceivable ? "Accounts Receivable" : "Accounts Payable", data.invoiceNumber, new Date(data.createdAt).toLocaleDateString())}
        {renderEntity(isReceivable ? "Bill To" : "Pay To", entity)}
        {order?.items && renderItems(order.items)}
        {renderFooter(data.amount)}
        {renderSignatures()}
      </div>
    );
  }

  if (type === "po") {
    return (
      <div className="bg-white text-slate-900 p-10 max-w-4xl mx-auto min-h-screen">
        {renderHeader("PURCHASE ORDER", "Official Document", data.poNumber, new Date(data.createdAt).toLocaleDateString())}
        {renderEntity("Supplier", data.supplier)}
        {data.items && renderItems(data.items)}
        {renderFooter(data.totalCost)}
        {renderSignatures()}
      </div>
    );
  }

  if (type === "so") {
    return (
      <div className="bg-white text-slate-900 p-10 max-w-4xl mx-auto min-h-screen">
        {renderHeader("SALES ORDER", "Official Document", data.soNumber, new Date(data.createdAt).toLocaleDateString())}
        {renderEntity("Customer", data.customer)}
        {data.items && renderItems(data.items)}
        {renderFooter(data.totalAmount)}
        {renderSignatures()}
      </div>
    );
  }

  if (type === "shipment") {
    // For shipment, we list the orders related to it
    return (
      <div className="bg-white text-slate-900 p-10 max-w-4xl mx-auto min-h-screen">
        {renderHeader("DELIVERY ORDER", "Shipment Document", data.containerNumber || data.id.substring(0,8), new Date(data.createdAt).toLocaleDateString())}
        
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Shipment Details</h3>
            <p><span className="font-semibold w-32 inline-block">Container No:</span> {data.containerNumber || "-"}</p>
            <p><span className="font-semibold w-32 inline-block">Bill of Lading:</span> {data.billOfLading || "-"}</p>
            <p><span className="font-semibold w-32 inline-block">Origin:</span> {data.originPort || "-"}</p>
            <p><span className="font-semibold w-32 inline-block">Destination:</span> {data.destinationPort || "-"}</p>
          </div>
          <div>
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Status</h3>
             <p><span className="font-semibold w-32 inline-block">Current Status:</span> {data.status}</p>
             <p><span className="font-semibold w-32 inline-block">ETD:</span> {data.etd ? new Date(data.etd).toLocaleDateString() : "-"}</p>
             <p><span className="font-semibold w-32 inline-block">ETA:</span> {data.eta ? new Date(data.eta).toLocaleDateString() : "-"}</p>
          </div>
        </div>

        <div className="mb-16">
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Related Orders</h3>
           {data.purchaseOrders?.map((po: any) => (
             <p key={po.id} className="py-2 border-b border-slate-100">PO: <span className="font-bold">{po.poNumber}</span> - Supplier: {po.supplier?.name}</p>
           ))}
           {data.salesOrders?.map((so: any) => (
             <p key={so.id} className="py-2 border-b border-slate-100">SO: <span className="font-bold">{so.soNumber}</span> - Customer: {so.customer?.name}</p>
           ))}
        </div>

        {renderSignatures()}
      </div>
    );
  }

  return <div>Unknown document type</div>;
}
