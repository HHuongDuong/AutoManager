import { formatVnd } from '../utils/format';
import MetricCard from '../components/MetricCard';
import RevenueChart from '../components/RevenueChart';
import { useDashboardContext } from '../context/DashboardContext';

export default function DashboardPage() {
  const { state, derived } = useDashboardContext();
  const { revenueChartData, totalRevenueToday, orderCount } = derived;

  return (
    <>
      <section className="metrics">
        <MetricCard title="Doanh thu hom nay" value={formatVnd(totalRevenueToday)} subtitle="So voi hom qua" />
        <MetricCard title="Don hang" value={orderCount} subtitle="Trong khoang loc" />
        <MetricCard title="Canh bao ton kho" value={state.inventoryAlerts.length} subtitle="Nguyen lieu can theo doi" />
        <MetricCard title="Trang thai he thong" value={state.loading ? 'Dang dong bo' : state.token ? 'Da ket noi' : 'Chua dang nhap'} subtitle={state.apiBase} />
      </section>

      <section className="grid">
        <div className="card">
          <div className="card-head">
            <h3>Bieu do doanh thu</h3>
            <span>{revenueChartData.length} diem du lieu</span>
          </div>
          <div className="chart-wrapper">
            <RevenueChart data={revenueChartData} />
          </div>
        </div>

        <div className="card">
          <h3>Don hang gan day</h3>
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
            {state.orders.length === 0 && <div className="empty">Chua co don hang.</div>}
          </div>
        </div>

        <div className="card">
          <h3>Ton kho can nhap</h3>
          <div className="list">
            {state.inventoryAlerts.map(item => (
              <div key={item.id} className="list-item">
                <div>
                  <h4>{item.name}</h4>
                  <p>{item.status}</p>
                </div>
                <strong>{item.qty} kg</strong>
              </div>
            ))}
            {state.inventoryAlerts.length === 0 && <div className="empty">Khong co canh bao.</div>}
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
            {state.auditLogs.length === 0 && <div className="empty">Chua co audit log.</div>}
          </div>
        </div>
      </section>
    </>
  );
}
