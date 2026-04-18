import { useDashboardContext } from '../context/DashboardContext';

export default function AiPage() {
  const { state, actions } = useDashboardContext();

  return (
    <section className="grid">
      <div className="card">
        <div className="card-head">
          <h3>AI du bao don hang theo ngay</h3>
          <button className="btn ghost" onClick={actions.handleForecastAI}>Lay goi y</button>
        </div>
        <div className="list">
          {state.aiForecast.map((value, idx) => (
            <div key={`forecast-${idx + 1}`} className="list-item">
              <div>
                <h4>Du bao ngay +{idx + 1}</h4>
                <p>Method: {state.aiForecastMeta.method} / Window: {state.aiForecastMeta.window}</p>
              </div>
              <strong>{value} don</strong>
            </div>
          ))}
          {state.aiForecast.length === 0 && <div className="empty">Chua co du bao theo ngay.</div>}
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <h3>Goi y nhap kho ngay mai</h3>
          <button className="btn ghost" onClick={actions.handleInventoryAiReorder}>Lay goi y</button>
        </div>
        <div className="list">
          {state.aiInventorySuggest.map((item) => (
            <div key={item.ingredient_id} className="list-item">
              <div>
                <h4>{item.name || item.ingredient_id}</h4>
                <p>Ton: {item.on_hand} / TB ngay: {item.avg_daily}</p>
                {item.reason ? <p>{item.reason}</p> : null}
              </div>
              <strong>{item.reorder_qty} {item.unit || ''}</strong>
            </div>
          ))}
          {state.aiInventorySuggest.length === 0 && <div className="empty">Chua co goi y nhap kho.</div>}
        </div>
      </div>
    </section>
  );
}
