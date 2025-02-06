// src/pages/Reports.tsx
import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useFranchise } from '../contexts/FranchiseContext';
import { processReportData } from '../utils/reportUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import 'react-day-picker/dist/style.css';

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface ReportDisplayProps {
  data: any;
  type: string;
  onSort?: (field: string) => void;
  sortConfig?: { field: string; direction: 'asc' | 'desc' };
}

const SummaryCard = ({ title, value, subValue, className = '' }: any) => (
  <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <p className="text-2xl font-bold mt-2">{value}</p>
    {subValue && <p className="text-sm text-gray-600 mt-1">{subValue}</p>}
  </div>
);

const DateRangePresets = ({
  onSelect,
  selectedDates,
  showPicker,
  onPickerToggle,
  onDateRangeChange
}: {
  onSelect: (start: Date, end: Date) => void;
  selectedDates: [Date | null, Date | null];
  showPicker: boolean;
  onPickerToggle: () => void;
  onDateRangeChange: (dates: [Date | null, Date | null]) => void;
}) => {
  const presets = [
    { label: 'Today', getDates: () => [startOfDay(new Date()), endOfDay(new Date())] },
    { label: 'Last 7 days', getDates: () => [startOfDay(subDays(new Date(), 7)), endOfDay(new Date())] },
    { label: 'Last 30 days', getDates: () => [startOfDay(subDays(new Date(), 30)), endOfDay(new Date())] }
  ];

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {presets.map(({ label, getDates }) => (
          <button
            key={label}
            onClick={() => {
              const [start, end] = getDates();
              onSelect(start, end);
              onDateRangeChange([start, end]);
            }}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              selectedDates[0] && selectedDates[1] &&
              format(selectedDates[0], 'yyyy-MM-dd') === format(getDates()[0], 'yyyy-MM-dd') &&
              format(selectedDates[1], 'yyyy-MM-dd') === format(getDates()[1], 'yyyy-MM-dd')
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={onPickerToggle}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            showPicker ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Custom Range
        </button>
      </div>
      {showPicker && (
        <div className="bg-white p-4 rounded-lg shadow-lg">
          <DayPicker
            mode="range"
            defaultMonth={selectedDates[0] || new Date()}
            selected={{
              from: selectedDates[0] || undefined,
              to: selectedDates[1] || undefined
            }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onDateRangeChange([range.from, range.to]);
                onSelect(startOfDay(range.from), endOfDay(range.to));
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

const ReportDisplay = ({ data, type, onSort, sortConfig }: ReportDisplayProps) => {
  if (!data) return null;

  const renderSortIcon = (field: string) => {
    if (!sortConfig || sortConfig.field !== field) {
      return <span className="text-gray-400 opacity-50">↕️</span>;
    }
    return (
      <span className="text-blue-500">
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const renderSortableHeader = (label: string, field: string) => (
    <th
      className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition-colors duration-150"
      onClick={() => onSort && onSort(field)}
    >
      <span className="flex items-center gap-2 group">
        {label}
        <span className="transform group-hover:scale-110 transition-transform duration-150">
          {renderSortIcon(field)}
        </span>
      </span>
    </th>
  );

  switch (type) {
    case 'sales':
      const avgOrderValue = data.orderCount > 0 ? data.total / data.orderCount : 0;
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              title="Total Sales"
              value={data.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            />
            <SummaryCard
              title="Total Orders"
              value={data.orderCount}
              subValue={data.orderCount > 0
                ? `Avg. ${avgOrderValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} per order`
                : 'No orders'
              }
            />
            <SummaryCard
              title="Peak Hour"
              value={data.peakHour || 'N/A'}
              subValue="Most orders received"
            />
          </div>
          
          <div className="h-[300px] mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourlyData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );

    case 'items':
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4">Popular Items</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {renderSortableHeader('Item', 'name')}
                    {renderSortableHeader('Quantity Sold', 'count')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {data.items.map((item: any) => (
                    <tr key={item.name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{item.name}</td>
                      <td className="px-6 py-4 text-right tabular-nums">{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4">Top Items Distribution</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.items.slice(0, 5)}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {data.items.slice(0, 5).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      );

    case 'categories':
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4">Category Analysis</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {renderSortableHeader('Category', 'name')}
                    {renderSortableHeader('Total Sales', 'total')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {data.categories.map((category: any) => (
                    <tr key={category.name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{category.name}</td>
                      <td className="px-6 py-4 text-right tabular-nums">
                        {category.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-4">Category Distribution</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categories}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {data.categories.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      );

    case 'staff':
      return (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Staff Performance</h3>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {renderSortableHeader('Staff Member', 'name')}
                  {renderSortableHeader('Orders', 'orders')}
                  {renderSortableHeader('Total Sales', 'total')}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.staff.map((staff: any) => (
                  <tr key={staff.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{staff.name}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{staff.orders}</td>
                    <td className="px-6 py-4 text-right tabular-nums">
                      {staff.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.staff}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#0088FE" name="Total Sales" />
                <Bar dataKey="orders" fill="#00C49F" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );

    default:
      return null;
  }
};

export default function Reports() {
  const { profile } = useAuth();
  const { settings } = useFranchise();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    start: format(startOfDay(new Date()), 'yyyy-MM-dd'),
    end: format(endOfDay(new Date()), 'yyyy-MM-dd')
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDates, setSelectedDates] = useState<[Date | null, Date | null]>([null, null]);
  const [reportType, setReportType] = useState('sales');
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | undefined>(undefined);

  const handleDateRangeSelect = (start: Date, end: Date) => {
    setDateRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    });
  };

  const handleSort = (field: string) => {
    setSortConfig(current => {
      if (current?.field === field) {
        return { field, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'asc' };
    });
  };

  const sortedData = useMemo(() => {
    if (!reportData || !sortConfig) return reportData;

    const { field, direction } = sortConfig;
    const dataKey = reportType === 'items' ? 'items' :
                   reportType === 'categories' ? 'categories' :
                   reportType === 'staff' ? 'staff' : null;

    if (!dataKey || !reportData[dataKey]) return reportData;

    const sorted = [...reportData[dataKey]].sort((a, b) => {
      if (a[field] < b[field]) return direction === 'asc' ? -1 : 1;
      if (a[field] > b[field]) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return {
      ...reportData,
      [dataKey]: sorted
    };
  }, [reportData, sortConfig, reportType]);

  const downloadReport = async () => {
    if (!reportData) return;

    try {
      const XLSX = await import('xlsx');
      let worksheetData: any[] = [];

      switch (reportType) {
        case 'sales':
          worksheetData = [
            ['Sales Report', '', ''],
            ['Date Range:', `${dateRange.start} to ${dateRange.end}`, ''],
            ['', '', ''],
            ['Total Sales:', reportData.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }), ''],
            ['Total Orders:', reportData.orderCount, ''],
            ['Average Order Value:', reportData.orderCount > 0
              ? (reportData.total / reportData.orderCount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
              : 'No orders', ''],
            ['Peak Hour:', reportData.peakHour, ''],
            ['', '', ''],
            ['Hour', 'Orders', ''],
            ...reportData.hourlyData.map((data: any) => [data.hour, data.orders])
          ];
          break;

        case 'items':
          worksheetData = [
            ['Items Report', '', ''],
            ['Date Range:', `${dateRange.start} to ${dateRange.end}`, ''],
            ['', '', ''],
            ['Item Name', 'Quantity Sold', ''],
            ...reportData.items.map((item: any) => [item.name, item.count])
          ];
          break;

        case 'categories':
          worksheetData = [
            ['Categories Report', '', ''],
            ['Date Range:', `${dateRange.start} to ${dateRange.end}`, ''],
            ['', '', ''],
            ['Category', 'Total Sales', ''],
            ...reportData.categories.map((cat: any) => [
              cat.name,
              cat.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
            ])
          ];
          break;

        case 'staff':
          worksheetData = [
            ['Staff Report', '', ''],
            ['Date Range:', `${dateRange.start} to ${dateRange.end}`, ''],
            ['', '', ''],
            ['Staff Member', 'Orders', 'Total Sales'],
            ...reportData.staff.map((staff: any) => [
              staff.name,
              staff.orders,
              staff.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
            ])
          ];
          break;
      }

      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');

      // Auto-size columns
      const colWidths = worksheetData.reduce((widths: number[], row) => {
        row.forEach((cell: any, i: number) => {
          const cellLength = (cell?.toString() || '').length;
          widths[i] = Math.max(widths[i] || 0, cellLength);
        });
        return widths;
      }, []);

      ws['!cols'] = colWidths.map(width => ({ wch: width + 2 }));

      XLSX.writeFile(wb, `${reportType}_report_${dateRange.start}_${dateRange.end}.xlsx`);
    } catch (error) {
      toast.error('Error downloading report');
    }
  };

  const generateReport = async () => {
    if (!profile?.franchise_id) {
      toast.error('No franchise ID available');
      return;
    }

    setLoading(true);
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          created_at,
          server_name,
          order_items (
            name,
            quantity,
            price,
            category,
            menu_item_id
          )
        `)
        .eq('franchise_id', profile.franchise_id)
        .gte('created_at', `${dateRange.start}T00:00:00`)
        .lt('created_at', `${dateRange.end}T23:59:59.999Z`);

      if (error) throw error;

      const processed = processReportData(orders, reportType);
      setReportData(processed);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  // Call generateReport when date range or report type changes
  React.useEffect(() => {
    generateReport();
  }, [dateRange.start, dateRange.end, reportType]);

  return (
    <div className="p-6">
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Reports</h2>
          <button
            onClick={downloadReport}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={!reportData}
          >
            Download Report
          </button>
        </div>

        <div className="flex flex-wrap gap-4 items-start">
          <div className="flex-1">
            <DateRangePresets
              onSelect={handleDateRangeSelect}
              selectedDates={selectedDates}
              showPicker={showDatePicker}
              onPickerToggle={() => setShowDatePicker(!showDatePicker)}
              onDateRangeChange={setSelectedDates}
            />
          </div>
          <div className="flex items-center gap-4">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="px-3 py-1 border rounded"
            >
              <option value="sales">Sales Report</option>
              <option value="items">Items Report</option>
              <option value="categories">Categories Report</option>
              <option value="staff">Staff Report</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <ReportDisplay
          data={sortedData}
          type={reportType}
          onSort={handleSort}
          sortConfig={sortConfig}
        />
      )}
    </div>
  );
}
