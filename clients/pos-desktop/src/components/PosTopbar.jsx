export default function PosTopbar({ branchName, userName, onOpenSettings }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="badge">AutoManager</span>
        <div>
          <h1>POS Desktop</h1>
          <p>Giao diện thu ngân cho cửa hàng</p>
        </div>
      </div>
      <div className="top-actions">
        <div className="meta">
          <span>Chi nhánh</span>
          <strong>{branchName || 'Chưa chọn'}</strong>
        </div>
        <div className="meta">
          <span>Nhân viên</span>
          <strong>{userName || '---'}</strong>
        </div>
        <button className="btn ghost" onClick={onOpenSettings}>Cài đặt</button>
      </div>
    </header>
  );
}
