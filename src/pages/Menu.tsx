import React, { useState, useEffect } from 'react';
import { MenuItem, Category } from '../types';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useFranchise } from '../contexts/FranchiseContext';
import { MenuService } from '../services/menuService';

interface MenuItemFormData {
  name: string;
  price: number;
  category: string;
  description: string | null;
  is_available: boolean;
  tax_rate: number;
}

export default function Menu() {
  const { profile } = useAuth();
  const { settings } = useFranchise();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof MenuItem;
    direction: 'asc' | 'desc';
  }>({ key: 'name', direction: 'asc' });

  const initialFormData: MenuItemFormData = {
    name: '',
    price: 0,
    category: '',
    description: null,
    is_available: true,
    tax_rate: settings?.tax_rate ? parseFloat(String(settings.tax_rate)) : 0
  };

  const [formData, setFormData] = useState<MenuItemFormData>(initialFormData);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    if (!profile?.franchise_id) {
      toast.error('No franchise ID available');
      return;
    }

    try {
      setLoading(true);
      const items = await MenuService.getMenuItems(profile.franchise_id);
      setItems(items);
      
      // Get unique categories from items
      // Fetch categories from menu items
      const uniqueCategories = Array.from(new Set(items.map(item => item.category)))
        .map(name => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name }));
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.franchise_id) {
      toast.error('No franchise ID available');
      return;
    }

    try {
      if (editingItem) {
        await MenuService.updateMenuItem(editingItem.id, formData);
        toast.success('Item updated successfully');
      } else {
        const { description, ...rest } = formData;
        await MenuService.addMenuItem(
          profile.franchise_id,
          { ...rest, franchise_id: profile.franchise_id, is_active: true, details: description } as Omit<MenuItem, "id" | "created_at" | "updated_at"> & { details: string | null }
        );
        toast.success('Item added successfully');
      }
      
      setIsAddingItem(false);
      setEditingItem(null);
      setFormData(initialFormData);
      fetchMenuItems();
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast.error('Failed to save menu item');
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price,
      category: item.category,
      description: item.description,
      is_available: item.is_available,
      tax_rate: item.tax_rate
    });
    setIsAddingItem(true);
  };

  const handleDelete = async (ids: string[]) => {
    if (!window.confirm(`Are you sure you want to delete ${ids.length} item(s)?`)) return;
    
    try {
      await MenuService.deleteMenuItems(ids);
      toast.success(`${ids.length} item(s) deleted successfully`);
      setSelectedItems([]);
      fetchMenuItems();
    } catch (error) {
      console.error('Error deleting items:', error);
      toast.error('Failed to delete items');
    }
  };

  const handleToggleAvailability = async (itemId: string, currentStatus: boolean) => {
    try {
      await MenuService.toggleItemAvailability(itemId, !currentStatus);
      toast.success(`Item ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
      fetchMenuItems();
    } catch (error) {
      console.error('Error updating item availability:', error);
      toast.error('Failed to update item availability');
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleAllItems = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  const handleSort = (key: keyof MenuItem) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const compareValues = (aValue: any, bValue: any): number => {
    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return -1;
    if (bValue === null) return 1;

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  };

  // Filter and search logic
  const filteredItems = items
    .filter(item => 
      (selectedCategory === 'all' || item.category === selectedCategory) &&
      (searchQuery === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
    .sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      return compareValues(aValue, bValue);
    });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Menu Management</h1>
        <div className="flex gap-2">
          {selectedItems.length > 0 && (
            <button
              onClick={() => handleDelete(selectedItems)}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Delete Selected ({selectedItems.length})
            </button>
          )}
          <button
            onClick={() => {
              setEditingItem(null);
              setFormData(initialFormData);
              setIsAddingItem(true);
            }}
            className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
          >
            Add New Item
          </button>
        </div>
      </div>

      {/* Category Management Section */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Categories</h2>
          <button
            onClick={() => setIsAddingCategory(true)}
            className="bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 text-sm"
          >
            Add Category
          </button>
        </div>

        {isAddingCategory && (
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Enter new category name"
              className="flex-1 px-3 py-1 border rounded-md focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={() => {
                if (newCategory.trim()) {
                  const categoryId = newCategory.toLowerCase().replace(/\s+/g, '-');
                  setCategories(prev => [...prev, { id: categoryId, name: newCategory.trim() }]);
                  setNewCategory('');
                  setIsAddingCategory(false);
                }
              }}
              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setNewCategory('');
                setIsAddingCategory(false);
              }}
              className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex justify-between items-center bg-gray-100 p-2 rounded"
            >
              <span>{category.name}</span>
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${category.name}" category?`)) {
                    setCategories(prev => prev.filter(c => c.id !== category.id));
                  }
                }}
                className="text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 space-y-4">
        <input
          type="text"
          placeholder="Search menu items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-orange-500"
        />

        {/* Categories with horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-orange-400 scrollbar-track-transparent">
          <button
            key="all"
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.name)}
              className={`px-4 py-2 rounded-full whitespace-nowrap ${
                selectedCategory === category.name
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                    onChange={toggleAllItems}
                    className="rounded border-gray-300"
                  />
                </th>
                {['name', 'category', 'price', 'is_available'].map((key) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key as keyof MenuItem)}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                    {sortConfig.key === key && (
                      <span className="ml-2">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                ))}
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">{item.name}</td>
                  <td className="px-6 py-4">{item.category}</td>
                  <td className="px-6 py-4">₹{item.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleAvailability(item.id, item.is_available)}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.is_available
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete([item.id])}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isAddingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Price
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  list="categories"
                />
                <datalist id="categories">
                  {categories.map(category => (
                    <option key={category.id} value={category.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={e => setFormData({...formData, description: e.target.value || null})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingItem(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  {editingItem ? 'Update' : 'Add'} Item
                </button>
              </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              );
            }
