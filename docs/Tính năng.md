**I. Nhóm chức năng nền tảng (Core System)**

**1️⃣ Đăng nhập & phân quyền (RBAC)**

**Tính năng**

*   Đăng nhập bằng tài khoản & mật khẩu
*   Phân quyền theo vai trò
*   Ghi log thao tác

**Workflow thực tế**

1.  Nhân viên mở POS
2.  Nhập username & password
3.  Hệ thống xác thực
4.  Load chức năng theo quyền
5.  Ghi log đăng nhập

📌 _Ngăn nhân viên truy cập chức năng không được phép_

**II. Nhóm nhân sự & vận hành**

**2️⃣ Quản lý nhân viên**

**Tính năng**

*   Thêm / sửa / xóa nhân viên
*   Kích hoạt / vô hiệu hóa tài khoản
*   Gán vai trò

**Workflow**

1.  Chủ quán vào dashboard
2.  Thêm nhân viên mới
3.  Gán vai trò (nhân viên / quản lý)
4.  Nhân viên đăng nhập sử dụng

**3️⃣ Chấm công & ca làm**

**Tính năng**

*   Check-in / check-out
*   Gán ca làm
*   Tổng hợp giờ công

**Workflow**

1.  Nhân viên đến quán → mở app
2.  Check-in
3.  Làm việc
4.  Check-out khi hết ca
5.  Chủ quán xem báo cáo công

**III. Nhóm bán hàng (POS – Trái tim hệ thống)**

**4️⃣ Tạo đơn hàng tại chỗ (DINE\_IN)**

**Tính năng**

*   Tạo đơn
*   Gán bàn
*   Thêm món
*   Thanh toán tiền mặt

**Workflow**

1.  Nhân viên chọn **Tại chỗ**
2.  Chọn bàn trống
3.  Thêm món
4.  Phục vụ khách
5.  Thanh toán
6.  Đóng đơn
7.  Bàn chuyển về trạng thái trống

**5️⃣ Tạo đơn hàng mang đi (TAKEAWAY)**

**Tính năng**

*   Tạo đơn
*   Không gán bàn
*   Thanh toán tiền mặt

**Workflow**

1.  Nhân viên chọn **Mang đi**
2.  Thêm món
3.  Thanh toán ngay
4.  Đóng đơn

📌 _Nhanh – phù hợp giờ cao điểm_

**IV. Nhóm quản lý bàn**

**6️⃣ Quản lý bàn**

**Tính năng**

*   Thêm / sửa / xóa bàn
*   Theo dõi trạng thái

**Workflow**

1.  Chủ quán cấu hình số bàn
2.  Khi tạo đơn tại chỗ → bàn chuyển **Đang dùng**
3.  Khi đóng đơn → bàn về **Trống**

**V. Nhóm sản phẩm & menu**

**7️⃣ Quản lý sản phẩm**

**Tính năng**

*   CRUD sản phẩm
*   Phân loại (đồ ăn, đồ uống, combo)
*   Thiết lập giá

**Workflow**

1.  Chủ quán tạo menu
2.  Nhân viên chọn món khi bán
3.  Giá tự động áp dụng

**VI. Nhóm kho nguyên liệu (theo chế biến)**

**9️⃣ Nhập kho nguyên liệu**

**Tính năng**

*   Tạo phiếu nhập kho
*   Ghi nhận số lượng
*   Ghi nhận giá nhập vào 

**Workflow**

1.  Chủ quán nhập nguyên liệu mới
2.  Hệ thống tăng tồn kho
3.  Ghi lịch sử nhập

**🔟 Xuất kho khi chế biến**

**Tính năng**

*   Trừ kho khi lấy nguyên liệu nấu
*   Không tự trừ khi bán

**Workflow**

1.  Nhân viên bếp lấy nguyên liệu
2.  Nhập số lượng đã dùng
3.  Hệ thống trừ kho
4.  Ghi lịch sử xuất

**1️⃣1️⃣ Điều chỉnh tồn kho**

**Tính năng**

*   Điều chỉnh thủ công
*   Ghi lý do

**Workflow**

1.  Kiểm kê kho
2.  Phát hiện lệch
3.  Điều chỉnh
4.  Lưu lịch sử

**VII. Nhóm báo cáo & quản lý**

**1️⃣2️⃣ Báo cáo doanh thu**

**Workflow**

1.  Chủ quán mở dashboard
2.  Xem doanh thu theo ngày / tháng

**1️⃣3️⃣ Báo cáo tồn kho**

**Workflow**

1.  Chủ quán xem tồn kho hiện tại
2.  Phát hiện nguyên liệu sắp hết

**1️⃣4️⃣ Báo cáo chấm công**

**Workflow**

1.  Chủ quán xem giờ làm nhân viên
2.  Tính lương (ngoài hệ thống)

**VIII. Nhóm bảo mật & quản trị**

**1️⃣5️⃣ Audit log**

**Tính năng**

*   Ghi nhận mọi thao tác quan trọng

**Workflow**

1.  Nhân viên thao tác (tạo đơn, sửa kho…)
2.  Hệ thống ghi log
3.  Chủ quán tra cứu khi cần

**IX. Nhóm AI hỗ trợ (Tùy chọn – cộng điểm)**

**1️⃣6️⃣ Dự báo nhu cầu nguyên liệu**

**Workflow**

1.  Hệ thống phân tích lịch sử bán
2.  Gợi ý số lượng nhập
3.  Chủ quán quyết định