import { useDashboardContext } from '../context/useDashboardContext';

export default function AiPage() {
  const { state, actions } = useDashboardContext();

  return (
    <section className="grid">
      <div className="card">
        <div className="card-head">
          <h3>AI dự báo đơn hàng theo ngày</h3>
          <button className="btn ghost" onClick={actions.handleForecastAI}>Lấy gợi ý</button>
        </div>
        <div className="list">
          {state.aiForecast.map((value, idx) => (
            <div key={`forecast-${idx + 1}`} className="list-item">
              <div>
                <h4>Dự báo ngày +{idx + 1}</h4>
                <p>Method: {state.aiForecastMeta.method} / Window: {state.aiForecastMeta.window}</p>
              </div>
              <strong>{value} đơn</strong>
            </div>
          ))}
          {state.aiForecast.length === 0 && <div className="empty">Chưa có dự báo theo ngày.</div>}
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <h3>Gợi ý nhập kho ngày mai</h3>
          <button className="btn ghost" onClick={actions.handleInventoryAiReorder}>Lấy gợi ý</button>
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
          {state.aiInventorySuggest.length === 0 && <div className="empty">Chưa có gợi ý nhập kho.</div>}
        </div>
      </div>
    </section>
  );
}
