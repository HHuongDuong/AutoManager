import { useEffect } from 'react';
import { useDashboardContext } from '../context/DashboardContext';

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
          <h3>Vai tro (Roles)</h3>
          <span>{state.roles.length} role</span>
        </div>
        <div className="form-row">
          <label>Ten role</label>
          <input value={state.newRoleName} onChange={(e) => actions.setNewRoleName(e.target.value)} placeholder="VD: Thu ngan" />
        </div>
        <button className="btn primary" onClick={actions.handleCreateRole}>Tao role</button>
        <div className="list">
          {state.roles.map(role => (
            <div key={role.id} className="list-item">
              <div>
                <h4>{role.name}</h4>
                <p>{role.id}</p>
              </div>
              <strong>Role</strong>
            </div>
          ))}
          {state.roles.length === 0 && <div className="empty">Chua co role.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Gan quyen cho role</h3>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Role</label>
            <select value={state.selectedRoleId} onChange={(e) => actions.setSelectedRoleId(e.target.value)}>
              <option value="">Chon role</option>
              {state.roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="table">
          <div className="table-row head">
            <span>Quyen</span>
            <span>Mo ta</span>
            <span>Gan</span>
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
          {state.permissions.length === 0 && <div className="empty">Chua co quyen.</div>}
          {!state.selectedRoleId && state.permissions.length > 0 && <div className="empty">Chon role de gan quyen.</div>}
        </div>
      </div>
    </section>
  );
}
