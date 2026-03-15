export default function Topbar({ onOpenSettings, token }) {
  return (
    <header className="topbar">
      <div>
        <h1>Xin chào 👋</h1>
        <p>Theo dõi hiệu suất vận hành và bán hàng theo thời gian thực.</p>
      </div>
      <div className="top-actions">
        <input placeholder="Tìm báo cáo, đơn hàng..." />
        <button className="btn primary" onClick={onOpenSettings}>
          {token ? 'Cập nhật cấu hình' : 'Đăng nhập'}
        </button>
      </div>
    </header>
  );
}
