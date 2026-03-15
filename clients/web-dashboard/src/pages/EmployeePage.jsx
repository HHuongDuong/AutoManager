import { useEffect } from 'react';
import { useDashboardContext } from '../context/DashboardContext';

export default function EmployeePage() {
  const { state, actions, derived } = useDashboardContext();

  useEffect(() => {
    if (!state.token) return;
    actions.fetchRoles();
    actions.refreshEmployees();
    actions.refreshShifts();
    actions.fetchAttendanceLogs();
    if (!state.employeeForm.id && !state.employeeForm.branch_id) {
      actions.setEmployeeForm({ ...state.employeeForm, branch_id: state.branchId || '' });
    }
  }, [state.apiBase, state.branchId, state.token]);

  return (
    <section className="grid">
      <div className="card">
        <div className="card-head">
          <h3>Ca lam</h3>
          <span>{state.shifts.length} ca</span>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Ten ca</label>
            <input value={state.shiftForm.name} onChange={(e) => actions.setShiftForm({ ...state.shiftForm, name: e.target.value })} placeholder="Ca sang" />
          </div>
          <div className="form-row">
            <label>Gio bat dau</label>
            <input value={state.shiftForm.start_time} onChange={(e) => actions.setShiftForm({ ...state.shiftForm, start_time: e.target.value })} placeholder="08:00" />
          </div>
          <div className="form-row">
            <label>Gio ket thuc</label>
            <input value={state.shiftForm.end_time} onChange={(e) => actions.setShiftForm({ ...state.shiftForm, end_time: e.target.value })} placeholder="12:00" />
          </div>
        </div>
        <button className="btn primary" onClick={actions.handleCreateShift}>Tao ca lam</button>
        <div className="table">
          <div className="table-row head">
            <span>Ten ca</span>
            <span>Bat dau</span>
            <span>Ket thuc</span>
            <span></span>
          </div>
          {state.shifts.map(shift => (
            <div key={shift.id} className="table-row">
              <span>{shift.name}</span>
              <span>{shift.start_time}</span>
              <span>{shift.end_time}</span>
              <span></span>
            </div>
          ))}
          {state.shifts.length === 0 && <div className="empty">Chua co ca lam.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Lich su cham cong</h3>
          <button className="btn ghost" onClick={actions.fetchAttendanceLogs}>Lam moi</button>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Nhan vien</label>
            <select value={state.attendanceFilters.employee_id} onChange={(e) => actions.setAttendanceFilters({ ...state.attendanceFilters, employee_id: e.target.value })}>
              <option value="">Tat ca</option>
              {state.employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name || emp.username}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Tu ngay</label>
            <input type="date" value={state.attendanceFilters.from} onChange={(e) => actions.setAttendanceFilters({ ...state.attendanceFilters, from: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Den ngay</label>
            <input type="date" value={state.attendanceFilters.to} onChange={(e) => actions.setAttendanceFilters({ ...state.attendanceFilters, to: e.target.value })} />
          </div>
        </div>
        <button className="btn primary" onClick={actions.fetchAttendanceLogs}>Loc</button>
        <div className="table">
          <div className="table-row head">
            <span>Nhan vien</span>
            <span>Ca</span>
            <span>Check-in</span>
            <span>Trang thai</span>
            <span>Check-out</span>
            <span>Trang thai</span>
          </div>
          {state.attendanceLogs.slice(0, 12).map(log => (
            <div key={log.id} className="table-row">
              <span>{log.full_name || log.employee_id}</span>
              <span>{log.shift_name || log.shift_id || '---'}</span>
              <span>{log.check_in ? new Date(log.check_in).toLocaleString('vi-VN') : '---'}</span>
              <span>{log.check_in_status ? `${log.check_in_status} (${log.check_in_diff_minutes}m)` : '---'}</span>
              <span>{log.check_out ? new Date(log.check_out).toLocaleString('vi-VN') : '---'}</span>
              <span>{log.check_out_status ? `${log.check_out_status} (${log.check_out_diff_minutes}m)` : '---'}</span>
            </div>
          ))}
          {state.attendanceLogs.length === 0 && <div className="empty">Chua co du lieu cham cong.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>{state.employeeForm.id ? 'Cap nhat nhan vien' : 'Them nhan vien'}</h3>
          <span>{state.employees.length} nhan vien</span>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Ho ten</label>
            <input value={state.employeeForm.full_name} onChange={(e) => actions.setEmployeeForm({ ...state.employeeForm, full_name: e.target.value })} placeholder="Nguyen Van A" />
          </div>
          <div className="form-row">
            <label>Chuc vu</label>
            <input value={state.employeeForm.position} onChange={(e) => actions.setEmployeeForm({ ...state.employeeForm, position: e.target.value })} placeholder="Thu ngan" />
          </div>
          <div className="form-row">
            <label>So dien thoai</label>
            <input value={state.employeeForm.phone} onChange={(e) => actions.setEmployeeForm({ ...state.employeeForm, phone: e.target.value })} placeholder="09xxxxxxxx" />
          </div>
          <div className="form-row">
            <label>Chi nhanh</label>
            <select value={state.employeeForm.branch_id} onChange={(e) => actions.setEmployeeForm({ ...state.employeeForm, branch_id: e.target.value })} disabled={!state.branches.length}>
              <option value="">Khong gan chi nhanh</option>
              {state.branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
            {!state.branches.length && <small className="hint">Can tai danh sach chi nhanh truoc.</small>}
          </div>
          <div className="form-row">
            <label>Tai khoan</label>
            <input value={state.employeeForm.username} onChange={(e) => actions.setEmployeeForm({ ...state.employeeForm, username: e.target.value })} placeholder="username" disabled={Boolean(state.employeeForm.id)} />
          </div>
          {!state.employeeForm.id && (
            <div className="form-row">
              <label>Mat khau</label>
              <input type="password" value={state.employeeForm.password} onChange={(e) => actions.setEmployeeForm({ ...state.employeeForm, password: e.target.value })} placeholder="********" />
            </div>
          )}
        </div>
        <div className="actions">
          <button className="btn primary" onClick={actions.handleSaveEmployee}>
            {state.employeeForm.id ? 'Cap nhat' : 'Tao moi'}
          </button>
          <button className="btn ghost" onClick={actions.resetEmployeeForm}>Huy</button>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Danh sach nhan vien</h3>
          <button className="btn ghost" onClick={actions.refreshEmployees}>Lam moi</button>
        </div>
        <div className="table">
          <div className="table-row head">
            <span>Ho ten</span>
            <span>Tai khoan</span>
            <span>Chuc vu</span>
            <span>SDT</span>
            <span>Chi nhanh</span>
            <span>Trang thai</span>
            <span>Vai tro</span>
            <span>Hanh dong</span>
          </div>
          {state.employees.map(emp => (
            <div key={emp.id} className="table-row">
              <span>{emp.full_name || emp.username}</span>
              <span>{emp.username || emp.user_id}</span>
              <span>{emp.position || '---'}</span>
              <span>{emp.phone || '---'}</span>
              <span>{derived.branchNameMap.get(emp.branch_id) || emp.branch_id || '---'}</span>
              <span>{emp.is_active ? 'Dang hoat dong' : 'Da khoa'}</span>
              <span>
                <div className="inline">
                  <select value={state.roleSelections[emp.user_id] || ''} onChange={(e) => actions.setRoleSelections({ ...state.roleSelections, [emp.user_id]: e.target.value })}>
                    <option value="">Chon role</option>
                    {state.roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                  <button className="btn ghost" onClick={() => actions.handleAssignRole(emp)}>Gan</button>
                </div>
              </span>
              <span>
                <div className="inline">
                  <button className="btn ghost" onClick={() => actions.handleEditEmployee(emp)}>Sua</button>
                  <button className="btn ghost" onClick={() => actions.handleToggleUserStatus(emp)}>
                    {emp.is_active ? 'Vo hieu' : 'Kich hoat'}
                  </button>
                  <button className="btn danger" onClick={() => actions.handleDeleteEmployee(emp)}>Xoa</button>
                </div>
              </span>
            </div>
          ))}
          {state.employees.length === 0 && <div className="empty">Chua co du lieu nhan vien.</div>}
        </div>
      </div>
    </section>
  );
}
