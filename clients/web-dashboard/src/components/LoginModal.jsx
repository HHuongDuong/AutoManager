export default function LoginModal({
  show,
  token,
  branches,
  branchId,
  loginForm,
  statusMessage,
  onClose,
  onBranchChange,
  onLoginFormChange,
  onLogout,
  onOpenChangePassword,
  onLogin
}) {
  if (!show) return null;

  return (
    <section className="modal">
      <div className="modal-card">
        <header>
          <h2>Cài đặt & Đăng nhập</h2>
          {token && <button onClick={onClose}>×</button>}
        </header>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-row">
              <label>Chi nhánh</label>
              <select value={branchId} onChange={(e) => onBranchChange(e.target.value)} disabled={!branches.length}>
                <option value="">Tất cả chi nhánh</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
              {!branches.length && <small className="hint">Cần đăng nhập và có quyền để tải danh sách chi nhánh.</small>}
            </div>
            <div className="form-row">
              <label>Tài khoản</label>
              <input value={loginForm.username} onChange={(e) => onLoginFormChange({ ...loginForm, username: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Mật khẩu</label>
              <input type="password" value={loginForm.password} onChange={(e) => onLoginFormChange({ ...loginForm, password: e.target.value })} />
            </div>
          </div>
          {statusMessage && <div className="status">{statusMessage}</div>}
        </div>
        <footer>
          {token && (
            <button className="btn ghost" onClick={onLogout}>Đăng xuất</button>
          )}
          {token && (
            <button className="btn ghost" onClick={onOpenChangePassword}>Đổi mật khẩu</button>
          )}
          <button className="btn primary" onClick={onLogin}>Đăng nhập</button>
        </footer>
      </div>
    </section>
  );
}
