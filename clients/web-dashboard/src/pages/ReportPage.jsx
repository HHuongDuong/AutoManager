import { formatVnd } from '../utils/format';
import { useDashboardContext } from '../context/DashboardContext';

export default function ReportPage() {
  const { state, actions, derived } = useDashboardContext();

  return (
    <section className="grid">
      <div className="card">
        <div className="form-row">
          <label>Chi nhanh</label>
          <select value={state.branchId} onChange={(e) => actions.setBranchIdAndPersist(e.target.value)} disabled={!state.branches.length}>
            <option value="">Tat ca chi nhanh</option>
            {state.branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
          {!state.branches.length && <small className="hint">Can tai danh sach chi nhanh truoc.</small>}
        </div>
        <h3>Tong hop doanh thu</h3>
        <p>Tong doanh thu: {formatVnd(derived.revenueSeries.reduce((sum, v) => sum + v, 0))}</p>
        <p>Don hang: {state.orders.length}</p>
        <div className="actions">
          <button className="btn ghost" onClick={() => actions.downloadReport('/reports/revenue/export')}>Xuat doanh thu</button>
          <button className="btn ghost" onClick={() => actions.downloadReport('/reports/inventory/export')}>Xuat ton kho</button>
          <button className="btn ghost" onClick={() => actions.downloadReport('/reports/attendance/export')}>Xuat cham cong</button>
        </div>
      </div>
      <div className="card">
        <h3>Audit logs</h3>
        <div className="list">
          {state.auditLogs.map(log => (
            <div key={log.id} className="list-item">
              <div>
                <h4>{log.action}</h4>
                <p>{log.object_type}</p>
              </div>
              <strong>{new Date(log.created_at).toLocaleDateString('vi-VN')}</strong>
            </div>
          ))}
          {state.auditLogs.length === 0 && <div className="empty">Chua co audit log.</div>}
        </div>
      </div>
    </section>
  );
}
