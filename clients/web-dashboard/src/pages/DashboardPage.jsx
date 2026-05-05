import { formatVnd } from '../utils/format';
import MetricCard from '../components/MetricCard';
import RevenueChart from '../components/RevenueChart';
import { useDashboardContext } from '../context/useDashboardContext';

export default function DashboardPage() {
  const { state, derived } = useDashboardContext();
  const { revenueChartData, totalRevenueToday, orderCount } = derived;

  return (
    <>
      <section className="metrics">
        <MetricCard title="Doanh thu hôm nay" value={formatVnd(totalRevenueToday)} subtitle="So với hôm qua" />
        <MetricCard title="Đơn hàng" value={orderCount} subtitle="Trong khoảng lọc" />
        <MetricCard title="Trạng thái hệ thống" value={state.loading ? 'Đang đồng bộ' : state.token ? 'Đã kết nối' : 'Chưa đăng nhập'} subtitle={state.apiBase} />
      </section>

      <section className="grid">
        <div className="card">
          <div className="card-head">
            <h3>Biểu đồ doanh thu</h3>
            <span>{revenueChartData.length} điểm dữ liệu</span>
          </div>
          <div className="chart-wrapper">
            <RevenueChart data={revenueChartData} />
          </div>
        </div>

        <div className="card">
          <h3>Đơn hàng gần đây</h3>
          <div className="list">
            {state.orders.slice(0, 6).map(order => (
              <div key={order.id} className="list-item">
                <div>
                  <h4>{order.id}</h4>
                  <p>{order.order_type}</p>
                </div>
                <strong>{formatVnd(order.total_amount)}</strong>
              </div>
            ))}
            {state.orders.length === 0 && <div className="empty">Chưa có đơn hàng.</div>}
          </div>
        </div>

        <div className="card">
          <h3>Audit logs</h3>
          <div className="list">
            {state.auditLogs.map(log => (
              <div key={log.id} className="list-item">
                <div>
                  <h4>{log.action}</h4>
                  <p>{log.object_type} • {new Date(log.created_at).toLocaleString('vi-VN')}</p>
                </div>
                <strong>{log.user_id?.slice(0, 8) || 'system'}</strong>
              </div>
            ))}
            {state.auditLogs.length === 0 && <div className="empty">Chưa có audit log.</div>}
          </div>
        </div>
      </section>
    </>
  );
}
