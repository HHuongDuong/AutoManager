export default function ChangePasswordModal({
  show,
  passwordForm,
  onPasswordFormChange,
  onClose,
  onSubmit
}) {
  if (!show) return null;

  return (
    <section className="modal">
      <div className="modal-card">
        <header>
          <h2>Đổi mật khẩu</h2>
          <button onClick={onClose}>×</button>
        </header>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-row">
              <label>Mật khẩu cũ</label>
              <input
                type="password"
                value={passwordForm.old_password}
                onChange={(e) => onPasswordFormChange({
                  ...passwordForm,
                  old_password: e.target.value
                })}
              />
            </div>
            <div className="form-row">
              <label>Mật khẩu mới</label>
              <input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => onPasswordFormChange({
                  ...passwordForm,
                  new_password: e.target.value
                })}
              />
            </div>
            <div className="form-row">
              <label>Xác nhận mật khẩu mới</label>
              <input
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => onPasswordFormChange({
                  ...passwordForm,
                  confirm_password: e.target.value
                })}
              />
            </div>
          </div>
        </div>
        <footer>
          <button className="btn ghost" onClick={onClose}>Đóng</button>
          <button className="btn primary" onClick={onSubmit}>Lưu</button>
        </footer>
      </div>
    </section>
  );
}
