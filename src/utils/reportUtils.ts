import { format, addHours, startOfHour, endOfHour } from 'date-fns';

interface HourlyStat {
  orders: number;
  total: number;
}

interface ItemStat {
  count: number;
  total: number;
  category: string;
}

interface CategoryStat {
  total: number;
}

interface StaffStat {
  orders: number;
  total: number;
}

interface SalesReport {
  total: number;
  orderCount: number;
  peakHour: string | null;
  hourlyData: Array<{ hour: string; orders: number; total: number }>;
}

interface ItemsReport {
  items: Array<{ name: string; count: number; total: number; category: string }>;
}

interface CategoriesReport {
  categories: Array<{ name: string; total: number }>;
}

interface StaffReport {
  staff: Array<{ name: string; orders: number; total: number }>;
}

type Report = SalesReport | ItemsReport | CategoriesReport | StaffReport;

const generateEmptyHours = () => {
  const hours: { [key: string]: HourlyStat } = {};
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0');
    hours[`${hour}:00`] = { orders: 0, total: 0 };
  }
  return hours;
};

export const processReportData = (orders: any[], type: string): Report => {
  if (!orders || orders.length === 0) {
    switch (type) {
      case 'sales':
        return {
          total: 0,
          orderCount: 0,
          peakHour: null,
          hourlyData: Object.entries(generateEmptyHours()).map(([hour, stats]) => ({
            hour,
            orders: stats.orders,
            total: stats.total
          }))
        } as SalesReport;
      case 'items':
        return {
          items: []
        } as ItemsReport;
      case 'categories':
        return {
          categories: []
        } as CategoriesReport;
      case 'staff':
        return {
          staff: []
        } as StaffReport;
      default:
        return {
          total: 0,
          orderCount: 0,
          peakHour: null,
          hourlyData: []
        } as SalesReport;
    }
  }

  switch (type) {
    case 'sales': {
      const hourlyStats = generateEmptyHours();
      let totalSales = 0;

      orders.forEach(order => {
        const orderDate = new Date(order.created_at);
        const hour = format(orderDate, 'HH:00');
        hourlyStats[hour].orders++;
        hourlyStats[hour].total += order.total || 0;
        totalSales += order.total || 0;
      });

      const hourlyData = Object.entries(hourlyStats)
        .map(([hour, stats]) => ({
          hour,
          orders: stats.orders,
          total: stats.total
        }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      const peakHour = hourlyData.reduce((max, curr) => 
        curr.orders > (max?.orders || 0) ? curr : max
      , hourlyData[0])?.hour || null;

      return {
        total: totalSales,
        orderCount: orders.length,
        peakHour,
        hourlyData
      } as SalesReport;
    }

    case 'items': {
      const itemStats: { [key: string]: ItemStat } = {};

      orders.forEach(order => {
        order.order_items?.forEach((item: any) => {
          const menuItem = item.menu_items;
          const itemName = menuItem?.name || 'Unknown Item';
          const price = item.price_at_time || 0;
          const quantity = item.quantity || 0;

          if (!itemStats[itemName]) {
            itemStats[itemName] = { 
              count: 0, 
              total: 0,
              category: menuItem?.category || 'Uncategorized'
            };
          }
          itemStats[itemName].count += quantity;
          itemStats[itemName].total += price * quantity;
        });
      });

      return {
        items: Object.entries(itemStats)
          .map(([name, stats]) => ({
            name,
            count: stats.count,
            total: stats.total,
            category: stats.category
          }))
          .sort((a, b) => b.total - a.total)
      } as ItemsReport;
    }

    case 'categories': {
      const categoryStats: { [key: string]: CategoryStat } = {};

      orders.forEach(order => {
        order.order_items?.forEach((item: any) => {
          const menuItem = item.menu_items;
          const category = menuItem?.category || 'Uncategorized';
          const price = item.price_at_time || 0;
          const quantity = item.quantity || 0;

          if (!categoryStats[category]) {
            categoryStats[category] = { total: 0 };
          }
          categoryStats[category].total += price * quantity;
        });
      });

      return {
        categories: Object.entries(categoryStats)
          .map(([name, { total }]) => ({
            name,
            total
          }))
          .sort((a, b) => b.total - a.total)
      } as CategoriesReport;
    }

    case 'staff': {
      const staffStats: { [key: string]: StaffStat } = {};

      orders.forEach(order => {
        const staffName = order.server_name || 'Unknown';
        if (!staffStats[staffName]) {
          staffStats[staffName] = { orders: 0, total: 0 };
        }
        staffStats[staffName].orders++;
        staffStats[staffName].total += order.total || 0;
      });

      return {
        staff: Object.entries(staffStats)
          .map(([name, stats]) => ({
            name,
            orders: stats.orders,
            total: stats.total
          }))
          .sort((a, b) => b.total - a.total)
      } as StaffReport;
    }

    default:
      return { items: [] };
  }
};