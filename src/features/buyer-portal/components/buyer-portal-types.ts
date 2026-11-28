export interface SubmittedPoDialogState {
  poNumber: string;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  quotationReference: string;
  submittedAt: string;
  items: Array<{ item: string; qty: number; price: number }>;
  totalAmount: number;
}
