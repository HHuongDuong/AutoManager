# 📘 SOFTWARE DESIGN SPECIFICATION (SDS)

## HỆ THỐNG AutoManager POS

## 1\. Giới thiệu

### 1.1 Mục đích

Tài liệu Software Design Specification (SDS) mô tả **thiết kế kỹ thuật chi tiết** của hệ thống **AutoManager POS**, dựa trên tài liệu SRS mới nhất.

SDS là cơ sở cho:

*   Lập trình hệ thống
*   Thiết kế cơ sở dữ liệu
*   Triển khai hạ tầng
*   Kiểm thử tích hợp và vận hành

### 1.2 Phạm vi

Tài liệu mô tả:

*   Kiến trúc tổng thể hệ thống
*   Thiết kế module nghiệp vụ
*   Thiết kế dữ liệu (Database Design)
*   Luồng xử lý chính
*   Cơ chế bảo mật và mở rộng

### 1.3 Thuật ngữ

Kế thừa toàn bộ thuật ngữ trong tài liệu SRS AutoManager POS.

## 2\. Thiết kế kiến trúc hệ thống

### 2.1 Tổng quan kiến trúc

Hệ thống AutoManager POS được thiết kế theo mô hình **3-Tier Architecture**, kết hợp **Client–Server**:

#### 2.1.1 Presentation Layer

*   **POS Desktop (Electron)**
    *   Bán hàng tại quầy
    *   Tạo đơn tại chỗ / mang đi
*   **Web Dashboard**
    *   Quản lý hệ thống
    *   Báo cáo & cấu hình
*   **Mobile App cho nhân viên (Android / iOS)**
    *   Chấm công
    *   Xem ca làm

#### 2.1.2 Application Layer

*   Backend API (Node.js)
*   Các service nghiệp vụ:
    *   Auth Service
    *   POS Service
    *   Inventory Service
    *   Staff & Attendance Service
    *   Report Service
    *   AI Service (tùy chọn)

#### 2.1.3 Data Layer

*   PostgreSQL Database

### 2.2 Nguyên tắc & đặc điểm kiến trúc

*   Một backend dùng chung cho nhiều client
*   Module hóa rõ ràng
*   Dễ mở rộng và triển khai cloud

## 3\. Thiết kế module hệ thống

### 3.1 Module xác thực & phân quyền

**Chức năng:**

*   Đăng nhập bằng tài khoản & mật khẩu
*   Phân quyền theo RBAC
*   Quản lý phiên đăng nhập

**Thiết kế kỹ thuật:**

*   Password hash bằng bcrypt
*   JWT Access Token
*   Middleware kiểm tra quyền

### 3.2 Module quản lý nhân viên

**Chức năng:**

*   CRUD nhân viên
*   Gán vai trò
*   Vô hiệu hóa tài khoản
*   Ghi log thao tác

**Thiết kế:**

*   Bảng users, roles, permissions
*   Bảng audit\_logs lưu lịch sử thao tác

### 3.3 Module chấm công & ca làm

**Chức năng:**

*   Check-in / check-out
*   Quản lý ca làm
*   Tính tổng giờ làm

**Thiết kế:**

*   Ghi nhận thời gian theo timestamp
*   Tự động tính giờ làm

### 3.4 Module quản lý bàn

**Chức năng:**

*   Cấu hình bàn
*   Theo dõi trạng thái bàn
*   Gán bàn cho đơn tại chỗ

**Thiết kế:**

*   Entity tables
*   Trạng thái: AVAILABLE / OCCUPIED

### 3.5 Module sản phẩm & menu

**Chức năng:**

*   Quản lý sản phẩm
*   Phân loại: đồ ăn, đồ uống, combo
*   Quản lý topping & nhóm topping

**Thiết kế:**

*   Product categories
*   Topping groups & product\_toppings (price\_override)

### 3.6 Module kho nguyên liệu (theo chế biến)

**Chức năng:**

*   Nhập kho
*   Xuất kho khi chế biến
*   Điều chỉnh tồn

**Thiết kế:**

*   Không tự trừ kho khi bán
*   Inventory transaction log

### 3.7 Module bán hàng POS (Module lõi)

**Chức năng:**

*   Tạo đơn hàng
*   Phân loại đơn:
    *   DINE\_IN (tại chỗ)
    *   TAKEAWAY (mang đi)
*   Thêm / sửa / xóa món
*   Thanh toán tiền mặt
*   Đóng đơn

**Thiết kế nghiệp vụ:**

*   DINE\_IN bắt buộc gán bàn
*   TAKEAWAY không liên kết bàn

### 3.8 Module thanh toán

**Phạm vi:**

*   Hệ thống chỉ hỗ trợ **thanh toán tiền mặt**

**Thiết kế:**

*   Ghi nhận trạng thái thanh toán trong đơn hàng
*   Không tích hợp cổng thanh toán bên ngoài
*   Đảm bảo tốc độ xử lý nhanh tại quầy

### 3.9 Module báo cáo & thống kê

**Chức năng:**

*   Doanh thu
*   Tồn kho
*   Chấm công

**Thiết kế:**

*   Query tối ưu cho đọc
*   Có thể dùng view/materialized view

### 3.10 Module AI hỗ trợ (Tùy chọn)

**Chức năng:**

*   Dự báo nhu cầu nguyên liệu
*   Gợi ý nhập kho

**Thiết kế:**

*   Batch processing
*   Có thể tích hợp OpenAI API hoặc model nội bộ

## 4\. Thiết kế dữ liệu

### 4.1 Tổng quan

*   PostgreSQL
*   Chuẩn hóa 3NF

### 4.2 Các bảng chính

*   users
*   roles
*   permissions
*   role\_permissions
*   audit\_logs
*   attendance
*   shifts
*   tables
*   orders
*   order\_items
*   products
*   product\_categories
*   toppings
*   topping\_groups
*   product\_toppings
*   ingredients
*   inventory\_transactions

## 5\. Thiết kế bảo mật

*   HTTPS
*   JWT
*   RBAC
*   Hash mật khẩu
*   Audit log

## 6\. Triển khai & mở rộng

*   Docker hóa hệ thống
*   Chạy local hoặc cloud VPS
*   Dễ scale backend

## 7\. Phụ lục

*   A. ERD tổng thể
*   B. Use Case Diagram
*   C. Sequence Diagram