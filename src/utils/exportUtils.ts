import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export const exportToExcel = (data: any, type: string, dateRange: { start: string; end: string }) => {
  const formatCurrency = (value: number) => 
    value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  const workbook = XLSX.utils.book_new();
  let worksheet;

  switch (type) {
    case 'sales': {
      // Format hourly data for sales report
      const salesData = data.hourlyData.map((row: any) => ({
        'Hour': row.hour,
        'Number of Orders': row.orders,
        'Total Sales': formatCurrency(row.total)
      }));

      // Add summary data at the beginning
      const summaryData = [
        { 'Summary': 'Value' },
        { 'Summary': 'Total Sales', 'Value': formatCurrency(data.total) },
        { 'Summary': 'Total Orders', 'Value': data.orderCount },
        { 'Summary': 'Peak Hour', 'Value': data.peakHour || 'N/A' },
        { 'Summary': '' }, // Empty row for spacing
      ];

      worksheet = XLSX.utils.json_to_sheet(summaryData, { skipHeader: true });
      XLSX.utils.sheet_add_json(worksheet, salesData, { origin: 'A7' });
      break;
    }

    case 'items': {
      const itemsData = data.items.map((item: any) => ({
        'Item Name': item.name,
        'Category': item.category,
        'Quantity Sold': item.count,
        'Total Sales': formatCurrency(item.total)
      }));
      worksheet = XLSX.utils.json_to_sheet(itemsData);
      break;
    }

    case 'categories': {
      const categoriesData = data.categories.map((category: any) => ({
        'Category': category.name,
        'Total Sales': formatCurrency(category.total)
      }));
      worksheet = XLSX.utils.json_to_sheet(categoriesData);
      break;
    }

    case 'staff': {
      const staffData = data.staff.map((member: any) => ({
        'Staff Member': member.name,
        'Orders Handled': member.orders,
        'Total Sales': formatCurrency(member.total)
      }));
      worksheet = XLSX.utils.json_to_sheet(staffData);
      break;
    }

    default:
      throw new Error('Invalid report type');
  }

  // Auto-size columns
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const cols: XLSX.ColInfo[] = [];
  for (let i = range.s.c; i <= range.e.c; i++) {
    cols[i] = { wch: 15 }; // Set minimum width
  }
  worksheet['!cols'] = cols;

  // Add the worksheet to the workbook
  const reportDate = `${format(new Date(dateRange.start), 'yyyy-MM-dd')}_to_${format(new Date(dateRange.end), 'yyyy-MM-dd')}`;
  const sheetName = `${type.charAt(0).toUpperCase() + type.slice(1)} Report`;
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate and download the file
  XLSX.writeFile(workbook, `${type}_report_${reportDate}.xlsx`);
};