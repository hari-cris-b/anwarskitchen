// USB printer interface definitions
declare global {
  interface Navigator {
    usb: USB;
  }
  
  interface USB {
    getDevices(): Promise<USBDevice[]>;
    requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
  }

  interface USBDeviceRequestOptions {
    filters: USBDeviceFilter[];
  }

  interface USBDeviceFilter {
    vendorId?: number;
    productId?: number;
    classCode?: number;
    subclassCode?: number;
    protocolCode?: number;
    serialNumber?: string;
  }

  interface USBDevice {
    productName?: string;
    manufacturerName?: string;
    vendorId: number;
    productId: number;
    open(): Promise<void>;
    close(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
  }

  interface USBOutTransferResult {
    bytesWritten: number;
    status: 'ok' | 'stall' | 'babble';
  }
}

import { Order } from '../types';
import { formatDateTime } from '../utils/dateUtils';

interface PrinterConfig {
  type: 'browser' | 'thermal';
  printerName?: string;
  width?: number;
  characterWidth?: number;
}

export class PrintService {
  private static readonly DEFAULT_THERMAL_WIDTH = 80; // mm
  private static readonly DEFAULT_CHAR_WIDTH = 48; // characters per line
  
  // ESC/POS Commands
  private static readonly ESC = String.fromCharCode(0x1B);
  private static readonly GS = String.fromCharCode(0x1D);
  private static readonly CENTER = PrintService.ESC + 'a' + String.fromCharCode(1);
  private static readonly LEFT_ALIGN = PrintService.ESC + 'a' + String.fromCharCode(0);
  private static readonly BOLD_ON = PrintService.ESC + 'E' + String.fromCharCode(1);
  private static readonly BOLD_OFF = PrintService.ESC + 'E' + String.fromCharCode(0);
  private static readonly DOUBLE_WIDTH = PrintService.ESC + '!' + String.fromCharCode(32);
  private static readonly NORMAL_WIDTH = PrintService.ESC + '!' + String.fromCharCode(0);
  private static readonly CUT_PAPER = PrintService.GS + 'V' + String.fromCharCode(66) + String.fromCharCode(3);

  private static config: PrinterConfig = {
    type: 'browser',
    width: 80,
    characterWidth: 48
  };

  public static configure(config: PrinterConfig): void {
    PrintService.config = { ...PrintService.config, ...config };
  }

  private static async getThermalPrinter(): Promise<USBDevice> {
    try {
      const devices = await navigator.usb.getDevices();
      const printer = devices.find(device => device.productName === 'IHR410');
      
      if (!printer) {
        const device = await navigator.usb.requestDevice({
          filters: [{ vendorId: 0x0483 }] // Impact IHR410 vendor ID
        });
        return device;
      }
      
      return printer;
    } catch (error) {
      console.error('Failed to connect to thermal printer:', error);
      throw new Error('Thermal printer connection failed');
    }
  }

  private static centerText(text: string, width: number): string {
    const padding = Math.max(0, width - text.length) / 2;
    return ' '.repeat(Math.floor(padding)) + text;
  }

  private static formatThermalContent(order: Order, isKOT: boolean): string {
    const width = PrintService.config.characterWidth || PrintService.DEFAULT_CHAR_WIDTH;
    let content = '';

    // Header
    content += PrintService.CENTER;
    content += PrintService.BOLD_ON;
    content += PrintService.DOUBLE_WIDTH;
    content += isKOT ? `KOT #${String(order.id).substring(0, 6)}\n` : 'BILL\n';
    content += PrintService.NORMAL_WIDTH;
    content += `Table: ${order.table_number}\n`;
    content += `Server: ${order.server_name}\n`;
    content += `Time: ${formatDateTime(order.created_at)}\n`;
    content += PrintService.BOLD_OFF;
    
    // Separator
    content += '-'.repeat(width) + '\n';
    
    // Items
    content += PrintService.LEFT_ALIGN;
    if (!Array.isArray(order.items) || order.items.length === 0) {
      content += 'No items found\n';
    } else {
      // Sort items by category for kitchen organization
      const itemsByCategory: { [key: string]: typeof order.items } = {};
      order.items.forEach(item => {
        if (item && typeof item === 'object' && 'quantity' in item && 'name' in item) {
          const category = item.category || 'Other';
          if (!itemsByCategory[category]) {
            itemsByCategory[category] = [];
          }
          itemsByCategory[category].push(item);
        }
      });

      // Print items grouped by category
      Object.entries(itemsByCategory).forEach(([category, items]) => {
        content += `\n${category.toUpperCase()}\n`;
        content += '-'.repeat(20) + '\n';
        items.forEach(item => {
          content += `${item.quantity}x ${item.name}\n`;
          if (!isKOT && 'price' in item && typeof item.price === 'number') {
            content += `${' '.repeat(4)}₹${(item.price * item.quantity).toFixed(2)}\n`;
          }
          if ('notes' in item && item.notes) {
            content += `${' '.repeat(4)}Note: ${item.notes}\n`;
          }
        });
      });
    }

    // Bill totals (only for bill print)
    if (!isKOT) {
      content += '-'.repeat(width) + '\n';
      content += PrintService.BOLD_ON;
      content += `Subtotal: ₹${order.subtotal.toFixed(2)}\n`;
      content += `CGST: ₹${order.tax.toFixed(2)}\n`;
      
      if (order.additional_charges > 0) {
        content += `Additional: ₹${order.additional_charges.toFixed(2)}\n`;
      }
      if (order.discount > 0) {
        content += `Discount: -₹${order.discount.toFixed(2)}\n`;
      }
      
      content += PrintService.DOUBLE_WIDTH;
      content += `Total: ₹${order.total.toFixed(2)}\n`;
      content += PrintService.NORMAL_WIDTH;
      content += PrintService.BOLD_OFF;
    }

    // Footer
    content += '-'.repeat(width) + '\n';
    content += PrintService.CENTER;
    content += isKOT ? 
      `Status: ${order.status.toUpperCase()}\n` :
      `Payment: ${order.payment_status.toUpperCase()}\n`;
    
    if (!isKOT) {
      if (order.payment_method) {
        content += `Method: ${order.payment_method.toUpperCase()}\n`;
      }
      content += 'Thank you for dining with us!\n';
    }

    // Cut paper command
    content += PrintService.CUT_PAPER;
    
    return content;
  }

  private static async printThermal(content: string): Promise<void> {
    const printer = await PrintService.getThermalPrinter();
    
    try {
      await printer.open();
      await printer.selectConfiguration(1);
      await printer.claimInterface(0);

      // Convert string to Uint8Array
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      
      // Send data in chunks to avoid buffer overflow
      const CHUNK_SIZE = 64;
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        await printer.transferOut(1, chunk);
      }

      await printer.close();
    } catch (error) {
      console.error('Failed to print:', error);
      throw new Error('Printing failed');
    }
  }

  private static printedOrders: Set<string> = new Set();

  public static async printKOT(order: Order): Promise<void> {
    if (PrintService.printedOrders.has(order.id)) {
      throw new Error('KOT already printed for this order');
    }
    
    if (PrintService.config.type === 'thermal') {
      const content = PrintService.formatThermalContent(order, true);
      await PrintService.printThermal(content);
    } else {
      // Browser printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Failed to open print window');
      }

      const content = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>KOT #${String(order.id).substring(0, 6)}</title>
            <style>
              @page {
                margin: 0;
                size: 80mm 297mm;
              }
              body {
                font-family: 'Courier New', monospace;
                margin: 0;
                padding: 10mm;
                width: 60mm;
                font-size: 12px;
                line-height: 1.2;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .header {
                text-align: center;
                margin-bottom: 10px;
              }
              .divider {
                border-top: 1px dashed #000;
                margin: 10px 0;
              }
              .item {
                display: flex;
                justify-content: space-between;
                margin: 5px 0;
              }
              .notes {
                font-style: italic;
                font-size: 0.9em;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>KOT #${String(order.id).substring(0, 6)}</h2>
              <p>Table: ${order.table_number}</p>
              <p>Time: ${formatDateTime(order.created_at)}</p>
            </div>
            <div class="divider"></div>
            <div class="items">
              ${Array.isArray(order.items) && order.items.length > 0
                ? order.items.map(item => `
                    <div class="item">
                      <div>
                        <span>${item.quantity}x ${item.name}</span>
                        ${item.notes ? `<div class="notes">Note: ${item.notes}</div>` : ''}
                      </div>
                    </div>
                  `).join('')
                : '<div>No items found</div>'
              }
            </div>
            <div class="divider"></div>
            <div class="footer">
              <p>Status: ${order.status.toUpperCase()}</p>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }

    PrintService.printedOrders.add(order.id);
  }

  public static async reprintKOT(order: Order): Promise<void> {
    const password = prompt('Enter the security password to reprint the order:');
    if (password !== 'admin') {
      throw new Error('Incorrect password');
    }
    PrintService.printedOrders.delete(order.id);
    await PrintService.printKOT(order);
  }

  public static async printBill(order: Order): Promise<void> {
    if (PrintService.config.type === 'thermal') {
      const content = PrintService.formatThermalContent(order, false);
      await PrintService.printThermal(content);
    } else {
      // Browser printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Failed to open print window');
      }

      const content = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Bill #${String(order.id).substring(0, 6)}</title>
            <style>
              @page {
                margin: 0;
                size: 80mm 297mm;
              }
              body {
                font-family: 'Courier New', monospace;
                margin: 0;
                padding: 10mm;
                width: 60mm;
                font-size: 12px;
                line-height: 1.2;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .header {
                text-align: center;
                margin-bottom: 10px;
              }
              .divider {
                border-top: 1px dashed #000;
                margin: 10px 0;
              }
              .item {
                display: flex;
                justify-content: space-between;
                margin: 5px 0;
              }
              .total-line {
                display: flex;
                justify-content: space-between;
                margin: 5px 0;
                font-weight: bold;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                font-size: 0.9em;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>BILL</h2>
              <p>Bill #${String(order.id).substring(0, 6)}</p>
              <p>Table: ${order.table_number}</p>
              <p>Date: ${formatDateTime(order.created_at)}</p>
            </div>
            <div class="divider"></div>
            <div class="items">
              ${Array.isArray(order.items) && order.items.length > 0
                ? order.items.map(item => `
                    <div class="item">
                      <div>
                        <span>${item.quantity}x ${item.name}</span>
                        ${item.notes ? `<div class="notes">Note: ${item.notes}</div>` : ''}
                      </div>
                      <span>₹${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  `).join('')
                : '<div>No items found</div>'
              }
            </div>
            <div class="divider"></div>
            <div class="totals">
              <div class="total-line">
                <span>Subtotal:</span>
                <span>₹${order.subtotal.toFixed(2)}</span>
              </div>
              <div class="total-line">
                <span>CGST:</span>
                <span>₹${order.tax.toFixed(2)}</span>
              </div>
              ${order.additional_charges > 0 ? `
                <div class="total-line">
                  <span>Additional Charges:</span>
                  <span>₹${order.additional_charges.toFixed(2)}</span>
                </div>
              ` : ''}
              ${order.discount > 0 ? `
                <div class="total-line">
                  <span>Discount:</span>
                  <span>-₹${order.discount.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="divider"></div>
              <div class="total-line" style="font-size: 1.2em;">
                <span>Total:</span>
                <span>₹${order.total.toFixed(2)}</span>
              </div>
            </div>
            <div class="divider"></div>
            <div class="footer">
              <p>Payment Status: ${order.payment_status.toUpperCase()}</p>
              ${order.payment_method ? `<p>Payment Method: ${order.payment_method.toUpperCase()}</p>` : ''}
              <p>Thank you for dining with us!</p>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  }
}
