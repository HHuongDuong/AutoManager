export default function LoginModal({
  show,
  token,
  apiBase,
  branches,
  branchId,
  loginForm,
  passwordForm,
  statusMessage,
  onClose,
  onApiBaseChange,
  onBranchChange,
  onLoginFormChange,
  onPasswordFormChange,
  onLogout,
  onChangePassword,
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
              <label>API Base</label>
              <input value={apiBase} onChange={(e) => onApiBaseChange(e.target.value)} />
            </div>
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
            {token && (
              <>
                <div className="form-row">
                  <label>Mật khẩu cũ</label>
                  <input type="password" value={passwordForm.old_password} onChange={(e) => onPasswordFormChange({ ...passwordForm, old_password: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Mật khẩu mới</label>
                  <input type="password" value={passwordForm.new_password} onChange={(e) => onPasswordFormChange({ ...passwordForm, new_password: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Xác nhận mật khẩu mới</label>
                  <input type="password" value={passwordForm.confirm_password} onChange={(e) => onPasswordFormChange({ ...passwordForm, confirm_password: e.target.value })} />
                </div>
              </>
            )}
          </div>
          {statusMessage && <div className="status">{statusMessage}</div>}
        </div>
        <footer>
          {token && (
            <button className="btn ghost" onClick={onLogout}>Đăng xuất</button>
          )}
          {token && (
            <button className="btn ghost" onClick={onChangePassword}>Đổi mật khẩu</button>
          )}
          <button className="btn primary" onClick={onLogin}>Đăng nhập</button>
        </footer>
      </div>
    </section>
  );
}
