import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFranchise } from '../contexts/FranchiseContext';
import { MenuItem, CartItem, BillCalculation } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import StaffPin from '../components/StaffPin';
import { toast } from 'react-hot-toast';
import { MenuService } from '../services/menuService';
import { playNotificationSound } from '../utils/audioUtils';
import { orderService, type CreateOrderInput } from '../services/orderService';
import { staffService } from '../services/staffService';

export default function POS() {
  const { profile } = useAuth();
  const { settings, loading: franchiseLoading, error: franchiseError } = useFranchise();
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [discount, setDiscount] = useState<string>('');
  const [additionalCharges, setAdditionalCharges] = useState<string>('');
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');

  useEffect(() => {
    setIsVerified(false);
  }, [profile?.id]);

  useEffect(() => {
    if (cart.length === 0) {
      setIsVerified(false);
    }
  }, [cart.length]);

  useEffect(() => {
    let mounted = true;

    const loadMenuItems = async () => {
      try {
        if (franchiseLoading) return;
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

        const menuData = await MenuService.getMenuItems(profile.franchise_id);
        
        if (mounted) {
          setMenuItems(menuData);
          const uniqueCategories = Array.from(new Set(menuData.map(item => item.category)));
          setCategories(['All', ...uniqueCategories]);
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

  const handlePinVerify = async (pin: string): Promise<boolean> => {
    if (!profile?.id || !profile?.franchise_id) return false;
    try {
      const isValid = await staffService.verifyPin(profile.id, profile.franchise_id, pin);
      if (isValid) {
        setIsVerified(true);
      }
      return isValid;
    } catch (err) {
      console.error('PIN verification error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to verify PIN');
      return false;
    }
  };

  const calculateBill = (items: CartItem[]): BillCalculation => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxRate = Number(settings?.tax_rate ?? 0);
    const tax = (subtotal * taxRate) / 100;
    
    const discountValue = discount ? parseFloat(discount) : 0;
    const discountAmount = discountType === 'percentage' 
      ? (subtotal * discountValue) / 100 
      : discountValue;

    const additionalChargesValue = additionalCharges ? parseFloat(additionalCharges) : 0;
    const total = Math.round(subtotal + tax - discountAmount + additionalChargesValue);

    return {
      subtotal,
      tax,
      discount: discountAmount,
      additionalCharges: additionalChargesValue,
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

  const validateOrder = () => {
    if (!profile) {
      toast.error('Session expired. Please log in again.');
      return null;
    }

    if (!profile.franchise_id) {
      toast.error('No franchise associated with your account. Please contact your administrator.');
      return null;
    }

    if (cart.length === 0) {
      toast.error('Please add items to the cart before placing an order.');
      return null;
    }

    if (!tableNumber.trim()) {
      toast.error('Please enter a valid table number before placing the order.');
      return null;
    }

    return profile;
  };

  const submitOrder = async (validatedProfile: any) => {
    try {
      setIsSubmitting(true);
      const bill = calculateBill(cart);
      const orderInput: CreateOrderInput = {
        franchise_id: validatedProfile.franchise_id,
        table_number: tableNumber,
        server_id: validatedProfile.id,
        server_name: validatedProfile.full_name || validatedProfile.email || 'Unknown Server',
        subtotal: bill.subtotal,
        tax: bill.tax,
        discount: bill.discount,
        additional_charges: bill.additionalCharges,
        total: bill.total,
        items: cart.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          price: item.price,
          notes: undefined
        }))
      };

      await orderService.createOrder(orderInput);
      toast.success('Order placed successfully');
      playNotificationSound();
      
      // Reset form state
      setCart([]);
      setTableNumber('');
      setDiscount('');
      setAdditionalCharges('');
      setShowAdjustments(false);
      setIsVerified(false);
    } catch (err) {
      console.error('Error placing order:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to place order');
      throw err; // Re-throw to be handled by handlePlaceOrder
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlaceOrder = async () => {
    const validatedProfile = validateOrder();
    if (!validatedProfile) return;

    if (!isVerified) {
      setPendingOrder(validatedProfile);
      setShowPinVerification(true);
      return;
    }

    await submitOrder(validatedProfile).catch(() => {
      // Error already shown in submitOrder
    });
  };

  // Show loading state within menu section instead of full page
  const showLoadingState = loading || franchiseLoading;

  // Show error notifications but don't block the interface
  useEffect(() => {
    if (error || franchiseError) {
      toast.error(error || franchiseError || 'An error occurred');
    }
  }, [error, franchiseError]);

  const filteredItems = selectedCategory === 'All'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);

  const bill = calculateBill(cart);

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Menu Section */}
      <div className="w-2/3 bg-gray-50 p-6 overflow-hidden flex flex-col">
        {/* Categories with Smooth Scroll */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-orange-400 scrollbar-track-transparent -mx-6 px-6">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 gap-2 mb-6 overflow-y-auto pb-2 scrollbar-thin scrollbar-thumb-orange-400 scrollbar-track-transparent -mx-6 px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {showLoadingState ? (
              <div className="col-span-full flex justify-center items-center py-12">
                <LoadingSpinner size="large" label="Loading menu items..." />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                No menu items available
              </div>
            ) : filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAddToCart(item)}
                className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <h3 className="font-medium mb-1">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.category}</p>
                <p className="text-orange-600 mt-2">₹{item.price.toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-1/3 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Current Order</h2>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">
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
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-orange-400 scrollbar-track-transparent p-6">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              No items in cart
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-start pb-4 border-b last:border-0"
                >
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <div className="flex items-center mt-1">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center border rounded-l hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="w-12 h-8 flex items-center justify-center border-t border-b">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center border rounded-r hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p>₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bill Details */}
        <div className="border-t border-gray-200">
          <div className="p-6">
            <button
              className="w-full mb-4 text-left px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 flex justify-between items-center"
              onClick={() => setShowAdjustments(!showAdjustments)}
            >
              <span>Adjustments</span>
              <span>{showAdjustments ? '▽' : '△'}</span>
            </button>

            {showAdjustments && (
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Discount
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'amount')}
                      className="px-2 py-1 border rounded-md text-sm"
                    >
                      <option value="percentage">%</option>
                      <option value="amount">₹</option>
                    </select>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '-') {
                          setDiscount(value);
                        } else {
                          const num = parseFloat(value);
                          if (!isNaN(num) && num >= 0) {
                            setDiscount(value);
                          }
                        }
                      }}
                      className="w-full px-2 py-1 border rounded-md text-sm"
                      placeholder={discountType === 'percentage' ? "Enter discount %" : "Enter discount amount"}
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Additional Charges
                  </label>
                  <input
                    type="number"
                    value={additionalCharges}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || value === '-') {
                        setAdditionalCharges(value);
                      } else {
                        const num = parseFloat(value);
                        if (!isNaN(num) && num >= 0) {
                          setAdditionalCharges(value);
                        }
                      }
                    }}
                    className="w-full px-2 py-1 border rounded-md text-sm"
                    placeholder="Enter additional charges"
                    min="0"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>₹{bill.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax ({settings?.tax_rate || 0}%)</span>
                <span>₹{bill.tax.toFixed(2)}</span>
              </div>
              {parseFloat(discount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount {discountType === 'percentage' ? `(${discount}%)` : ''}</span>
                  <span>-₹{bill.discount.toFixed(2)}</span>
                </div>
              )}
              {parseFloat(additionalCharges) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Additional Charges</span>
                  <span>₹{bill.additionalCharges.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Total</span>
                <span>₹{bill.total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className="w-full py-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      </div>

      {showPinVerification && (
        <StaffPin
          onVerify={handlePinVerify}
          onSuccess={async () => {
            try {
              if (pendingOrder) {
                await submitOrder(pendingOrder);
              }
            } catch (error) {
              console.error('Error submitting order:', error);
              toast.error('Failed to submit order');
            } finally {
              setPendingOrder(null);
              setShowPinVerification(false);
            }
          }}
          onCancel={() => {
            setShowPinVerification(false);
            setIsVerified(false);
          }}
        />
      )}
    </div>
  );
}