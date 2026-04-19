export default function LoginModal({
  show,
  token,
  branches,
  branchId,
  loginForm,
  onClose,
  onBranchChange,
  onLoginFormChange,
  onLogout,
  onOpenChangePassword,
  onLogin,
  onPersistSettings
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
              <select
                value={branchId}
                onChange={(e) => {
                  onBranchChange(e.target.value);
                  onPersistSettings();
                }}
                disabled={branches.length === 0}
              >
                <option value="">{branches.length > 0 ? 'Chọn chi nhánh' : 'Chưa có chi nhánh'}</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name || branch.code || branch.id}</option>
                ))}
              </select>
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
