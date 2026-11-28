export interface DraftRecipient {
  recipientName: string;
  recipientUserId: string;
  percentage: number;
}

export interface TaxSimulationRow {
  id: string;
  name: string;
  isCompany: boolean;
  hasNpwp: boolean;
  npwp?: string | null;
  ptkpCode: string;
  gross: number;
  dpp: number;
  tax: number;
  net: number;
}
