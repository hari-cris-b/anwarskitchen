export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      franchises: {
        Row: {
          id: string
          name: string
          address: string
          phone: string
          email: string
          status: 'active' | 'inactive' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['franchises']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['franchises']['Insert']>
      }
      franchise_settings: {
        Row: {
          id: string
          franchise_id: string
          key: string
          value: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['franchise_settings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['franchise_settings']['Insert']>
      }
      menu_items: {
        Row: {
          id: string
          franchise_id: string
          name: string
          description: string | null
          price: number
          category: string
          image_url: string | null
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['menu_items']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['menu_items']['Insert']>
      }
      orders: {
        Row: {
          id: string
          franchise_id: string
          status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
          table_number: string | null
          customer_name: string | null
          server_id: string | null
          server_name: string | null
          notes: string | null
          subtotal: number
          tax: number
          discount: number
          additional_charges: number
          total: number
          payment_status: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string
          quantity: number
          price_at_time: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>
      }
      staff: {
        Row: {
          id: string
          auth_id: string | null
          franchise_id: string
          full_name: string
          email: string
          phone: string | null
          staff_type: 'super_admin' | 'admin' | 'manager' | 'kitchen' | 'staff'
          status: 'active' | 'inactive' | 'suspended' | 'on_leave'
          can_manage_staff: boolean
          can_void_orders: boolean
          can_modify_menu: boolean
          pin_code: string | null
          shift: string | null
          hourly_rate: number | null
          joining_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['staff']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['staff']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_sales_report: {
        Args: {
          p_franchise_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          total_orders: number
          total_revenue: number
          items_sold: number
          average_order_value: number
          popular_items: {
            menu_item_id: string
            menu_item_name: string
            total_quantity: number
            total_revenue: number
          }[]
        }
      }
      verify_staff_pin: {
        Args: {
          p_staff_id: string
          p_franchise_id: string
          p_pin: string
        }
        Returns: boolean
      }
      admin_set_staff_pin: {
        Args: {
          p_admin_id: string
          p_staff_id: string
          p_pin: string
        }
        Returns: void
      }
    }
    Enums: {
      user_role: 'super_admin' | 'admin' | 'manager' | 'kitchen' | 'staff'
      staff_status: 'active' | 'inactive' | 'suspended' | 'on_leave'
      order_status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
