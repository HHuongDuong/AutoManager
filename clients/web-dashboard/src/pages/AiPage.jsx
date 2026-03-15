import { useDashboardContext } from '../context/DashboardContext';

export default function AiPage() {
  const { state, actions } = useDashboardContext();

  return (
    <section className="grid">
      <div className="card">
        <div className="card-head">
          <h3>AI goi y nhap kho</h3>
          <button className="btn ghost" onClick={actions.handleSuggestAI}>Lay goi y</button>
        </div>
        <div className="list">
          {state.aiSuggest.map(item => (
            <div key={item.ingredient_id} className="list-item">
              <div>
                <h4>{item.ingredient_id}</h4>
                <p>Avg: {item.avg_daily} / Target: {item.target_stock}</p>
              </div>
              <strong>{item.reorder_qty} don vi</strong>
            </div>
          ))}
          {state.aiSuggest.length === 0 && <div className="empty">Chua co goi y AI.</div>}
        </div>
      </div>
      <div className="card">
        <h3>Goi y van hanh</h3>
        <ul className="tips">
          <li>Tang du tru nguyen lieu ban chay cuoi tuan.</li>
          <li>Khuyen nghi toi uu staffing theo gio cao diem.</li>
          <li>So sanh doanh thu theo chi nhanh de dieu chinh ton kho.</li>
        </ul>
      </div>
    </section>
  );
}
