# UI/UX Prototype — POS Desktop (AutoManager)

Tài liệu này mô tả prototype giao diện người dùng cho POS Desktop: mục tiêu trải nghiệm, màn hình chính, luồng tạo đơn, trạng thái offline và các yếu tố tương tác.

## Mục tiêu UX
- Tốc độ thao tác: tạo đơn trong 1 thao tác/giây cho item thường.
- Tối ưu cho bàn phím: phím tắt, search nhanh, numeric entry.
- Rõ trạng thái offline/sync và queue đơn.

## Màn hình chính (Main POS)
- Header: cửa hàng/chi nhánh, ca làm / user, trạng thái mạng (Online/Offline), nút Sync.
- Sidebar trái: Danh sách category -> sản phẩm (tìm kiếm nhanh, phím số để chọn món). Có chế độ xem list/grid.
- Trung tâm: Giỏ hàng (Order Cart): danh sách mục, quantity controls, chỉnh giá/topping, subtotal.
- Bên phải: Thông tin order (order type, chọn bàn nếu DINE_IN), nút hành động (Hold, Save, Pay).
- Modal thanh toán: chọn phương thức (hiện CASH), nhập trả tiền & xác nhận.

## Trạng thái offline & Sync
- Hiển thị badge màu (xanh online / vàng syncing / đỏ offline).
- Khi offline: thao tác vẫn cho phép — lưu vào local queue; UI hiển thị icon "In Queue" cho đơn.
- Sync Agent: nút Sync thủ công + tự động khi online.

## Bảng điều khiển (Admin dashboard) - tóm tắt
- Quản lý sản phẩm, topping, menu nhanh
- Quản lý bàn, trạng thái
- Báo cáo bán hàng/ tồn kho

## Accessibility & keyboard
- Hỗ trợ tab navigation, ARIA labels cho các nút quan trọng.
- Phím tắt: `F1` search product, `F2` toggle table map, `F3` open payment modal, `Ctrl+S` hold/save order.

## Prototype interactive (in repo)
- Thư mục prototype/pos chứa một prototype HTML/CSS/JS để demo luồng: chọn món, thêm vào giỏ, tạo order local queue và sync giả lập.

## Next steps
- Review prototype và điều chỉnh flows (shortcuts, layout) theo feedback.
- Chuyển prototype thành component React (Electron) và tích hợp Sync Agent.
