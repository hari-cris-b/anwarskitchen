import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFranchise } from '../contexts/FranchiseContext';
import { MenuItem, CartItem, CreateOrderRequest, BillCalculation } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { toast } from 'react-hot-toast';
import { MenuService } from '../services/menuService';
import { OrderService } from '../services/orderService';

export default function POS() {
  const { profile } = useAuth();
  const { settings, loading: franchiseLoading, error: franchiseError } = useFranchise();
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadMenuItems = async () => {
      try {
        // Wait for franchise settings to be loaded
        if (franchiseLoading) {
          return;
        }

        // Show franchise error if any
        if (franchiseError) {
          setError(franchiseError);
          return;
        }

        if (!profile?.franchise_id) {
          setError('No franchise associated with your account. Please contact your administrator.');
          return;
        }

        setLoading(true);
        setError(null);

        // Use MenuService to get menu items
        const menuData = await MenuService.getMenuItems(profile.franchise_id);
        
        if (mounted) {
          setMenuItems(menuData);
          // Extract unique categories
          const uniqueCategories = Array.from(new Set(menuData.map(item => item.category)));
          setCategories(['all', ...uniqueCategories]);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading menu items:', err);
        if (mounted) {
          setError('Failed to load menu items. Please try again.');
          setLoading(false);
        }
      }
    };

    loadMenuItems();

    return () => {
      mounted = false;
    };
  }, [profile?.franchise_id, franchiseLoading, franchiseError]);

  const calculateBill = (items: CartItem[]): BillCalculation => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxRate = settings?.tax_rate || 0;
    const tax = (subtotal * taxRate) / 100;
    const total = Math.round(subtotal + tax);

    return {
      subtotal,
      tax,
      total
    };
  };

  const handleAddToCart = (item: MenuItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    setCart(prevCart => {
      if (newQuantity === 0) {
        return prevCart.filter(item => item.id !== itemId);
      }
      return prevCart.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const handlePlaceOrder = async () => {
    try {
      if (isSubmitting) return;

      if (!profile?.franchise_id) {
        throw new Error('No franchise ID available');
      }

      if (!tableNumber) {
        toast.error('Please enter a table number');
        return;
      }

      if (cart.length === 0) {
        toast.error('Cart is empty');
        return;
      }

      setIsSubmitting(true);
      const bill = calculateBill(cart);
      const orderData: CreateOrderRequest = {
        table_number: tableNumber,
        server_id: profile.id,
        server_name: profile.full_name ?? profile.email,
        franchise_id: profile.franchise_id,
        status: 'pending',
        payment_status: 'unpaid',
        subtotal: bill.subtotal,
        tax: bill.tax,
        total: bill.total,
        items: cart.map(item => ({
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
          tax_rate: item.tax_rate
        }))
      };

      const { error: orderError } = await OrderService.placeOrder(orderData);

      if (orderError) {
        throw orderError;
      }

      toast.success('Order placed successfully');
      setCart([]);
      setTableNumber('');
    } catch (err) {
      console.error('Error placing order:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || franchiseLoading) {
    return <LoadingSpinner fullScreen text="Loading menu items..." />;
  }

  if (error || franchiseError) {
    return <ErrorAlert message={error || franchiseError || 'An error occurred'} />;
  }

  const filteredItems = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);

  const bill = calculateBill(cart);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Menu Section */}
        <div className="w-full md:w-2/3">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Menu</h2>
            <div className="flex gap-2 mb-4 overflow-x-auto">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full ${
                  selectedCategory === 'all'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.filter(cat => cat !== 'all').map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap ${
                    selectedCategory === category
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            
            {filteredItems.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No items found in this category</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleAddToCart(item)}
                  >
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-gray-600">₹{item.price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-full md:w-1/3">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Cart</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Table Number
              </label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter table number"
              />
            </div>

            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Cart is empty</p>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">₹{item.price.toFixed(2)} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-1 bg-gray-100 rounded"
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-1 bg-gray-100 rounded"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{bill.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax ({settings?.tax_rate || 0}%)</span>
                    <span>₹{bill.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t">
                    <span>Total</span>
                    <span>₹{bill.total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                  className={`w-full mt-4 px-4 py-2 bg-orange-600 text-white rounded-md ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-700'
                  }`}
                >
                  {isSubmitting ? 'Placing Order...' : 'Place Order'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}