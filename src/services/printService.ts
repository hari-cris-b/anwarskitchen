import { FranchiseSettings } from '../types/franchise';
import { OrderWithItems, OrderItem } from '../types/orders';

const DEFAULT_THERMAL_WIDTH = 32;
const RECEIPT_LINE_LENGTH = 48;

interface PrintableItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

interface PrintableOrder {
  id: string;
  items: PrintableItem[];
  total: number;
  tax: number;
  customer_name?: string;
  table_number?: string;
  created_at: string;
}

interface ReceiptOptions {
  showHeader?: boolean;
  showFooter?: boolean;
  showLogo?: boolean;
  showTax?: boolean;
  paperWidth?: number;
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString();
}

function padRight(text: string, length: number): string {
  return text.padEnd(length);
}

function padLeft(text: string, length: number): string {
  return text.padStart(length);
}

function centerText(text: string, length: number): string {
  const padding = Math.max(0, length - text.length);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
}

function formatOrderForPrinting(order: OrderWithItems): PrintableOrder {
  return {
    id: order.id,
    items: order.order_items.map(item => ({
      name: item.menu_items.name,
      quantity: item.quantity,
      price: item.menu_items.price,
      notes: item.notes || undefined
    })),
    total: order.total,
    tax: order.tax,
    customer_name: order.customer_name || undefined,
    table_number: order.table_number || undefined,
    created_at: order.created_at
  };
}

function generateReceiptLines(
  order: PrintableOrder,
  settings: FranchiseSettings,
  options: ReceiptOptions = {}
): string[] {
  const lines: string[] = [];
  const width = options.paperWidth || RECEIPT_LINE_LENGTH;

  // Header
  if (options.showHeader !== false) {
    lines.push('='.repeat(width));
    lines.push(padLeft(settings.business_name, width));
    if (settings.address) {
      lines.push(padLeft(settings.address, width));
    }
    if (settings.phone) {
      lines.push(padLeft(`Tel: ${settings.phone}`, width));
    }
    lines.push('='.repeat(width));
  }

  // Order details
  lines.push(`Order #: ${order.id}`);
  lines.push(`Date: ${formatDate(order.created_at)}`);
  if (order.customer_name) {
    lines.push(`Customer: ${order.customer_name}`);
  }
  if (order.table_number) {
    lines.push(`Table: ${order.table_number}`);
  }
  lines.push('-'.repeat(width));

  // Items
  const itemLines = order.items.map(item => {
    const itemTotal = item.quantity * item.price;
    const itemLine = `${item.quantity}x ${item.name}`;
    const priceLine = formatCurrency(itemTotal);
    
    return padRight(itemLine, width - priceLine.length) + priceLine;
  });
  lines.push(...itemLines);

  // Notes under items
  order.items.forEach(item => {
    if (item.notes) {
      lines.push(`  Note: ${item.notes}`);
    }
  });

  lines.push('-'.repeat(width));

  // Summary
  const subtotal = order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  lines.push(padRight('Subtotal:', width - formatCurrency(subtotal).length) + formatCurrency(subtotal));
  
  if (options.showTax !== false && order.tax > 0) {
    lines.push(padRight('Tax:', width - formatCurrency(order.tax).length) + formatCurrency(order.tax));
  }
  
  lines.push(padRight('Total:', width - formatCurrency(order.total).length) + formatCurrency(order.total));

  // Footer
  if (options.showFooter !== false) {
    lines.push('='.repeat(width));
    if (settings.receipt_footer) {
      lines.push(padLeft(settings.receipt_footer, width));
    }
    lines.push('='.repeat(width));
  }

  return lines;
}

function generateKitchenLines(order: PrintableOrder): string[] {
  const lines: string[] = [];
  const width = RECEIPT_LINE_LENGTH;

  // Header
  lines.push('='.repeat(width));
  lines.push('KITCHEN ORDER');
  lines.push('='.repeat(width));

  // Order details
  lines.push(`Order #: ${order.id}`);
  lines.push(`Time: ${formatDate(order.created_at)}`);
  if (order.table_number) {
    lines.push(`Table: ${order.table_number}`);
  }
  lines.push('-'.repeat(width));

  // Items with quantity prominently displayed
  order.items.forEach(item => {
    lines.push(`[${item.quantity}x] ${item.name}`);
    if (item.notes) {
      lines.push(`  ** ${item.notes} **`);
    }
  });

  lines.push('-'.repeat(width));
  return lines;
}

export const printService = {
  generateReceiptContent(
    order: OrderWithItems,
    settings: FranchiseSettings,
    options: ReceiptOptions = {}
  ): string {
    const printableOrder = formatOrderForPrinting(order);
    return generateReceiptLines(printableOrder, settings, options).join('\n');
  },

  generateKitchenContent(order: OrderWithItems): string {
    const printableOrder = formatOrderForPrinting(order);
    return generateKitchenLines(printableOrder).join('\n');
  }
};
