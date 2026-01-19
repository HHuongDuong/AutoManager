# UI/UX Specification — POS Desktop (AutoManager)

Tài liệu này mô tả UI/UX hoàn chỉnh cho POS Desktop: mục tiêu trải nghiệm, kiến trúc thông tin, luồng nghiệp vụ, wireframe, component spec, trạng thái, và yêu cầu khả dụng.

## 1. Mục tiêu UX
- Tốc độ thao tác: tạo đơn < 1s cho món phổ biến.
- Tối ưu cho bàn phím và màn hình cảm ứng.
- Trạng thái network/offline rõ ràng, không làm gián đoạn bán hàng.

## 2. Personas chính
- Thu ngân: thao tác nhanh, ít bước.
- Quản lý: kiểm soát bàn, theo dõi doanh thu.

## 3. Information Architecture (IA)
- POS Core
	- Main POS (Product Browser + Cart)
	- Table Map
	- Payments
	- Orders Queue (offline)
- Management (Web Dashboard)
	- Products / Categories / Toppings
	- Staff & Shifts
	- Inventory
	- Reports

## 4. Luồng nghiệp vụ chính
### 4.1 Tạo đơn DINE_IN
1) Chọn loại đơn DINE_IN → 2) Chọn bàn → 3) Thêm món → 4) Thanh toán tiền mặt → 5) Đóng đơn

### 4.2 Tạo đơn TAKEAWAY
1) Chọn TAKEAWAY → 2) Thêm món → 3) Thanh toán → 4) Đóng đơn

### 4.3 Offline flow
1) Mất kết nối → UI hiển thị offline → 2) Đơn lưu local queue → 3) Khi online, Sync Agent đồng bộ tự động

## 5. Wireframe (textual)
### 5.1 Main POS
- Header: Branch, User, Shift, Network status, Sync button.
- Left panel: Category tabs + Search bar + Product grid.
- Center panel: Cart list (item name, qty, unit price, subtotal), total, quick actions.
- Right panel: Order info (type, table, status), actions (Hold, Save, Pay).

### 5.2 Table Map
- Grid view hiển thị bàn với trạng thái AVAILABLE/OCCUPIED.
- Click bàn để gán vào đơn.

### 5.3 Payment Modal
- Amount due, cash input, change.
- Confirm/Cancel.

### 5.4 Offline Queue
- List đơn chờ sync: timestamp, status, retry.
- Manual Sync button.

## 6. UI Components & Spec
- Button: primary/secondary/ghost, disabled + loading.
- Input: text, numeric, search; validation inline.
- Badge: status (Online/Offline/Syncing).
- Table card: status icon + label.
- Toast: success/error messages.

## 7. Design System (tokens)
- Color:
	- Primary: #10B981
	- Danger: #EF4444
	- Warning: #F59E0B
	- Background: #F4F6F8
- Typography: 14px base, 16px for key actions.
- Spacing: 8px grid.

## 8. States & Validation
- Empty cart: CTA “Add items”.
- Payment error: show inline error, keep modal open.
- DINE_IN without table: block create.
- Offline: disable API-dependent actions (reports), allow create order.

## 9. Accessibility
- Tab navigation
- ARIA labels for actions
- Sufficient contrast
- Keyboard shortcuts: `F1` search, `F2` table map, `F3` payment, `Ctrl+S` hold order

## 10. Performance & Usability
- Cache product catalog.
- Debounce search input (150–250ms).
- Minimize popups; use inline confirmations when possible.

## 11. Prototype reference
- Prototype HTML/CSS/JS ở thư mục prototype/pos để kiểm chứng flow trước khi chuyển sang React/Electron.

## 12. Next steps
- Chuyển wireframe thành UI kit Figma.
- Tạo component breakdown cho React/Electron.
- User testing nội bộ và cập nhật flow.
