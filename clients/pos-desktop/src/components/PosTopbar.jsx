export default function PosTopbar({ branchName, userName, onOpenSettings }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="badge">AutoManager</span>
        <div>
          <h1>POS Desktop</h1>
          <p>Giao dien thu ngan cho cua hang</p>
        </div>
      </div>
      <div className="top-actions">
        <div className="meta">
          <span>Chi nhanh</span>
          <strong>{branchName || 'Chua chon'}</strong>
        </div>
        <div className="meta">
          <span>Nhan vien</span>
          <strong>{userName || '---'}</strong>
        </div>
        <button className="btn ghost" onClick={onOpenSettings}>Cai dat</button>
      </div>
    </header>
  );
}
