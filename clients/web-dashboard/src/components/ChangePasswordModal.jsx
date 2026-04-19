export default function ChangePasswordModal({
  show,
  passwordForm,
  statusMessage,
  onClose,
  onPasswordFormChange,
  onSubmit
}) {
  if (!show) return null;

  return (
    <section className="modal">
      <div className="modal-card">
        <header>
          <h2>Doi mat khau</h2>
          <button onClick={onClose}>×</button>
        </header>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-row">
              <label>Mat khau cu</label>
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
              <label>Mat khau moi</label>
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
              <label>Xac nhan mat khau moi</label>
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
          {statusMessage && <div className="status">{statusMessage}</div>}
        </div>
        <footer>
          <button className="btn ghost" onClick={onClose}>Huy</button>
          <button className="btn primary" onClick={onSubmit}>Cap nhat</button>
        </footer>
      </div>
    </section>
  );
}
