import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useFranchise } from '../contexts/FranchiseContext';
import { processReportData } from '../utils/reportUtils';
import { exportToExcel } from '../utils/exportUtils';
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

interface ReportItem {
  name: string;
  count: number;
  total: number;
  category: string;
}

interface CategoryData {
  name: string;
  total: number;
}

interface StaffData {
  name: string;
  orders: number;
  total: number;
}

interface SalesData {
  total: number;
  orderCount: number;
  peakHour: string | null;
  hourlyData: Array<{ hour: string; orders: number; total: number }>;
}

type ReportType = 'sales' | 'items' | 'categories' | 'staff';

type ReportData = SalesData | { items: ReportItem[] } | { categories: CategoryData[] } | { staff: StaffData[] };

interface ReportDisplayProps {
  data: ReportData | null;
  type: ReportType;
  onSort?: (field: string) => void;
  sortConfig?: { field: string; direction: 'asc' | 'desc' };
  onExport?: () => void;
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

  const selectedRange = selectedDates[0] && selectedDates[1]
    ? `${format(selectedDates[0], 'MMM d, yyyy')} - ${format(selectedDates[1], 'MMM d, yyyy')}`
    : 'Select date range';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="grid grid-cols-3 gap-2 flex-grow">
          {presets.map(({ label, getDates }) => {
            const isSelected = selectedDates[0] && selectedDates[1] &&
              format(selectedDates[0], 'yyyy-MM-dd') === format(getDates()[0], 'yyyy-MM-dd') &&
              format(selectedDates[1], 'yyyy-MM-dd') === format(getDates()[1], 'yyyy-MM-dd');

            return (
              <button
                key={label}
                onClick={() => {
                  const [start, end] = getDates();
                  onSelect(start, end);
                  onDateRangeChange([start, end]);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-transparent ring-2 ring-indigo-600 ring-offset-2'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-indigo-500'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          onClick={onPickerToggle}
          className="relative inline-flex items-center justify-between px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-indigo-500 transition-colors duration-200 min-w-[200px]"
        >
          <span className={selectedDates[0] && selectedDates[1] ? 'text-gray-900' : 'text-gray-500'}>
            {selectedRange}
          </span>
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {showPicker && (
        <div className="absolute z-50 mt-2">
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onPickerToggle} />
          <div className="relative bg-white p-6 rounded-lg shadow-xl border border-gray-200">
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
                  onPickerToggle();
                }
              }}
              styles={{
                months: { display: 'flex', gap: '1rem' },
                table: { margin: '0', width: 'auto' },
                head_cell: { color: '#6B7280', fontWeight: '500' },
                cell: { width: '40px', height: '40px' },
                day: { margin: '0', width: '36px', height: '36px' },
                nav: { display: 'flex', justifyContent: 'space-between' },
                caption: { textAlign: 'center', margin: '0.5rem 0', color: '#111827', fontWeight: '600' }
              }}
              modifiersStyles={{
                selected: { backgroundColor: '#4f46e5', color: 'white' },
                range_start: { backgroundColor: '#4f46e5', color: 'white' },
                range_end: { backgroundColor: '#4f46e5', color: 'white' },
                range_middle: { backgroundColor: '#eef2ff', color: '#4f46e5' }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const ReportDisplay = ({ data, type, onSort, sortConfig, onExport }: ReportDisplayProps) => {
  if (!data) return null;

  const isSalesType = (d: ReportData): d is SalesData => {
    return 'total' in d && 'orderCount' in d && 'hourlyData' in d;
  };

  const isItemsType = (d: ReportData): d is { items: ReportItem[] } => {
    return 'items' in d;
  };

  const isCategoriesType = (d: ReportData): d is { categories: CategoryData[] } => {
    return 'categories' in d;
  };

  const isStaffType = (d: ReportData): d is { staff: StaffData[] } => {
    return 'staff' in d;
  };

  const renderSortIcon = (field: string) => {
    if (!sortConfig || sortConfig.field !== field) {
      return <span className="text-gray-400 opacity-50">↕️</span>;
    }
    return (
      <span className="text-indigo-600">
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
    case 'sales': {
      if (!isSalesType(data)) return null;
      const { total, orderCount, peakHour, hourlyData } = data;
      const avgOrderValue = orderCount > 0 ? total / orderCount : 0;
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow">
              <SummaryCard
                title="Total Sales"
                value={total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
              />
              <SummaryCard
                title="Total Orders"
                value={orderCount}
                subValue={orderCount > 0
                  ? `Avg. ${avgOrderValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} per order`
                  : 'No orders'
                }
              />
              <SummaryCard
                title="Peak Hour"
                value={peakHour || 'N/A'}
                subValue="Most orders received"
              />
            </div>
            {/* {renderExportButton()} */}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
            <h2 className="text-lg font-semibold mb-6">Daily Sales Trend</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }

    case 'items': {
      if (!isItemsType(data)) return null;
      const { items } = data;

      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Popular Items</h2>
                {/* {renderExportButton()} */}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {renderSortableHeader('Item Name', 'name')}
                      {renderSortableHeader('Category', 'category')}
                      {renderSortableHeader('Quantity', 'count')}
                      {renderSortableHeader('Total Sales', 'total')}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item) => (
                      <tr key={item.name} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{item.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{item.count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {item.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <h2 className="text-lg font-semibold mb-6">Top Items Distribution</h2>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={items.slice(0, 5)}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {items.slice(0, 5).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      );
    }

    case 'categories': {
      if (!isCategoriesType(data)) return null;
      const { categories } = data;

      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Categories Analysis</h2>
                {/* {renderExportButton()} */}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {renderSortableHeader('Category', 'name')}
                      {renderSortableHeader('Total Sales', 'total')}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {categories.map((category) => (
                      <tr key={category.name} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{category.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {category.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <h2 className="text-lg font-semibold mb-6">Category Distribution</h2>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {categories.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      );
    }

    case 'staff': {
      if (!isStaffType(data)) return null;
      const { staff } = data;

      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Staff Performance</h2>
                {/* {renderExportButton()} */}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {renderSortableHeader('Staff Member', 'name')}
                      {renderSortableHeader('Orders', 'orders')}
                      {renderSortableHeader('Total Sales', 'total')}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {staff.map((member) => (
                      <tr key={member.name} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{member.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{member.orders}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {member.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <h2 className="text-lg font-semibold mb-6">Staff Sales Distribution</h2>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={staff}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {staff.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
};

export default function Reports() {
  const { profile } = useAuth();
  const { settings } = useFranchise();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dateRange, setDateRange] = useState({
    start: format(startOfDay(new Date()), 'yyyy-MM-dd'),
    end: format(endOfDay(new Date()), 'yyyy-MM-dd')
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDates, setSelectedDates] = useState<[Date | null, Date | null]>([null, null]);
  const [reportType, setReportType] = useState<ReportType>('sales');
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

  const handleExport = () => {
    if (reportData) {
      try {
        exportToExcel(reportData, reportType, dateRange);
        toast.success('Report exported successfully');
      } catch (error) {
        console.error('Error exporting report:', error);
        toast.error('Failed to export report');
      }
    }
  };

  const sortedData = useMemo(() => {
    if (!reportData || !sortConfig) return reportData;

    const { field, direction } = sortConfig;
    const compareValues = (a: any, b: any) => {
      if (a[field] < b[field]) return direction === 'asc' ? -1 : 1;
      if (a[field] > b[field]) return direction === 'asc' ? 1 : -1;
      return 0;
    };

    const data = { ...reportData };
    switch (reportType) {
      case 'sales': {
        if ('hourlyData' in data && Array.isArray(data.hourlyData)) {
          return {
            ...data,
            hourlyData: [...data.hourlyData].sort(compareValues)
          };
        }
        break;
      }
      case 'items': {
        if ('items' in data && Array.isArray(data.items)) {
          return {
            ...data,
            items: [...data.items].sort(compareValues)
          };
        }
        break;
      }
      case 'categories': {
        if ('categories' in data && Array.isArray(data.categories)) {
          return {
            ...data,
            categories: [...data.categories].sort(compareValues)
          };
        }
        break;
      }
      case 'staff': {
        if ('staff' in data && Array.isArray(data.staff)) {
          return {
            ...data,
            staff: [...data.staff].sort(compareValues)
          };
        }
        break;
      }
    }
    return data;
  }, [reportData, sortConfig, reportType]);

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
            quantity,
            price_at_time,
            menu_items (
              id,
              name,
              category
            )
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

  React.useEffect(() => {
    generateReport();
  }, [dateRange.start, dateRange.end, reportType]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
              <p className="mt-1 text-sm text-gray-600">
                View and analyze your business performance
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  className="w-full appearance-none bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-2 text-sm font-medium text-gray-700 hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors duration-200"
                >
                  <option value="sales">Sales Report</option>
                  <option value="items">Items Report</option>
                  <option value="categories">Categories Report</option>
                  <option value="staff">Staff Report</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              <button
                onClick={handleExport}
                disabled={!sortedData}
                className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors duration-200 ${
                  !sortedData
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Export to Excel
              </button>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Select Date Range</h3>
            <DateRangePresets
              onSelect={handleDateRangeSelect}
              selectedDates={selectedDates}
              showPicker={showDatePicker}
              onPickerToggle={() => setShowDatePicker(!showDatePicker)}
              onDateRangeChange={setSelectedDates}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow-sm">
            <LoadingSpinner />
            {/* <p className="mt-4 text-sm text-gray-600">report data</p> */}
          </div>
        ) : !sortedData ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow-sm">
            <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-sm text-gray-600">No report data available for the selected date range</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm">
            <ReportDisplay
              data={sortedData}
              type={reportType}
              onSort={handleSort}
              sortConfig={sortConfig}
              onExport={handleExport}
            />
          </div>
        )}
      </div>
    </div>
  );
}
