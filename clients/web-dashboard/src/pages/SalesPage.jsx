import OrdersTable from '../components/OrdersTable';
import { useDashboardContext } from '../context/DashboardContext';

export default function SalesPage() {
  const { state } = useDashboardContext();

  return (
    <section className="grid single">
      <div className="card">
        <div className="card-head">
          <h3>Danh sach don hang</h3>
          <span>{state.orders.length} don</span>
        </div>
        <OrdersTable orders={state.orders} />
      </div>
    </section>
  );
}
