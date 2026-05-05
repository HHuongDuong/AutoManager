import { useEffect, useMemo, useState } from 'react';
import { useDashboardContext } from '../context/useDashboardContext';

export default function EmployeePage() {
  const { state, actions, derived } = useDashboardContext();
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeePage, setEmployeePage] = useState(1);
  const pageSize = 10;

  const normalizeText = (value) => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const filteredEmployees = useMemo(() => {
    const query = normalizeText(employeeSearch.trim());
    if (!query) return state.employees;
    return state.employees.filter((emp) => {
      const name = normalizeText(emp.full_name || emp.username || '');
      const phone = normalizeText(emp.phone || '');
      const branchName = normalizeText(derived.branchNameMap.get(emp.branch_id) || emp.branch_id || '');
      return name.includes(query) || phone.includes(query) || branchName.includes(query);
    });
  }, [employeeSearch, state.employees, derived.branchNameMap]);

  const totalEmployeePages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const employeeStartIndex = (employeePage - 1) * pageSize;
  const pagedEmployees = filteredEmployees.slice(employeeStartIndex, employeeStartIndex + pageSize);

  useEffect(() => {
    setEmployeePage(1);
  }, [employeeSearch, state.employees.length]);

  useEffect(() => {
    if (employeePage > totalEmployeePages) setEmployeePage(totalEmployeePages);
  }, [employeePage, totalEmployeePages]);

  useEffect(() => {
    if (!state.token) return;
    actions.fetchRoles();
    actions.refreshEmployees();
    actions.refreshShifts();
    if (!state.employeeForm.id && !state.employeeForm.branch_id) {
      actions.setEmployeeForm({ ...state.employeeForm, branch_id: state.branchId || '' });
    }
  }, [state.apiBase, state.branchId, state.token]);

  return (
    <section className="grid employee-grid">
      <div className="card">
        <div className="card-head">
          <h3>Ca làm</h3>
          <span>{state.shifts.length} ca</span>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Tên ca</label>
            <input value={state.shiftForm.name} onChange={(e) => actions.setShiftForm({ ...state.shiftForm, name: e.target.value })} placeholder="Ca sang" />
          </div>
          <div className="form-row">
            <label>Giờ bắt đầu</label>
            <input value={state.shiftForm.start_time} onChange={(e) => actions.setShiftForm({ ...state.shiftForm, start_time: e.target.value })} placeholder="08:00" />
          </div>
          <div className="form-row">
            <label>Giờ kết thúc</label>
            <input value={state.shiftForm.end_time} onChange={(e) => actions.setShiftForm({ ...state.shiftForm, end_time: e.target.value })} placeholder="12:00" />
          </div>
        </div>
        <button className="btn primary" onClick={actions.handleCreateShift}>Tạo ca làm</button>
        <div className="table">
          <div className="table-row head">
            <span>Tên ca</span>
            <span>Bắt đầu</span>
            <span>Kết thúc</span>
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
          {state.shifts.length === 0 && <div className="empty">Chưa có ca làm.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>{state.employeeForm.id ? 'Cập nhật nhân viên' : 'Thêm nhân viên'}</h3>
          <span>{state.employees.length} nhân viên</span>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Họ tên</label>
            <input value={state.employeeForm.full_name} onChange={(e) => actions.setEmployeeForm({ ...state.employeeForm, full_name: e.target.value })} placeholder="Nguyen Van A" />
          </div>
          <div className="form-row">
            <label>Số điện thoại</label>
            <input value={state.employeeForm.phone} onChange={(e) => actions.setEmployeeForm({ ...state.employeeForm, phone: e.target.value })} placeholder="09xxxxxxxx" />
          </div>
          <div className="form-row">
            <label>Chi nhánh</label>
            <select value={state.employeeForm.branch_id} onChange={(e) => actions.setEmployeeForm({ ...state.employeeForm, branch_id: e.target.value })} disabled={!state.branches.length}>
              <option value="">Không gắn chi nhánh</option>
              {state.branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
            {!state.branches.length && <small className="hint">Can tai danh sach chi nhanh truoc.</small>}
          </div>
          <div className="form-row">
            <label>Tài khoản</label>
            <input value={state.employeeForm.username} onChange={(e) => actions.setEmployeeForm({ ...state.employeeForm, username: e.target.value })} placeholder="username" disabled={Boolean(state.employeeForm.id)} />
          </div>
          {!state.employeeForm.id && (
            <div className="form-row">
              <label>Mật khẩu</label>
              <input type="password" value={state.employeeForm.password} onChange={(e) => actions.setEmployeeForm({ ...state.employeeForm, password: e.target.value })} placeholder="********" />
            </div>
          )}
        </div>
        <div className="actions">
          <button className="btn primary" onClick={actions.handleSaveEmployee}>
            {state.employeeForm.id ? 'Cập nhật' : 'Tạo mới'}
          </button>
          <button className="btn ghost" onClick={actions.resetEmployeeForm}>Hủy</button>
        </div>
      </div>

      <div className="card full-row">
        <div className="card-head">
          <h3>Danh sach nhan vien</h3>
          <button className="btn ghost" onClick={actions.refreshEmployees}>Làm mới</button>
        </div>
        <div className="table-toolbar">
          <div className="form-row">
            <label>Tìm kiếm</label>
            <input
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              placeholder="Tên, Số điện thoại, Chi nhánh"
            />
          </div>
          <div className="pager">
            <span>
              {filteredEmployees.length} nhân viên • Trang {employeePage}/{totalEmployeePages}
            </span>
            <button
              className="btn ghost"
              onClick={() => setEmployeePage((prev) => Math.max(1, prev - 1))}
              disabled={employeePage <= 1}
            >
              Trước
            </button>
            <button
              className="btn ghost"
              onClick={() => setEmployeePage((prev) => Math.min(totalEmployeePages, prev + 1))}
              disabled={employeePage >= totalEmployeePages}
            >
              Sau
            </button>
          </div>
        </div>
        <div className="table">
          <div className="table-row head employee-row">
            <span>Họ tên</span>
            <span>Tài khoản</span>
            <span>SDT</span>
            <span>Chi nhánh</span>
            <span>Trạng thái</span>
            <span>Vai trò</span>
            <span>Hành động</span>
          </div>
          {pagedEmployees.map(emp => (
            <div key={emp.id} className="table-row employee-row">
              <span>{emp.full_name || emp.username}</span>
              <span>{emp.username || emp.user_id}</span>
              <span>{emp.phone || '---'}</span>
              <span>{derived.branchNameMap.get(emp.branch_id) || emp.branch_id || '---'}</span>
              <span>{emp.is_active ? 'Đang hoạt động' : 'Đã khóa'}</span>
              <span>
                <div className="inline">
                  <select value={state.roleSelections[emp.user_id] || ''} onChange={(e) => actions.setRoleSelections({ ...state.roleSelections, [emp.user_id]: e.target.value })}>
                    <option value="">Chọn role</option>
                    {state.roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                  <button className="btn ghost" onClick={() => actions.handleAssignRole(emp)}>Gán</button>
                </div>
              </span>
              <span>
                <div className="inline">
                  <button className="btn ghost" onClick={() => actions.handleEditEmployee(emp)}>Sửa</button>
                  <button className="btn ghost" onClick={() => actions.handleToggleUserStatus(emp)}>
                    {emp.is_active ? 'Vô hiệu' : 'Kích hoạt'}
                  </button>
                  <button className="btn danger" onClick={() => actions.handleDeleteEmployee(emp)}>Xóa</button>
                </div>
              </span>
            </div>
          ))}
          {pagedEmployees.length === 0 && <div className="empty">Không có nhân viên phù hợp.</div>}
        </div>
      </div>
    </section>
  );
}
