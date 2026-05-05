import { useEffect } from 'react';
import { useDashboardContext } from '../context/useDashboardContext';

export default function RbacPage() {
  const { state, actions, derived } = useDashboardContext();

  useEffect(() => {
    if (!state.token) return;
    actions.fetchRoles();
    actions.fetchPermissions();
  }, [state.apiBase, state.token]);

  useEffect(() => {
    if (!state.selectedRoleId) return;
    actions.fetchRolePermissions(state.selectedRoleId);
  }, [state.selectedRoleId]);

  return (
    <section className="grid">
      <div className="card">
        <div className="card-head">
          <h3>Vai trò (Roles)</h3>
          <span>{state.roles.length} vai trò</span>
        </div>
        <div className="form-row">
          <label>Tên role</label>
          <input value={state.newRoleName} onChange={(e) => actions.setNewRoleName(e.target.value)} placeholder="VD: Thu ngân" />
        </div>
        <button className="btn primary" onClick={actions.handleCreateRole}>Tạo role</button>
        <div className="list">
          {state.roles.map(role => (
            <div key={role.id} className="list-item">
              <div>
                <h4>{role.name}</h4>
                <p>{role.id}</p>
              </div>
              <button className="btn ghost" onClick={() => actions.handleDeleteRole(role)}>Xóa</button>
            </div>
          ))}
          {state.roles.length === 0 && <div className="empty">Chưa có role.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Gán quyền cho role</h3>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Role</label>
            <select value={state.selectedRoleId} onChange={(e) => actions.setSelectedRoleId(e.target.value)}>
              <option value="">Chọn role</option>
              {state.roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="table">
          <div className="table-row head">
            <span>Quyền</span>
            <span>Mô tả</span>
            <span>Gán</span>
          </div>
          {state.permissions.map(perm => (
            <div key={perm.id} className="table-row">
              <span>{perm.code}</span>
              <span>{perm.description || '---'}</span>
              <span>
                <input
                  type="checkbox"
                  checked={derived.assignedPermissionIds.has(perm.id)}
                  onChange={(e) => actions.handleToggleRolePermission(perm.id, e.target.checked)}
                  disabled={!state.selectedRoleId}
                />
              </span>
            </div>
          ))}
          {state.permissions.length === 0 && <div className="empty">Chưa có quyền.</div>}
          {!state.selectedRoleId && state.permissions.length > 0 && <div className="empty">Chọn role để gán quyền.</div>}
        </div>
      </div>
    </section>
  );
}
