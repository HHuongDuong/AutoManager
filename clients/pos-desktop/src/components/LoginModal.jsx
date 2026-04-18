export default function LoginModal({
  show,
  token,
  apiBase,
  branches,
  branchId,
  loginForm,
  passwordForm,
  onClose,
  onApiBaseChange,
  onBranchChange,
  onLoginFormChange,
  onPasswordFormChange,
  onLogout,
  onChangePassword,
  onLogin,
  onPersistSettings
}) {
  if (!show) return null;

  return (
    <section className="modal">
      <div className="modal-card">
        <header>
          <h2>Cai dat & Dang nhap</h2>
          {token && <button onClick={onClose}>×</button>}
        </header>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-row">
              <label>API Base</label>
              <input value={apiBase} onChange={(e) => onApiBaseChange(e.target.value)} onBlur={onPersistSettings} />
            </div>
            <div className="form-row">
              <label>Chi nhanh</label>
              {branches.length > 0 ? (
                <select
                  value={branchId}
                  onChange={(e) => {
                    onBranchChange(e.target.value);
                    onPersistSettings();
                  }}
                >
                  <option value="">Chon chi nhanh</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name || branch.code || branch.id}</option>
                  ))}
                </select>
              ) : (
                <input value={branchId} onChange={(e) => onBranchChange(e.target.value)} onBlur={onPersistSettings} placeholder="branch_id" />
              )}
            </div>
            <div className="form-row">
              <label>Tai khoan</label>
              <input value={loginForm.username} onChange={(e) => onLoginFormChange({ ...loginForm, username: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Mat khau</label>
              <input type="password" value={loginForm.password} onChange={(e) => onLoginFormChange({ ...loginForm, password: e.target.value })} />
            </div>
            {token && (
              <>
                <div className="form-row">
                  <label>Mat khau cu</label>
                  <input type="password" value={passwordForm.old_password} onChange={(e) => onPasswordFormChange({ ...passwordForm, old_password: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Mat khau moi</label>
                  <input type="password" value={passwordForm.new_password} onChange={(e) => onPasswordFormChange({ ...passwordForm, new_password: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Xac nhan mat khau moi</label>
                  <input type="password" value={passwordForm.confirm_password} onChange={(e) => onPasswordFormChange({ ...passwordForm, confirm_password: e.target.value })} />
                </div>
              </>
            )}
          </div>
        </div>
        <footer>
          {token && (
            <button className="btn ghost" onClick={onLogout}>Dang xuat</button>
          )}
          {token && (
            <button className="btn ghost" onClick={onChangePassword}>Doi mat khau</button>
          )}
          <button className="btn primary" onClick={onLogin}>Dang nhap</button>
        </footer>
      </div>
    </section>
  );
}
