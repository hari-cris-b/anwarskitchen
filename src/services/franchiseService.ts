import { supabase } from '../lib/supabase';
import type { FranchiseSettings, Profile } from '../types';

// New interfaces for franchise management
interface Franchise {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contact_number: string;
  email: string;
  owner_name: string;
  gst_number: string | null;
  is_active: boolean;
  franchise_code: string;
  agreement_start_date: Date | null;
  agreement_end_date: Date | null;
  royalty_percentage: number;
  security_deposit: number;
  brand_audit_score?: number;
  last_audit_date?: Date;
  created_at: string;
  updated_at: string;
}

interface BrandAudit {
  id: string;
  franchise_id: string;
  audit_date: Date;
  food_quality_score: number;
  service_score: number;
  cleanliness_score: number;
  brand_standards_score: number;
  overall_score: number;
  notes: string;
  created_at: string;
}

interface SalesReport {
  franchise_id: string;
  start_date: Date;
  end_date: Date;
  total_sales: number;
  total_orders: number;
  average_order_value: number;
  royalty_amount: number;
}

class FranchiseService {
  // Franchise CRUD Operations
  async createFranchise(franchiseData: Omit<Franchise, 'id' | 'created_at' | 'updated_at'>): Promise<Franchise> {
    const { data, error } = await supabase
      .from('franchises')
      .insert([{
        ...franchiseData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getFranchise(franchiseId: string): Promise<Franchise> {
    const { data, error } = await supabase
      .from('franchises')
      .select('*')
      .eq('id', franchiseId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateFranchise(franchiseId: string, updates: Partial<Franchise>): Promise<Franchise> {
    const { data, error } = await supabase
      .from('franchises')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', franchiseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Franchise Settings Management
  async getFranchiseSettings(franchiseId: string): Promise<FranchiseSettings> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session. Please log in.');
      }

      const { data, error } = await supabase
        .from('franchise_settings')
        .select('*')
        .eq('franchise_id', franchiseId)
        .single();

      if (error) {
        if (error.code === '42501') {
          throw new Error('Permission denied. Please check your access rights.');
        }
        
        // Create default settings if none exist
        const defaultSettings: FranchiseSettings = {
          id: crypto.randomUUID(),
          franchise_id: franchiseId,
          currency: 'INR',
          tax_rate: 5,
          default_discount: 0,
          opening_time: '09:00',
          closing_time: '22:00',
          timezone: 'Asia/Kolkata',
          menu_categories: ['All', 'South Indian', 'North Indian', 'Chinese', 'Beverages'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          franchise_code: '',
          agreement_start_date: null,
          agreement_end_date: null,
          royalty_percentage: 0,
          security_deposit: 0
        };
        
        const { data: newData, error: createError } = await supabase
          .from('franchise_settings')
          .insert([defaultSettings])
          .select()
          .single();

        if (createError) {
          if (createError.code === '42501') {
            throw new Error('Permission denied while creating settings. Please check your access rights.');
          }
          throw new Error(`Failed to create franchise settings: ${createError.message}`);
        }

        return newData;
      }

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      console.error('Error in getFranchiseSettings:', error);
      throw error;
    }
  }

  async updateFranchiseSettings(franchiseId: string, settings: Partial<FranchiseSettings>): Promise<FranchiseSettings> {
    const { data, error } = await supabase
      .from('franchise_settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('franchise_id', franchiseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Brand Compliance and Auditing
  async createBrandAudit(auditData: Omit<BrandAudit, 'id' | 'created_at'>): Promise<BrandAudit> {
    const { data, error } = await supabase
      .from('compliance_reports')
      .insert([{
        ...auditData,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getBrandAudits(franchiseId: string): Promise<BrandAudit[]> {
    const { data, error } = await supabase
      .from('compliance_reports')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('audit_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Sales and Performance Reporting
  async generateSalesReport(franchiseId: string, startDate: Date, endDate: Date): Promise<SalesReport> {
    const { data, error } = await supabase
      .from('orders')
      .select('total, created_at')
      .eq('franchise_id', franchiseId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    const totalSales = data.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = data.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Get franchise details for royalty calculation
    const { data: franchise } = await supabase
      .from('franchises')
      .select('royalty_percentage')
      .eq('id', franchiseId)
      .single();

    const royaltyAmount = (totalSales * (franchise?.royalty_percentage || 0)) / 100;

    return {
      franchise_id: franchiseId,
      start_date: startDate,
      end_date: endDate,
      total_sales: totalSales,
      total_orders: totalOrders,
      average_order_value: averageOrderValue,
      royalty_amount: royaltyAmount
    };
  }

  // Staff Management
  async getFranchiseStaff(franchiseId: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('franchise_id', franchiseId);

    if (error) throw error;
    return data;
  }

  async addStaffMember(staffData: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .insert([staffData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Agreement Management
  async updateAgreement(
    franchiseId: string,
    agreementData: {
      agreement_start_date: Date;
      agreement_end_date: Date;
      royalty_percentage: number;
      security_deposit: number;
    }
  ): Promise<Franchise> {
    return this.updateFranchise(franchiseId, agreementData);
  }

  async checkAgreementStatus(franchiseId: string): Promise<{
    status: 'active' | 'expired' | 'expiring_soon';
    daysRemaining?: number;
  }> {
    const franchise = await this.getFranchise(franchiseId);
    if (!franchise.agreement_end_date) {
      return { status: 'expired' };
    }

    const endDate = new Date(franchise.agreement_end_date);
    const today = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (daysRemaining <= 0) {
      return { status: 'expired', daysRemaining: 0 };
    } else if (daysRemaining <= 30) {
      return { status: 'expiring_soon', daysRemaining };
    } else {
      return { status: 'active', daysRemaining };
    }
  }
}

export const franchiseService = new FranchiseService();
