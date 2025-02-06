// src/utils/reportUtils.ts
interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  category: string;
  menu_item_id: string;
}

interface Order {
  id: string;
  total: number;
  order_items: OrderItem[];
  server_name: string;
  created_at: string;
}
  
  interface ReportData {
    peakHour: string;
    hourlyData: { hour: number; orders: number; }[];
    orderCount: number;
    total: number;
    items: Array<{ name: string; count: number }>;
    categories: Array<{ name: string; total: number }>;
    staff: Array<{ name: string; orders: number; total: number }>;
  }
  
  interface ItemCount {
    [key: string]: number;
  }
  
  interface CategoryTotal {
    [key: string]: number;
  }
  
  interface StaffStats {
    [key: string]: {
      orders: number;
      total: number;
    };
  }
  
  export const processReportData = (data: Order[], reportType: string): ReportData => {
    const result: ReportData = {
      total: 0,
      items: [],
      categories: [],
      staff: [],
      orderCount: 0,
      peakHour: "",
      hourlyData: []
    };
  
    switch (reportType) {
      case 'sales':
        result.total = data.reduce((sum, order) => sum + (order.total || 0), 0);
        result.orderCount = data.length;
        
        // Calculate hourly data
        const hourlyData = new Array(24).fill(0).map((_, i) => ({
          hour: i,
          orders: 0
        }));
        
        data.forEach(order => {
          const hour = new Date(order.created_at).getHours();
          hourlyData[hour].orders++;
        });
        
        // Find peak hour
        const peakHour = hourlyData.reduce((peak, current, index) =>
          current.orders > hourlyData[peak].orders ? index : peak, 0);
        
        result.hourlyData = hourlyData;
        result.peakHour = `${peakHour}:00`;
        break;
  
      case 'items':
        const itemCounts: ItemCount = data.reduce((acc, order) => {
          if (order.order_items && Array.isArray(order.order_items)) {
            order.order_items.forEach((item) => {
              if (!acc[item.name]) acc[item.name] = 0;
              acc[item.name] += item.quantity;
            });
          }
          return acc;
        }, {} as ItemCount);
  
        result.items = Object.entries(itemCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
        break;
  
      case 'categories':
        const categoryTotals: CategoryTotal = data.reduce((acc, order) => {
          if (order.order_items && Array.isArray(order.order_items)) {
            order.order_items.forEach((item: OrderItem) => {
              if (!acc[item.category]) acc[item.category] = 0;
              acc[item.category] += item.price * item.quantity;
            });
          }
          return acc;
        }, {} as CategoryTotal);
  
        result.categories = Object.entries(categoryTotals)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total);
        break;
  
      case 'staff':
        const staffStats: StaffStats = data.reduce((acc, order) => {
          const staff = order.server_name || 'Unknown';
          if (!acc[staff]) {
            acc[staff] = { orders: 0, total: 0 };
          }
          acc[staff].orders++;
          acc[staff].total += order.total || 0;
          return acc;
        }, {} as StaffStats);

        // Ensure we have at least one staff entry
        if (Object.keys(staffStats).length === 0) {
          staffStats['No Data'] = { orders: 0, total: 0 };
        }
  
        result.staff = Object.entries(staffStats)
          .map(([name, stats]) => ({
            name,
            orders: stats.orders,
            total: stats.total
          }))
          .sort((a, b) => b.total - a.total);
        break;
    }
  
    return result;
  };