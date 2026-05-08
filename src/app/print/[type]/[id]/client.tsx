"use client";

import { useEffect } from "react";

export default function PrintClient({ type, data }: { type: string, data: any }) {
  const getPrintFileName = () => {
    const rawNumber =
      data?.invoiceNumber ||
      data?.soNumber ||
      data?.poNumber ||
      data?.containerNumber ||
      data?.id ||
      "document";

    const safeNumber = String(rawNumber).replace(/[^a-zA-Z0-9-_]/g, "_");

    if (type === "invoice") return `Invoice_${safeNumber}`;
    if (type === "so") return `SalesOrder_${safeNumber}`;
    if (type === "po") return `PurchaseOrder_${safeNumber}`;
    if (type === "shipment") return `DeliveryOrder_${safeNumber}`;
    return `Document_${safeNumber}`;
  };

  useEffect(() => {
    const originalTitle = document.title;
    document.title = getPrintFileName();

    setTimeout(() => {
      window.print();
    }, 500);

    return () => {
      document.title = originalTitle;
    };
  }, []);

  const formatDate = (value: string | Date) =>
    new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
  const formatMoney = (value: number) => `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

  const getItemUnitPrice = (item: any) => Number(item?.unitPrice ?? item?.sellingPrice ?? 0);
  const getItemTotalPrice = (item: any) =>
    Number(item?.totalPrice ?? Number(item?.quantity || 0) * getItemUnitPrice(item));

  const renderHeader = (title: string, no: string, date: string) => (
    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">PLYLEDGER</h1>
        <p className="text-sm text-slate-500 mt-1">Sales & Purchase Document</p>
      </div>
      <div className="text-right">
        <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">{title}</h2>
        <div className="mt-3 grid grid-cols-2 gap-x-4 text-sm">
          <span className="font-semibold text-slate-700">No:</span>
          <span className="font-bold">{no}</span>
          <span className="font-semibold text-slate-700">Date:</span>
          <span>{date}</span>
        </div>
      </div>
    </div>
  );

  const renderEntity = (title: string, entity: any, extraInfo?: string, hidePhone?: boolean) => (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
      <p className="text-lg font-bold text-slate-900">{entity?.name || "Unknown"}</p>
      {entity?.address && <p className="text-slate-600 mt-1">{entity.address}</p>}
      {(!hidePhone && (entity?.phone || entity?.email)) && (
        <p className="text-slate-600 mt-1">
          {entity?.phone} {entity?.phone && entity?.email && "•"} {entity?.email}
        </p>
      )}
      {(hidePhone && entity?.email) && (
        <p className="text-slate-600 mt-1">{entity?.email}</p>
      )}
      {extraInfo && <p className="text-slate-600 mt-1">{extraInfo}</p>}
    </div>
  );

  const renderItems = (items: any[]) => (
    <table className="w-full text-left border-collapse mb-6 table-fixed">
      <colgroup>
        <col className="w-[7%]" />
        <col className="w-[35%]" />
        <col className="w-[12%]" />
        <col className="w-[14%]" />
        <col className="w-[16%]" />
        <col className="w-[16%]" />
      </colgroup>
      <thead>
        <tr className="border-b-2 border-slate-900">
          <th className="py-3 w-10 font-bold text-slate-900">No</th>
          <th className="py-3 font-bold text-slate-900">Description</th>
          <th className="py-3 pr-8 text-right font-bold text-slate-900">Pallet</th>
          <th className="py-3 pr-8 text-right font-bold text-slate-900">Qty</th>
          <th className="py-3 pr-4 text-right font-bold text-slate-900">Unit Price</th>
          <th className="py-3 pr-2 text-right font-bold text-slate-900">Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item: any, i: number) => (
          <tr key={i} className="border-b border-slate-200">
            <td className="py-3 pr-2 text-slate-600 align-top">{i + 1}</td>
            <td className="py-4 pr-4">
              <p className="font-semibold text-slate-900 leading-snug">{item.product.name}</p>
              <p className="text-sm text-slate-500">
                {[item.product.type, item.product.grade, item.product.thickness, item.product.size].filter(Boolean).join(" • ")}
              </p>
            </td>
            <td className="py-4 pr-8 text-right align-top whitespace-nowrap">{item.pallets ?? "-"}</td>
            <td className="py-4 pr-8 text-right align-top whitespace-nowrap">
              {Number(item.quantity || 0).toLocaleString("id-ID")} {item.unit || "pcs"}
            </td>
            <td className="py-4 pr-4 text-right align-top whitespace-nowrap">{formatMoney(getItemUnitPrice(item))}</td>
            <td className="py-4 pr-2 text-right align-top whitespace-nowrap font-semibold">{formatMoney(getItemTotalPrice(item))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderTotals = (subTotal: number, taxAmount: number, totalAmount: number, hasTax: boolean) => (
    <div className="flex justify-end mb-14">
      <div className="w-[360px] space-y-2">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span>{formatMoney(subTotal)}</span>
        </div>
        {hasTax && (
          <div className="flex justify-between text-sm text-slate-600">
            <span>PPN (11%)</span>
            <span>{formatMoney(taxAmount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center py-3 border-t-2 border-slate-900">
          <span className="text-lg font-bold text-slate-900">Grand Total</span>
          <span className="text-2xl font-extrabold text-slate-900">{formatMoney(totalAmount)}</span>
        </div>
      </div>
    </div>
  );

  const renderSignatures = () => (
    <div className="grid grid-cols-2 gap-8 mt-8 pt-6">
      <div className="text-center">
        <p className="font-semibold text-slate-700 mb-16">Authorized Signature</p>
        <div className="border-t border-slate-400 w-48 mx-auto"></div>
      </div>
      <div className="text-center">
        <p className="font-semibold text-slate-700 mb-16">Customer / Supplier</p>
        <div className="border-t border-slate-400 w-48 mx-auto"></div>
      </div>
    </div>
  );

  const printStyles = (
    <style jsx global>{`
      @page {
        size: A4;
        margin: 10mm;
      }
      @media print {
        html,
        body {
          background: #fff !important;
        }
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `}</style>
  );

  if (type === "invoice") {
    const isReceivable = data.type === "RECEIVABLE";
    const order = isReceivable ? data.salesOrder : data.purchaseOrder;
    const entity = isReceivable ? order?.customer : order?.supplier;
    
    return (
      <div className="bg-white text-slate-900 p-10 max-w-4xl mx-auto min-h-screen">
        {printStyles}
        {renderHeader("INVOICE", data.invoiceNumber, formatDate(data.createdAt))}
        {renderEntity(isReceivable ? "Bill To" : "Pay To", entity)}
        {order?.items && renderItems(order.items)}
        {renderTotals(data.amount, 0, data.amount, false)}
        {renderSignatures()}
      </div>
    );
  }

  if (type === "po") {
    const subTotal = Number(data?.subTotal ?? data?.items?.reduce((sum: number, item: any) => sum + getItemTotalPrice(item), 0) ?? 0);
    const taxAmount = Number(data?.taxAmount ?? 0);
    const totalAmount = Number(data?.totalAmount ?? data?.totalCost ?? subTotal + taxAmount);

    return (
      <div className="bg-white text-slate-900 p-10 max-w-4xl mx-auto min-h-screen">
        {printStyles}
        {renderHeader("PURCHASE ORDER", data.poNumber, formatDate(data.createdAt))}
        <div className="grid grid-cols-2 gap-8">
          {renderEntity("Supplier", data.supplier, undefined, true)}
          {data.shippingAddress && renderEntity("Shipping Address", { name: "Deliver To", address: data.shippingAddress }, undefined, true)}
        </div>
        {data.items && renderItems(data.items)}
        {renderTotals(subTotal, taxAmount, totalAmount, Boolean(data?.hasTax))}
        {renderSignatures()}
      </div>
    );
  }

  if (type === "so") {
    const subTotal = Number(data?.subTotal ?? data?.items?.reduce((sum: number, item: any) => sum + getItemTotalPrice(item), 0) ?? 0);
    const taxAmount = Number(data?.taxAmount ?? 0);
    const totalAmount = Number(data?.totalAmount ?? subTotal + taxAmount);

    return (
      <div className="bg-white text-slate-900 p-10 max-w-4xl mx-auto min-h-screen">
        {printStyles}
        {renderHeader("SALES ORDER", data.soNumber, formatDate(data.createdAt))}
        <div className="grid grid-cols-2 gap-8">
          {renderEntity("Customer", data.customer, data.paymentTerms ? `Payment Terms: ${data.paymentTerms}` : undefined, true)}
          {data.shippingAddress && renderEntity("Shipping Address", { name: "Deliver To", address: data.shippingAddress }, undefined, true)}
        </div>
        {data.items && renderItems(data.items)}
        {renderTotals(subTotal, taxAmount, totalAmount, Boolean(data?.hasTax))}
        {renderSignatures()}
      </div>
    );
  }

  if (type === "shipment") {
    const isFullDO = !!data.doNumber || !!data.customer || !!data.items?.length;
    
    return (
      <div className="bg-white text-slate-900 p-10 max-w-4xl mx-auto min-h-screen">
        {printStyles}
        {renderHeader("DELIVERY ORDER", data.doNumber || data.containerNumber || data.id.substring(0,8), formatDate(data.deliveryDate || data.createdAt))}
        
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Delivery Details</h3>
            {isFullDO ? (
              <>
                <p><span className="font-semibold w-32 inline-block">Customer:</span> {data.customer?.name || data.customerPic || "-"}</p>
                <p><span className="font-semibold w-32 inline-block">Address:</span> {data.destinationAddress || "-"}</p>
                <p><span className="font-semibold w-32 inline-block">Driver:</span> {data.driverName || "-"}</p>
                <p><span className="font-semibold w-32 inline-block">Vehicle Plate:</span> {data.vehiclePlate || "-"}</p>
              </>
            ) : (
              <>
                <p><span className="font-semibold w-32 inline-block">Container No:</span> {data.containerNumber || "-"}</p>
                <p><span className="font-semibold w-32 inline-block">Bill of Lading:</span> {data.billOfLading || "-"}</p>
                <p><span className="font-semibold w-32 inline-block">Origin:</span> {data.originPort || "-"}</p>
                <p><span className="font-semibold w-32 inline-block">Destination:</span> {data.destinationPort || "-"}</p>
              </>
            )}
          </div>
          <div>
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Status</h3>
             {isFullDO && data.containerNumber && (
               <p><span className="font-semibold w-32 inline-block">Container No:</span> {data.containerNumber}</p>
             )}
             <p><span className="font-semibold w-32 inline-block">Current Status:</span> {data.status}</p>
             <p><span className="font-semibold w-32 inline-block">ETD:</span> {data.etd ? new Date(data.etd).toLocaleDateString() : "-"}</p>
             <p><span className="font-semibold w-32 inline-block">ETA:</span> {data.eta ? new Date(data.eta).toLocaleDateString() : "-"}</p>
          </div>
        </div>

        {isFullDO && data.items && data.items.length > 0 ? (
          <div className="mb-16">
            <table className="w-full text-left border-collapse mb-6 table-fixed">
              <colgroup>
                <col className="w-[10%]" />
                <col className="w-[50%]" />
                <col className="w-[20%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="py-3 w-10 font-bold text-slate-900">No</th>
                  <th className="py-3 font-bold text-slate-900">Description</th>
                  <th className="py-3 text-right font-bold text-slate-900 pr-8">Qty</th>
                  <th className="py-3 font-bold text-slate-900 pl-4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="py-3 pr-2 text-slate-600 align-top">{i + 1}</td>
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-slate-900 leading-snug">{item.product.name}</p>
                      <p className="text-sm text-slate-500">
                        {[item.product.type, item.product.grade, item.product.thickness, item.product.size].filter(Boolean).join(" • ")}
                      </p>
                    </td>
                    <td className="py-4 text-right align-top whitespace-nowrap pr-8">
                      {Number(item.quantity || 0).toLocaleString("id-ID")} {item.unit || "pcs"}
                    </td>
                    <td className="py-4 align-top pl-4">{item.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mb-16">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Related Orders</h3>
            {data.purchaseOrders?.map((po: any) => (
              <p key={po.id} className="py-2 border-b border-slate-100">PO: <span className="font-bold">{po.poNumber}</span> - Supplier: {po.supplier?.name}</p>
            ))}
            {data.salesOrders?.map((so: any) => (
              <p key={so.id} className="py-2 border-b border-slate-100">SO: <span className="font-bold">{so.soNumber}</span> - Customer: {so.customer?.name}</p>
            ))}
          </div>
        )}

        {data.notes && (
          <div className="mb-16">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</h3>
            <p className="text-slate-700 whitespace-pre-wrap">{data.notes}</p>
          </div>
        )}

        {renderSignatures()}
      </div>
    );
  }

  return <div>Unknown document type</div>;
}
