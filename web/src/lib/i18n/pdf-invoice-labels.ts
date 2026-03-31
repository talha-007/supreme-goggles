/** Keys under `pdf` in messages — passed into thermal PDF generation. */
export type InvoicePdfLabels = {
  invoiceHash: string;
  status: string;
  salesInvoice: string;
  billTo: string;
  walkIn: string;
  items: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  paid: string;
  balanceDue: string;
  notes: string;
  footer: string;
  statusPaid: string;
  statusDraft: string;
  statusCancelled: string;
  statusDue: string;
  ph: string;
  taxInvoiceTitle: string;
  datePrefix: string;
  duePrefix: string;
};
