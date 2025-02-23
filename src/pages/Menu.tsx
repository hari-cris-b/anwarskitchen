import { useState, useEffect } from 'react';
import { menuService } from '../services/menuService';
import { useFranchise } from '../contexts/FranchiseContext';
import { useAuth } from '../contexts/AuthContext';
import {
  MenuItem,
  MenuItemCreate,
  CategoryGroup,
  Category
} from '../types/menu';
import Button from '../components/Button';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';

interface MenuItemFormData {
  name: string;
  description: string | null;
  price: number;
  category: string;
  is_available: boolean;
  tax_rate: number;
}

interface MenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MenuItemFormData) => void;
  initialData?: MenuItem;
}

function MenuItemModal({ isOpen, onClose, onSubmit, initialData }: MenuItemModalProps) {
  const [formData, setFormData] = useState<MenuItemFormData>({
    name: initialData?.name || '',
    description: initialData?.description || null,
    price: initialData?.price || 0,
    category: initialData?.category || 'Main Course',
    is_available: initialData?.is_available ?? true,
    tax_rate: initialData?.tax_rate || 5
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (formData.price <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Item' : 'Add Menu Item'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorAlert message={error} />}
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <input
            type="text"
            value={formData.category}
            onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Price</label>
          <input
            type="number"
            value={formData.price}
            onChange={e => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
          <input
            type="number"
            value={formData.tax_rate}
            onChange={e => setFormData(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={formData.description || ''}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={formData.is_available}
            onChange={e => setFormData(prev => ({ ...prev, is_available: e.target.checked }))}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">Available</label>
        </div>

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Menu() {
  const { franchise } = useFranchise();
  const { profile } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (!franchise?.id) return;

    const loadItems = async () => {
      try {
        const menuItems = await menuService.getMenuItems(franchise.id);
        setItems(menuItems);
      } catch (err) {
        setError('Failed to load menu items');
        console.error('Error loading menu:', err);
      } finally {
        setLoading(false);
      }
    };

    void loadItems();
  }, [franchise?.id]);

  const handleAddItem = async (data: MenuItemFormData) => {
    if (!franchise?.id) return;

    try {
      const newItem = await menuService.addMenuItem({
        ...data,
        franchise_id: franchise.id,
        is_active: true,
        image_url: null
      });

      setItems(prev => [...prev, newItem]);
      setModalOpen(false);
    } catch (err) {
      setError('Failed to add menu item');
      console.error('Error adding item:', err);
    }
  };

  const handleUpdateItem = async (data: MenuItemFormData) => {
    if (!editingItem) return;

    try {
      const updatedItem = await menuService.updateMenuItem({
        ...data,
        id: editingItem.id
      });

      setItems(prev => prev.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      ));
      setModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      setError('Failed to update menu item');
      console.error('Error updating item:', err);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await menuService.deleteMenuItem(id);
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError('Failed to delete menu item');
      console.error('Error deleting item:', err);
    }
  };

  const groupedItems = items.reduce((acc: Record<Category, MenuItem[]>, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<Category, MenuItem[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Menu Items</h1>
        {profile?.can_modify_menu && (
          <Button onClick={() => setModalOpen(true)}>Add Item</Button>
        )}
      </div>

      {error && <ErrorAlert message={error} className="mb-4" />}

      {Object.entries(groupedItems).map(([category, items]) => (
        <div key={category} className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => (
              <div
                key={item.id}
                className={`p-4 rounded-lg shadow ${
                  item.is_available ? 'bg-white' : 'bg-gray-100'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-medium">{item.name}</h3>
                  <div className="text-lg font-semibold">₹{item.price}</div>
                </div>
                {item.description && (
                  <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-sm ${
                    item.is_available ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.is_available ? 'Available' : 'Not Available'}
                  </span>
                  {profile?.can_modify_menu && (
                    <div className="space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <MenuItemModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={editingItem ? handleUpdateItem : handleAddItem}
        initialData={editingItem || undefined}
      />
    </div>
  );
}
