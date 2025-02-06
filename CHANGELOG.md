# POS System Changelog

## Core Features

### Multi-Franchise Support
- Complete franchise management system with individual settings
- Each franchise has customizable:
  - Currency settings
  - Tax rates
  - Default discounts
  - Operating hours
  - Menu categories
  - Timezone preferences

### Role-Based Access Control
- Implemented through Supabase Row Level Security (RLS)
- User roles include:
  - Super Admin (full system access)
  - Franchise Owner (franchise-specific access)
  - Manager (order management, staff oversight)
  - Staff (basic operations)
  - Admin (elevated franchise permissions)

### Order Management
- Comprehensive order tracking system
- Order states: pending → preparing → ready → completed
- Features:
  - Table assignment
  - Server tracking
  - Payment status monitoring
  - Tax calculations (CGST/SGST split)
  - Discounts and additional charges
  - Automatic timestamps for status changes

### Menu Management
- Dynamic menu system per franchise
- Features:
  - Automatic menu initialization for new franchises
  - Item categorization
  - Active/inactive item tracking
  - Price and tax rate management
  - Category-based organization

### Real-time Features
- Built using Supabase real-time subscriptions
- Live updates for:
  - Order status changes
  - Kitchen display system
  - Payment status
- Singleton pattern for connection management
- Automatic reconnection handling
- Event-based subscription system
- Support for filtered subscriptions
- Broadcast and presence channel configuration

### Analytics & Reporting
- Daily sales tracking
- Metrics include:
  - Total orders
  - Total sales
  - Tax collection
  - Discounts applied
  - Net sales

## Technical Architecture

### Frontend
- React + TypeScript
- Vite for build tooling
- UI Components:
  - Headless UI for accessible components
  - Tailwind CSS for styling
  - Custom components for POS-specific needs

### POS Interface
- Dynamic menu category filtering
- Real-time cart management
- Advanced bill calculations:
  - Flexible discount system (percentage or fixed amount)
  - Additional charges support
  - Automatic tax calculations based on franchise settings
  - Real-time total updates
- Responsive grid layout for menu items
- Intuitive order flow:
  - Table assignment
  - Item selection with quantity controls
  - Bill adjustments interface
  - Order status tracking
- Error handling and loading states
- Toast notifications for user feedback

### Backend (Supabase)
- PostgreSQL database
- Real-time subscriptions
- Row Level Security for data protection
- Automated triggers for:
  - Sales tracking
  - Timestamp updates
  - Settings initialization

### Key Dependencies
- @supabase/supabase-js: Database and auth
- react-router-dom: Navigation
- date-fns: Date handling
- zustand: State management
- react-hot-toast: Notifications

## Security Features
- Row Level Security (RLS) policies
- Role-based access control
- Franchise data isolation
- Protected routes
- Auth context management

## Development Tools
- TypeScript for type safety
- ESLint for code quality
- PostCSS for CSS processing
- Tailwind for utility-first CSS

## Database Structure
- Key tables:
  - franchises
  - franchise_settings
  - orders
  - order_items
  - menu_items
  - daily_sales
  - profiles

## Monitoring & Performance
- Automated daily sales tracking
- Real-time status updates
- Performance optimization utils
- Connection state monitoring
- Automatic error recovery