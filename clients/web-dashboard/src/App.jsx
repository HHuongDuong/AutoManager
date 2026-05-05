import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LoginModal from './components/LoginModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import StatusToast from './components/StatusToast';
import DashboardPage from './pages/DashboardPage';
import SalesPage from './pages/SalesPage';
import MenuPage from './pages/MenuPage';
import InventoryPage from './pages/InventoryPage';
import EmployeePage from './pages/EmployeePage';
import BranchPage from './pages/BranchPage';
import RbacPage from './pages/RbacPage';
import ReportPage from './pages/ReportPage';
import AiPage from './pages/AiPage';
import { useDashboardContext } from './context/useDashboardContext';

const navItems = [
  { id: 'overview', label: 'Tổng quan', path: '/' },
  { id: 'sales', label: 'Bán hàng', path: '/sales' },
  { id: 'menu', label: 'Thực đơn', path: '/menu' },
  { id: 'inventory', label: 'Kho', path: '/inventory' },
  { id: 'hr', label: 'Nhân sự', path: '/employees' },
  { id: 'branches', label: 'Chi nhánh', path: '/branches' },
  { id: 'rbac', label: 'Phân quyền', path: '/rbac' },
  { id: 'reports', label: 'Báo cáo', path: '/reports' },
  { id: 'ai', label: 'AI gợi ý', path: '/ai' }
];


export default function App() {
  const { state, actions, derived } = useDashboardContext();

  return (
    <div className="dashboard-root">
      <Sidebar
        items={navItems}
        branchName={derived.branchNameMap.get(state.branchId)}
        onOpenSettings={() => actions.setShowLogin(true)}
      />
      <main className="content">
        <Topbar onOpenSettings={() => actions.setShowLogin(true)} token={state.token} />
        {state.token ? (
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/employees" element={<EmployeePage />} />
            <Route path="/branches" element={<BranchPage />} />
            <Route path="/rbac" element={<RbacPage />} />
            <Route path="/reports" element={<ReportPage />} />
            <Route path="/ai" element={<AiPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : (
          <section className="grid single">
            <div className="card">
              <h3>Vui long dang nhap</h3>
              <p>Ban can dang nhap de truy cap noi dung he thong.</p>
              <button className="btn primary" onClick={() => actions.setShowLogin(true)}>Dang nhap</button>
            </div>
          </section>
        )}
        <StatusToast message={state.statusMessage} />
      </main>

      <LoginModal
        show={state.showLogin}
        token={state.token}
        branches={state.branches}
        branchId={state.branchId}
        loginForm={state.loginForm}
        statusMessage={state.statusMessage}
        onClose={() => actions.setShowLogin(false)}
        onBranchChange={actions.setBranchIdAndPersist}
        onLoginFormChange={actions.setLoginForm}
        onLogout={actions.handleLogout}
        onOpenChangePassword={() => actions.setShowChangePassword(true)}
        onLogin={actions.handleLogin}
      />

      <ChangePasswordModal
        show={state.showChangePassword}
        passwordForm={state.passwordForm}
        statusMessage={state.statusMessage}
        onClose={() => actions.setShowChangePassword(false)}
        onPasswordFormChange={actions.setPasswordForm}
        onSubmit={actions.handleChangePassword}
      />
    </div>
  );
}
