import { useEffect } from 'react';
import { useDashboardContext } from '../context/useDashboardContext';

export default function BranchPage() {
  const { state, actions } = useDashboardContext();

  useEffect(() => {
    if (!state.token) return;
    actions.refreshBranches();
  }, [state.apiBase, state.token]);

  useEffect(() => {
    if (!state.tableBranchId && state.branches.length) {
      actions.setTableBranchId(state.branches[0].id);
    }
  }, [state.branches]);

  useEffect(() => {
    if (!state.tableBranchId) return;
    actions.refreshTables(state.tableBranchId);
  }, [state.tableBranchId, state.apiBase, state.token]);

  return (
    <section className="grid">
      <div className="grid branch-top full-row">
        <div className="card">
        <div className="card-head">
          <h3>Danh sach chi nhánh</h3>
          <button className="btn ghost" onClick={actions.refreshBranches}>Làm mới</button>
        </div>
        <div className="table">
          <div className="table-row head branch-row">
            <span>Tên</span>
            <span>Địa chỉ</span>
            <span>Lat</span>
            <span>Lng</span>
            <span>Hành động</span>
          </div>
          {state.branches.map(branch => (
            <div key={branch.id} className="table-row branch-row">
              <span>{branch.name}</span>
              <span>{branch.address || '---'}</span>
              <span>{branch.latitude ?? '---'}</span>
              <span>{branch.longitude ?? '---'}</span>
              <span>
                <button className="btn ghost" onClick={() => actions.handleEditBranch(branch)}>Sửa</button>
                <button className="btn danger" onClick={() => actions.handleDeleteBranch(branch)}>Xóa</button>
              </span>
            </div>
          ))}
          {state.branches.length === 0 && <div className="empty">Chưa có chi nhánh.</div>}
        </div>
        </div>

        <div className="card">
        <div className="card-head">
          <h3>Thông tin chi nhánh</h3>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Chi nhánh</label>
            <select value={state.branchForm.id} onChange={(e) => actions.handleSelectBranchForm(e.target.value)}>
              <option value="">Chọn chi nhánh</option>
              {state.branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Tên chi nhánh</label>
            <input value={state.branchForm.name} onChange={(e) => actions.setBranchForm({ ...state.branchForm, name: e.target.value })} placeholder="Chi nhánh 1" />
          </div>
          <div className="form-row">
            <label>Địa chỉ</label>
            <input value={state.branchForm.address} onChange={(e) => actions.setBranchForm({ ...state.branchForm, address: e.target.value })} placeholder="Số nhà, đường, quận" />
          </div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={actions.handleCreateBranch}>Tạo mới</button>
          <button className="btn ghost" onClick={actions.handleUpdateBranchInfo} disabled={!state.branchForm.id}>Cập nhật</button>
          <button className="btn danger" onClick={() => actions.handleDeleteBranch(state.branchForm)} disabled={!state.branchForm.id}>Xóa</button>
          <button className="btn ghost" onClick={actions.resetBranchForm}>Làm mới</button>
        </div>
        </div>

        <div className="card">
        <div className="card-head">
          <h3>Cập nhật tọa độ chi nhánh</h3>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Chi nhánh</label>
            <select value={state.branchForm.id} onChange={(e) => actions.handleSelectBranchForm(e.target.value)}>
              <option value="">Chọn chi nhánh</option>
              {state.branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Latitude</label>
            <input value={state.branchForm.latitude} onChange={(e) => actions.setBranchForm({ ...state.branchForm, latitude: e.target.value })} placeholder="10.123456" />
          </div>
          <div className="form-row">
            <label>Longitude</label>
            <input value={state.branchForm.longitude} onChange={(e) => actions.setBranchForm({ ...state.branchForm, longitude: e.target.value })} placeholder="106.123456" />
          </div>
        </div>
        <button className="btn primary" onClick={actions.handleUpdateBranchLocation}>Lưu tọa độ</button>
        </div>
      </div>

      <div className="grid table-grid full-row">
        <div className="card">
          <div className="card-head">
            <h3>Tạo/Cập nhật bàn</h3>
          </div>
          <div className="form-grid">
            <div className="form-row">
              <label>Tên bàn</label>
              <input value={state.tableForm.name} onChange={(e) => actions.setTableForm({ ...state.tableForm, name: e.target.value })} placeholder="Ban 1" />
            </div>
            <div className="form-row">
              <label>Trạng thái</label>
              <select value={state.tableForm.status} onChange={(e) => actions.setTableForm({ ...state.tableForm, status: e.target.value })}>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="OCCUPIED">OCCUPIED</option>
                <option value="RESERVED">RESERVED</option>
                <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
              </select>
            </div>
          </div>
          <div className="actions">
            <button className="btn primary" onClick={actions.handleCreateTable}>Tạo mới</button>
            <button className="btn ghost" onClick={actions.handleUpdateTable} disabled={!state.tableForm.id}>Cập nhật</button>
            <button className="btn ghost" onClick={() => actions.setTableForm({ id: '', name: '', status: 'AVAILABLE' })}>Làm mới</button>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Danh sach ban</h3>
            <button className="btn ghost" onClick={() => actions.refreshTables(state.tableBranchId)}>Làm mới</button>
          </div>
          <div className="form-row">
            <label>Chi nhánh</label>
            <select value={state.tableBranchId} onChange={(e) => {
              actions.setTableBranchId(e.target.value);
              actions.setTableForm({ id: '', name: '', status: 'AVAILABLE' });
            }}>
              <option value="">Chọn chi nhánh</option>
              {state.branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
          <div className="table">
            <div className="table-row head">
              <span>Tên bàn</span>
              <span>Trạng thái</span>
              <span>Hành động</span>
            </div>
            {state.tables.map(table => (
              <div key={table.id} className="table-row">
                <span>{table.name}</span>
                <span>{table.status}</span>
                <span>
                  <button className="btn ghost" onClick={() => actions.handleEditTable(table)}>Sửa</button>
                  <button className="btn danger" onClick={() => actions.handleDeleteTable(table)}>Xóa</button>
                </span>
              </div>
            ))}
            {state.tables.length === 0 && <div className="empty">Chưa có bàn.</div>}
          </div>
        </div>
      </div>

    </section>
  );
}
