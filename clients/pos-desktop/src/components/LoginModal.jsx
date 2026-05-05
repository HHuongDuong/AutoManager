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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') onLogin();
  };

  return (
    <section className="modal login-modal">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">🍜</div>
          <h1>AutoManager POS</h1>
          <p>Hệ thống bán hàng tại quầy</p>
          <ul className="login-features">
            <li>⚡ Giao dịch nhanh chóng</li>
            <li>📶 Hỗ trợ offline</li>
            <li>🖨️ In hóa đơn tức thì</li>
            <li>📊 Đồng bộ thời gian thực</li>
          </ul>
        </div>
        <div className="login-form-panel">
          {token && (
            <button className="login-close-btn" onClick={onClose}>×</button>
          )}
          <div className="login-form-inner">
            <h2>{token ? 'Cài đặt' : 'Đăng nhập'}</h2>
            <p className="login-subtitle">
              {token ? 'Cấu hình chi nhánh và tài khoản' : 'Chào mừng! Vui lòng đăng nhập để tiếp tục.'}
            </p>

            <div className="login-fields">
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

              {!token && (
                <>
                  <div className="form-row">
                    <label>Tài khoản</label>
                    <input
                      value={loginForm.username}
                      onChange={(e) => onLoginFormChange({ ...loginForm, username: e.target.value })}
                      onKeyDown={handleKeyDown}
                      placeholder="Nhập tên đăng nhập"
                      autoComplete="username"
                    />
                  </div>
                  <div className="form-row">
                    <label>Mật khẩu</label>
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => onLoginFormChange({ ...loginForm, password: e.target.value })}
                      onKeyDown={handleKeyDown}
                      placeholder="Nhập mật khẩu"
                      autoComplete="current-password"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="login-actions">
              <button className="btn primary login-btn" onClick={onLogin}>
                {token ? 'Lưu cài đặt' : 'Đăng nhập'}
              </button>
              {token && (
                <div className="login-secondary-actions">
                  <button className="btn ghost" onClick={onOpenChangePassword}>Đổi mật khẩu</button>
                  <button className="btn ghost" onClick={onLogout}>Đăng xuất</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
