# 📘 SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

## Hệ thống AutoManager POS

(Chuẩn IEEE 830 – Bản tiếng Việt)

## 1\. Giới thiệu

### 1.1 Mục đích

Tài liệu SRS mô tả **toàn bộ yêu cầu chức năng và phi chức năng** của hệ thống **AutoManager POS**.  
Tài liệu này là cơ sở cho:

*   Thiết kế hệ thống (SDS)
*   Phát triển phần mềm
*   Kiểm thử và nghiệm thu

### 1.2 Phạm vi hệ thống

AutoManager POS là hệ thống **quản lý bán hàng cho quán ăn / nhà hàng nhỏ**, hỗ trợ:

*   Bán hàng nhanh tại quầy
*   Phân loại đơn **tại chỗ / mang đi**
*   Quản lý bàn
*   Quản lý nhân viên & ca làm
*   Quản lý kho nguyên liệu theo chế biến
*   Báo cáo & thống kê

Hệ thống **không tập trung thanh toán điện tử**, ưu tiên **tốc độ vận hành**.

### 1.3 Định nghĩa & thuật ngữ

| Thuật ngữ | Mô tả |
| --- | --- |
| POS | Point of Sale |
| Order | Đơn hàng |
| Dine-in | Đơn tại chỗ |
| Takeaway | Đơn mang đi |
| RBAC | Role-Based Access Control |

### 1.4 Tài liệu tham khảo

*   IEEE 830 – Software Requirements Specification
*   Tài liệu SDS AutoManager POS

## 2\. Tổng quan hệ thống

### 2.1 Góc nhìn sản phẩm

AutoManager POS là hệ thống client–server, gồm:

*   POS Desktop (quầy bán)
*   Web Dashboard (quản lý)
*   Mobile App (nhân viên)

### 2.2 Nhóm người dùng

| Người dùng | Mô tả |
| --- | --- |
| Chủ quán | Quản lý toàn hệ thống |
| Thu ngân | Bán hàng, tạo order |
| Nhân viên | Phục vụ, chấm công |
| Quản lý | Xem báo cáo |

### 2.3 Ràng buộc

*   Chạy được trên máy tính quầy
*   Hỗ trợ mở rộng lên cloud
*   Đơn giản, dễ dùng

### 2.4 Giả định

*   Quy mô quán nhỏ – vừa
*   Bán nhanh, đơn giản
*   Không yêu cầu tích hợp ngân hàng

## 3\. Yêu cầu chức năng (Functional Requirements)

### 3.1 Xác thực & phân quyền

*   FR-01: Người dùng đăng nhập bằng tài khoản & mật khẩu
*   FR-02: Hệ thống phân quyền theo vai trò
*   FR-03: Chỉ truy cập được chức năng được cấp quyền

### 3.2 Quản lý nhân viên

*   FR-04: Thêm / sửa / xóa nhân viên
*   FR-05: Gán vai trò cho nhân viên
*   FR-06: Kích hoạt / vô hiệu hóa tài khoản
*   FR-07: Ghi log thao tác của nhân viên

### 3.3 Chấm công & ca làm

*   FR-08: Nhân viên check-in / check-out
*   FR-09: Quản lý ca làm
*   FR-10: Tính tổng giờ làm

### 3.4 Quản lý bàn

*   FR-11: Thêm / sửa / xóa bàn
*   FR-12: Theo dõi trạng thái bàn (trống / đang dùng)
*   FR-13: Gán bàn cho đơn **tại chỗ**

### 3.5 Quản lý sản phẩm & menu

*   FR-14: Quản lý món ăn / đồ uống / combo
*   FR-15: Phân loại sản phẩm
*   FR-16: Quản lý topping & nhóm topping

### 3.6 Quản lý kho nguyên liệu

*   FR-17: Nhập kho nguyên liệu
*   FR-18: Xuất kho khi chế biến
*   FR-19: Điều chỉnh tồn kho
*   FR-20: Ghi nhận lịch sử kho

📌 **Không tự động trừ kho khi bán**

### 3.7 Bán hàng POS (Core)

*   FR-21: Tạo đơn hàng
*   FR-22: Phân loại đơn:
    *   Tại chỗ (DINE\_IN)
    *   Mang đi (TAKEAWAY)
*   FR-23: Đơn tại chỗ bắt buộc chọn bàn
*   FR-24: Đơn mang đi không cần bàn
*   FR-25: Thêm / sửa / xóa món trong đơn
*   FR-26: Thanh toán tiền mặt
*   FR-27: Hoàn tất & đóng đơn

### 3.8 Báo cáo & thống kê

*   FR-28: Báo cáo doanh thu
*   FR-29: Báo cáo tồn kho
*   FR-30: Báo cáo chấm công

### 3.9 AI hỗ trợ (Tùy chọn)

*   FR-31: Dự báo nhu cầu nguyên liệu
*   FR-32: Gợi ý nhập kho

## 4\. Yêu cầu phi chức năng (Non-Functional Requirements)

### 4.1 Hiệu năng

*   Tạo đơn < 1 giây
*   Thanh toán tức thì

### 4.2 Bảo mật

*   Mã hóa mật khẩu
*   JWT
*   Phân quyền RBAC
*   Audit log

### 4.3 Khả năng mở rộng

*   Triển khai local hoặc cloud
*   Dễ mở rộng module

### 4.4 Khả dụng

*   Giao diện đơn giản
*   Ít thao tác

## 5\. Yêu cầu giao diện

### 5.1 POS Desktop

*   Chọn loại order rõ ràng
*   Thao tác nhanh

### 5.2 Web Dashboard

*   Quản lý tổng thể

### 5.3 Mobile App

*   Chấm công
*   Xem ca làm

## 6\. Phụ lục

*   A. Use Case Diagram
*   B. ERD
*   C. Sequence Diagram