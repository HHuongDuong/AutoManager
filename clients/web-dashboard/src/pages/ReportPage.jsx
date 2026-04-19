import { formatVnd } from '../utils/format';
import { useDashboardContext } from '../context/DashboardContext';

export default function ReportPage() {
  const { state, actions, derived } = useDashboardContext();

  return (
    <section className="grid">
      <div className="card">
        <div className="form-row">
          <label>Chi nhánh</label>
          <select value={state.branchId} onChange={(e) => actions.setBranchIdAndPersist(e.target.value)} disabled={!state.branches.length}>
            <option value="">Tất cả chi nhánh</option>
            {state.branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
          {!state.branches.length && <small className="hint">Cần tải danh sách chi nhánh trước.</small>}
        </div>
        <h3>Tổng hợp doanh thu</h3>
        <p>Tổng doanh thu: {formatVnd(derived.revenueSeries.reduce((sum, v) => sum + v, 0))}</p>
        <p>Đơn hàng: {state.orders.length}</p>
        <div className="actions">
          <button className="btn ghost" onClick={() => actions.downloadReport('/reports/revenue/export')}>Xuất doanh thu</button>
          <button className="btn ghost" onClick={() => actions.downloadReport('/reports/inventory/export')}>Xuất tồn kho</button>
          <button className="btn ghost" onClick={() => actions.downloadReport('/reports/attendance/export')}>Xuất chấm công</button>
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
          {state.auditLogs.length === 0 && <div className="empty">Chưa có audit log.</div>}
        </div>
      </div>
    </section>
  );
}
