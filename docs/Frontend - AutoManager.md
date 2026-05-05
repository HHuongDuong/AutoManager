# Tầng giao diện — AutoManager

Tài liệu này mô tả cấu trúc tầng giao diện (Frontend) của hệ thống AutoManager, bao gồm 3 ứng dụng client chính: **Web Dashboard**, **POS Desktop**, và **Mobile App**. Tất cả đều sử dụng React (hoặc React Native) với kiến trúc component-based.

## 1. Tổng quan cấu trúc Frontend

Hệ thống giao diện được chia thành 3 ứng dụng độc lập, nhưng mỗi ứng dụng đều tuân theo cấu trúc tương tự:

```
clients/
├── web-dashboard/          # Dashboard quản trị web
│   ├── src/
│   │   ├── components/      # UI components tái sử dụng
│   │   ├── pages/           # Page components (Route pages)
│   │   ├── context/         # React Context (Global state)
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API service layer
│   │   ├── utils/           # Utility functions
│   │   ├── styles/          # Global styles
│   │   ├── App.jsx          # Root component
│   │   └── main.jsx         # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── pos-desktop/             # POS desktop (Electron + React)
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── context/         # Global state
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API + Electron IPC
│   │   ├── styles/          # Styling
│   │   ├── App.jsx          # Root component
│   │   └── main.jsx         # React entry point
│   ├── main.js              # Electron main process
│   ├── preload.js           # IPC bridge
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── mobile-app/              # Mobile app (React Native)
    ├── src/
    │   ├── components/      # UI components (React Native)
    │   ├── context/         # Global state
    │   ├── hooks/           # Custom hooks
    │   ├── services/        # API service layer
    │   ├── utils/           # Utility functions
    │   └── styles/          # StyleSheet definitions
    ├── App.js               # Root component
    ├── index.js             # Entry point
    ├── app.json             # App config
    ├── metro.config.js      # Metro bundler config
    └── package.json
```

## 2. Chi tiết cấu trúc từng ứng dụng

### 2.1. Web Dashboard (`clients/web-dashboard/`)

#### 2.1.1. Mục đích
Dashboard quản trị toàn hệ thống: quản lý sản phẩm, nhân viên, báo cáo, phân quyền, chi nhánh, AI.

#### 2.1.2. Cấu trúc thư mục

```
src/
├── components/              # Reusable UI components
│   ├── ChangePasswordModal.jsx
│   ├── LoginModal.jsx
│   ├── MetricCard.jsx       # Metric display card
│   ├── OrdersTable.jsx      # Orders table
│   ├── RevenueChart.jsx     # Chart component
│   ├── Sidebar.jsx          # Navigation sidebar
│   ├── StatusToast.jsx      # Status notification
│   └── Topbar.jsx           # Top navigation bar
│
├── pages/                   # Page-level components (mapped to routes)
│   ├── DashboardPage.jsx    # Home/dashboard
│   ├── ReportPage.jsx       # Revenue, inventory, attendance reports
│   ├── MenuPage.jsx         # Product/menu management
│   ├── EmployeePage.jsx     # Employee management
│   ├── InventoryPage.jsx    # Inventory management
│   ├── RbacPage.jsx         # Role-based access control
│   ├── BranchPage.jsx       # Branch management
│   ├── AiPage.jsx           # AI forecast & suggestions
│   └── SalesPage.jsx        # Sales dashboard
│
├── context/                 # React Context for global state
│   ├── AuthContext.jsx      # User auth state
│   ├── BranchContext.jsx    # Selected branch
│   └── ...other contexts    # Permissions, UI state, etc.
│
├── hooks/                   # Custom React hooks
│   ├── useAuth.js           # Auth hook
│   ├── useFetch.js          # Data fetching hook
│   ├── useBranch.js         # Branch selection hook
│   └── ...other hooks
│
├── services/                # API service layer
│   ├── authService.js       # Auth API
│   ├── ordersService.js     # Orders API
│   ├── productsService.js   # Products API
│   ├── reportsService.js    # Reports API
│   └── ...other services
│
├── utils/                   # Utility functions
│   ├── format.js            # Date, currency formatting
│   ├── validators.js        # Input validation
│   ├── constants.js         # Constants
│   └── helpers.js           # General helpers
│
├── styles/                  # Global styling
│   ├── App.css              # Global styles
│   ├── variables.css        # CSS variables (colors, sizes)
│   └── ...component styles
│
├── App.jsx                  # Root component (routing, layout)
└── main.jsx                 # React entry point (ReactDOM.render)
```

#### 2.1.3. Thư viện chính
- **React 18.3.1** + **Vite**: Build tool tối ưu
- **React Router DOM 6.26**: Client-side routing
- **Recharts 2.12.7**: Chart & data visualization

#### 2.1.4. Quy ước & patterns
- **Components**: Functional components với hooks
- **Contexts**: Centralized global state (auth, branch, UI)
- **Services**: Pure API calls, no component logic
- **Hooks**: Reusable logic (useFetch, useAuth, useForm)
- **Styling**: CSS modules hoặc inline styles

---

### 2.2. POS Desktop (`clients/pos-desktop/`)

#### 2.2.1. Mục đích
Ứng dụng POS chạy bằng Electron trên desktop, hỗ trợ tạo đơn nhanh, quản lý bàn, thanh toán, và có khả năng tích hợp với Electron APIs.

#### 2.2.2. Cấu trúc thư mục

```
src/
├── components/              # Reusable UI components
│   ├── CartPanel.jsx        # Shopping cart display
│   ├── ChangePasswordModal.jsx
│   ├── InputModal.jsx       # Generic input modal
│   ├── LoginModal.jsx
│   ├── MenuPanel.jsx        # Menu/product selection
│   ├── PaymentModal.jsx     # Payment flow
│   └── PosTopbar.jsx        # POS top navigation
│
├── context/                 # Global state
│   ├── PosContext.jsx       # Order, cart state
│   ├── AuthContext.jsx      # User auth
│   └── ...other contexts
│
├── hooks/                   # Custom hooks
│   ├── useCart.js           # Cart management
│   ├── useOrder.js          # Order creation
│   ├── useAuth.js           # Auth
│   └── ...other hooks
│
├── services/                # API + Electron IPC
│   ├── ordersService.js     # Orders API
│   ├── productsService.js   # Products API
│   ├── authService.js       # Auth API
│   ├── ipcService.js        # Electron IPC calls
│   └── ...other services
│
├── styles/                  # Styling
│   ├── App.css              # Global styles
│   ├── styles.css           # Component styles
│   └── ...
│
├── App.jsx                  # Root component
└── main.jsx                 # React entry point
```

#### 2.2.3. File Electron
- **main.js**: Electron main process (window management, IPC handlers)
- **preload.js**: IPC bridge (expose safe APIs to renderer)
- **vite.config.js**: Vite + Electron configuration

#### 2.2.4. Thư viện chính
- **Electron 40.0.0**: Desktop app framework
- **React 18.3.1** + **Vite**: UI & build
- **Concurrently**: Develop Vite + Electron simultaneously

#### 2.2.5. Quy ước & patterns
- **Electron Main Process**: Window creation, IPC handlers
- **Preload Script**: Safe bridge giữa main & renderer
- **React Context**: Cart, order state
- **IPC Service**: Gọi main process từ renderer

---

### 2.3. Mobile App (`clients/mobile-app/`)

#### 2.3.1. Mục đích
Ứng dụng di động React Native cho Android/iOS: check-in, check-out, xem ca làm, quản lý khác hàng, và tác vụ vận hành di động.

#### 2.3.2. Cấu trúc thư mục

```
src/
├── components/              # Reusable UI components (React Native)
│   ├── AppHeader.jsx        # App header
│   ├── CheckInModule.jsx    # Check-in/out module
│   ├── InventoryModule.jsx  # Inventory view module
│   ├── LoginModal.jsx       # Login modal
│   ├── LoginOnly.jsx        # Protected wrapper
│   ├── ModuleTabs.jsx       # Tab navigation
│   ├── OrderModule.jsx      # Order module
│   ├── PaymentModal.jsx     # Payment modal
│   └── TablePickerModal.jsx # Table selection
│
├── context/                 # Global state
│   ├── MobileAppContext.jsx # Auth, user, modules state
│   └── ...other contexts
│
├── hooks/                   # Custom hooks
│   ├── useMobileApp.js      # Mobile app state hook
│   ├── useFetch.js          # Data fetching
│   └── ...other hooks
│
├── services/                # API service layer
│   ├── mobileApi.js         # API client (axios/fetch)
│   ├── authService.js       # Auth API
│   ├── ordersService.js     # Orders API
│   └── ...other services
│
├── utils/                   # Utility functions
│   ├── format.js            # Date, currency formatting
│   └── ...helpers
│
├── styles/                  # React Native StyleSheet
│   ├── appStyles.js         # Global app styles
│   └── ...component styles
│
├── App.js                   # Root component (Entry point)
└── index.js                 # React Native registry
```

#### 2.3.3. File config
- **app.json**: Expo/React Native config
- **babel.config.js**: Babel configuration
- **metro.config.js**: Metro bundler config
- **android/** / **ios/**: Native platform code

#### 2.3.4. Thư viện chính
- **React 19.1.0** + **React Native 0.81.5**
- **AsyncStorage 1.23.1**: Local persistent storage
- **React Native Community CLI**: Build & run tools

#### 2.3.5. Quy ước & patterns
- **Modules**: UI logic grouped into modules (CheckInModule, InventoryModule, etc.)
- **Screens**: React Native screen components
- **AsyncStorage**: Offline data cache
- **Context API**: Global state management
- **Styling**: React Native StyleSheet (no CSS)

---

## 3. Mô tả chi tiết từng thành phần

### 3.1. Components (`components/`)

**Mục đích**: Chứa các UI components tái sử dụng, không kết hợp với route hoặc page.

**Ví dụ trong web-dashboard**:
- `Sidebar.jsx`: Navigation menu
- `Topbar.jsx`: Top navigation & user menu
- `LoginModal.jsx`: Login form modal
- `MetricCard.jsx`: Metric display card
- `RevenueChart.jsx`: Chart for revenue data
- `OrdersTable.jsx`: Table to display orders
- `StatusToast.jsx`: Toast notification

**Quy ước**:
- Mỗi component là một file `.jsx`
- Functional component với hooks
- Props để truyền data & callbacks
- Có thể sử dụng lại trong nhiều pages

### 3.2. Pages / Screens (`pages/` hoặc direct in App)

**Mục đích**: Chứa các page-level components, thường được map vào routes.

**Ví dụ trong web-dashboard** (routes):
- `DashboardPage.jsx`: Main dashboard
- `ReportPage.jsx`: Reporting & analytics
- `MenuPage.jsx`: Product management
- `EmployeePage.jsx`: Employee management
- `InventoryPage.jsx`: Inventory management
- `RbacPage.jsx`: Role & permission management
- `BranchPage.jsx`: Branch management
- `AiPage.jsx`: AI & suggestions
- `SalesPage.jsx`: Sales overview

**Quy ước**:
- Một page = một route
- Tên file: `[Feature]Page.jsx`
- Có thể dùng sub-components từ `components/`
- Connect tới Context & Services

### 3.3. Context (`context/`)

**Mục đích**: Quản lý global state (trừ Redux/Zustand).

**Ví dụ trong web-dashboard**:
- `AuthContext.jsx`: User auth, JWT token, permissions
- `BranchContext.jsx`: Selected branch, branch list
- `UIContext.jsx`: UI state (modals, notifications, etc.)

**Quy ước**:
- Mỗi context là một file `.jsx`
- Export: `[Feature]Context`, `[Feature]Provider`, `use[Feature]()`
- Kết hợp với custom hooks để dễ sử dụng

### 3.4. Hooks (`hooks/`)

**Mục đích**: Chứa logic tái sử dụng (custom hooks).

**Ví dụ trong web-dashboard**:
- `useAuth.js`: Get current user, login/logout
- `useFetch.js`: Data fetching wrapper
- `useBranch.js`: Get/set selected branch
- `useForm.js`: Form state & validation
- `useModal.js`: Modal state management

**Quy ước**:
- Tên file: `use[Feature].js`
- Export default function: `function use[Feature]() { ... }`
- Có thể dùng Context, State, Effects bên trong

### 3.5. Services (`services/`)

**Mục đích**: API calls & external service integration.

**Ví dụ trong web-dashboard**:
- `authService.js`: Login, logout, refresh token
- `ordersService.js`: Create, fetch, update orders
- `productsService.js`: Get products, categories, prices
- `reportsService.js`: Fetch report data
- `employeesService.js`: CRUD employees
- `inventoryService.js`: Inventory data
- `branchesService.js`: Branch management

**Quy ước**:
- Mỗi service = một domain (auth, orders, products, etc.)
- Export functions: `async function getXxx()`, `async function createXxx(data)`, etc.
- Sử dụng `fetch` hoặc `axios`
- Không chứa component logic

### 3.6. Utilities (`utils/`)

**Mục đích**: Chứa helper functions, constants, validators.

**Ví dụ trong web-dashboard**:
- `format.js`: Format date, currency, phone number
- `validators.js`: Input validation functions
- `constants.js`: Enums, magic strings, config
- `helpers.js`: Generic utility functions

**Quy ước**:
- Tên file: `[feature].js`
- Export functions hoặc constants
- Không sử dụng React/hooks

### 3.7. Styles (`styles/` hoặc inline)

**Mục đích**: Styling (CSS, CSS-in-JS).

**Trong web-dashboard / pos-desktop**:
- CSS modules hoặc inline styles
- Global CSS file: `App.css` hoặc `styles.css`
- CSS variables cho colors, spacing

**Trong mobile-app**:
- React Native `StyleSheet.create()`
- Global style file: `styles/appStyles.js`

---

## 4. Luồng dữ liệu (Data Flow)

### 4.1. Web Dashboard & POS Desktop (React)

```
User Action (click, submit, etc.)
    ↓
Component event handler
    ↓
Call useContext hook (e.g., useAuth, useCart)
    ↓
Context dispatch action
    ↓
Call Service API (e.g., ordersService.createOrder)
    ↓
Service calls backend API
    ↓
Backend returns response
    ↓
Update Context state
    ↓
Component re-renders with new data
```

### 4.2. Mobile App (React Native)

```
User Action (press button, etc.)
    ↓
Component event handler
    ↓
Call useMobileApp hook
    ↓
Context dispatch action
    ↓
Call mobileApi service
    ↓
API calls backend
    ↓
Update Context state
    ↓
Component re-renders with new data
```

---

## 5. Quy ước & Best Practices

### 5.1. Naming Conventions
- **Components**: PascalCase (`LoginModal.jsx`, `CartPanel.jsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth.js`, `useFetch.js`)
- **Services**: camelCase (`ordersService.js`, `authService.js`)
- **Utilities**: camelCase (`format.js`, `validators.js`)
- **Contexts**: PascalCase (`AuthContext.jsx`, `BranchContext.jsx`)

### 5.2. File Structure
- One component per file
- Keep component files small (< 200 lines)
- Separate concerns: UI, logic, services

### 5.3. Props & State
- Use TypeScript PropTypes or JSDoc for type hints
- Lift state up only when necessary (prefer Context for global state)
- Keep state minimal (compute derived values)

### 5.4. API Calls
- Use services layer (never call APIs directly in components)
- Error handling in service layer
- Loading states in components
- Retry logic for failed requests

### 5.5. Styling
- Use CSS modules or inline styles (avoid global styles conflict)
- Define color palette & spacing in constants or CSS variables
- Responsive design using media queries or mobile-first approach

---

## 6. Build & Development

### 6.1. Web Dashboard & POS Desktop
```bash
# Development
npm run dev

# Build
npm run build

# Preview
npm run preview
```

### 6.2. Mobile App
```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

---

## 7. Kết luận

Tầng giao diện AutoManager được thiết kế với:
- **3 ứng dụng độc lập** (web, desktop, mobile) nhưng cùng chung backend API
- **Component-based architecture**: Reusable, maintainable, scalable
- **Separation of concerns**: Components, services, hooks, utils
- **Global state management**: React Context
- **Consistent patterns**: Naming, structure, data flow

Mỗi ứng dụng có thể hoạt động độc lập nhưng chia sẻ chung API backend, cho phép tách biệt phát triển UI mà vẫn đảm bảo tính nhất quán về nghiệp vụ.

---
Generated: Frontend - AutoManager
