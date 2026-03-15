import { NavLink } from 'react-router-dom';

export default function Sidebar({ items, branchName, onOpenSettings }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <h2>AutoManager</h2>
        <p>Web Dashboard</p>
      </div>
      <nav>
        {items.map(item => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div>
          <span>Chi nhánh</span>
          <strong>{branchName || 'Chưa chọn'}</strong>
        </div>
        <button className="btn ghost" onClick={onOpenSettings}>Cài đặt</button>
      </div>
    </aside>
  );
}
