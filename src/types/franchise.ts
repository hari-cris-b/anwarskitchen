export interface Franchise {
  id: string;
  name: string;
  address: string;
  owner_id: string;
  tax_rate: number;
  currency: string;
  timezone: string;
  created_at?: string;
  updated_at?: string;
  active: boolean;
}
