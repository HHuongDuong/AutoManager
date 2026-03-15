import { useEffect } from 'react';
import { useDashboardContext } from '../context/DashboardContext';

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
      <div className="card">
        <div className="card-head">
          <h3>Danh sach chi nhanh</h3>
          <button className="btn ghost" onClick={actions.refreshBranches}>Lam moi</button>
        </div>
        <div className="table">
          <div className="table-row head">
            <span>Ten</span>
            <span>Dia chi</span>
            <span>Lat</span>
            <span>Lng</span>
            <span>Hanh dong</span>
          </div>
          {state.branches.map(branch => (
            <div key={branch.id} className="table-row">
              <span>{branch.name}</span>
              <span>{branch.address || '---'}</span>
              <span>{branch.latitude ?? '---'}</span>
              <span>{branch.longitude ?? '---'}</span>
              <span>
                <button className="btn ghost" onClick={() => actions.handleEditBranch(branch)}>Sua</button>
                <button className="btn danger" onClick={() => actions.handleDeleteBranch(branch)}>Xoa</button>
              </span>
            </div>
          ))}
          {state.branches.length === 0 && <div className="empty">Chua co chi nhanh.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Thong tin chi nhanh</h3>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Chi nhanh</label>
            <select value={state.branchForm.id} onChange={(e) => actions.handleSelectBranchForm(e.target.value)}>
              <option value="">Chon chi nhanh</option>
              {state.branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Ten chi nhanh</label>
            <input value={state.branchForm.name} onChange={(e) => actions.setBranchForm({ ...state.branchForm, name: e.target.value })} placeholder="Chi nhanh 1" />
          </div>
          <div className="form-row">
            <label>Dia chi</label>
            <input value={state.branchForm.address} onChange={(e) => actions.setBranchForm({ ...state.branchForm, address: e.target.value })} placeholder="So nha, duong, quan" />
          </div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={actions.handleCreateBranch}>Tao moi</button>
          <button className="btn ghost" onClick={actions.handleUpdateBranchInfo} disabled={!state.branchForm.id}>Cap nhat</button>
          <button className="btn danger" onClick={() => actions.handleDeleteBranch(state.branchForm)} disabled={!state.branchForm.id}>Xoa</button>
          <button className="btn ghost" onClick={actions.resetBranchForm}>Lam moi</button>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Cap nhat toa do chi nhanh</h3>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Chi nhanh</label>
            <select value={state.branchForm.id} onChange={(e) => actions.handleSelectBranchForm(e.target.value)}>
              <option value="">Chon chi nhanh</option>
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
        <button className="btn primary" onClick={actions.handleUpdateBranchLocation}>Luu toa do</button>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Danh sach ban</h3>
          <button className="btn ghost" onClick={() => actions.refreshTables(state.tableBranchId)}>Lam moi</button>
        </div>
        <div className="form-row">
          <label>Chi nhanh</label>
          <select value={state.tableBranchId} onChange={(e) => {
            actions.setTableBranchId(e.target.value);
            actions.setTableForm({ id: '', name: '', status: 'AVAILABLE' });
          }}>
            <option value="">Chon chi nhanh</option>
            {state.branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>
        <div className="table">
          <div className="table-row head">
            <span>Ten ban</span>
            <span>Trang thai</span>
            <span>Hanh dong</span>
          </div>
          {state.tables.map(table => (
            <div key={table.id} className="table-row">
              <span>{table.name}</span>
              <span>{table.status}</span>
              <span>
                <button className="btn ghost" onClick={() => actions.handleEditTable(table)}>Sua</button>
                <button className="btn danger" onClick={() => actions.handleDeleteTable(table)}>Xoa</button>
              </span>
            </div>
          ))}
          {state.tables.length === 0 && <div className="empty">Chua co ban.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Tao/Cap nhat ban</h3>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Ten ban</label>
            <input value={state.tableForm.name} onChange={(e) => actions.setTableForm({ ...state.tableForm, name: e.target.value })} placeholder="Ban 1" />
          </div>
          <div className="form-row">
            <label>Trang thai</label>
            <select value={state.tableForm.status} onChange={(e) => actions.setTableForm({ ...state.tableForm, status: e.target.value })}>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="OCCUPIED">OCCUPIED</option>
              <option value="RESERVED">RESERVED</option>
              <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
            </select>
          </div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={actions.handleCreateTable}>Tao moi</button>
          <button className="btn ghost" onClick={actions.handleUpdateTable} disabled={!state.tableForm.id}>Cap nhat</button>
          <button className="btn ghost" onClick={() => actions.setTableForm({ id: '', name: '', status: 'AVAILABLE' })}>Lam moi</button>
        </div>
      </div>
    </section>
  );
}
