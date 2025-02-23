import { useEffect, useState } from 'react';
import { menuService } from '../services/menuService';
import { useFranchise } from '../contexts/FranchiseContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { MenuItem } from '../types/menu';

interface CategoryTab {
  name: string;
  count: number;
}

interface POSItemProps {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
}

function POSItem({ item, onSelect }: POSItemProps) {
  return (
    <button
      onClick={() => onSelect(item)}
      disabled={!item.is_available}
      className={`p-4 rounded-lg shadow text-left transition-all ${
        item.is_available
          ? 'bg-white hover:bg-gray-50 active:bg-gray-100'
          : 'bg-gray-100 cursor-not-allowed'
      }`}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-medium">{item.name}</h3>
        <div className="text-lg font-semibold">₹{item.price}</div>
      </div>
      {item.description && (
        <p className="text-gray-600 text-sm mt-1">{item.description}</p>
      )}
      {!item.is_available && (
        <span className="text-red-600 text-sm">Not Available</span>
      )}
    </button>
  );
}

function POSItemGrid({ items, onSelect }: { items: MenuItem[]; onSelect: (item: MenuItem) => void }) {
  const availableItems = items.filter(item => item.is_active);

  if (availableItems.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        No items available in this category
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {availableItems.map(item => (
        <POSItem key={item.id} item={item} onSelect={onSelect} />
      ))}
    </div>
  );
}

export default function POS() {
  const { franchise } = useFranchise();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!franchise?.id) return;

    const loadItems = async () => {
      try {
        setLoading(true);
        setError(null);
        const menuItems = await menuService.getMenuItems(franchise.id);
        setItems(menuItems);

        // Set initial category if none selected
        if (!selectedCategory && menuItems.length > 0) {
          setSelectedCategory(menuItems[0].category);
        }
      } catch (err) {
        setError('Failed to load menu items');
        console.error('Error loading menu:', err);
      } finally {
        setLoading(false);
      }
    };

    void loadItems();
  }, [franchise?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => location.reload()}
          className="text-blue-600 hover:text-blue-800"
        >
          Retry
        </button>
      </div>
    );
  }

  const categories = items.reduce<CategoryTab[]>((acc, item) => {
    const existingCategory = acc.find(cat => cat.name === item.category);
    if (existingCategory) {
      existingCategory.count++;
    } else {
      acc.push({ name: item.category, count: 1 });
    }
    return acc;
  }, []);

  const categoryItems = items.filter(
    item => item.category === selectedCategory
  );

  const handleItemSelect = (item: MenuItem) => {
    // TODO: Implement cart functionality
    console.log('Selected item:', item);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Category Tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto py-3 -mb-px space-x-8">
            {categories.map(category => (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedCategory === category.name
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {category.name}
                <span className="ml-2 text-gray-400">({category.count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Item Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <POSItemGrid items={categoryItems} onSelect={handleItemSelect} />
      </div>
    </div>
  );
}