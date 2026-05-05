import { usePosContext } from './context/PosContext';
import PosTopbar from './components/PosTopbar';
import MenuPanel from './components/MenuPanel';
import CartPanel from './components/CartPanel';
import PaymentModal from './components/PaymentModal';
import InputModal from './components/InputModal';
import LoginModal from './components/LoginModal';
import ChangePasswordModal from './components/ChangePasswordModal';

const formatVnd = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

export default function App() {
  const { state, actions, derived } = usePosContext();
  const branchName = derived.branchNameMap[state.branchId] || state.branchId || 'Chua chon';
  const userName = state.user?.employee?.full_name || state.user?.user_id || '---';

  const handleOrderTypeChange = (value) => {
    actions.setOrderType(value);
    actions.persistSettings();
  };

  const handleCategoryChange = (value) => {
    actions.setCategoryId(value);
    actions.persistSettings();
  };

  const handleBranchChange = (value) => {
    actions.setBranchId(value);
    actions.persistSettings();
  };


  return (
    <div className="pos-root">
      {state.token ? (
        <>
          <PosTopbar
            branchName={branchName}
            userName={userName}
            onOpenSettings={() => actions.setShowLogin(true)}
          />
          <main className="layout">
            <MenuPanel
              apiBase={state.apiBase}
              search={state.search}
              onSearchChange={actions.setSearch}
              onClearSearch={() => actions.setSearch('')}
              categories={state.categories}
              categoryId={state.categoryId}
              onSelectCategory={handleCategoryChange}
              products={state.products}
              loading={state.loadingProducts}
              onAddToCart={actions.addToCart}
              formatVnd={formatVnd}
            />
            <CartPanel
              orderType={state.orderType}
              onOrderTypeChange={handleOrderTypeChange}
              selectedTableId={state.selectedTableId}
              tables={state.tables}
              onSelectTable={actions.setSelectedTableId}
              currentOrderId={state.currentOrderId}
              cart={state.cart}
              onUpdateQty={actions.updateQty}
              onRemoveItem={actions.removeItem}
              formatVnd={formatVnd}
              total={derived.total}
              onClearOrder={actions.clearOrder}
              onSyncQueue={actions.processQueue}
              queuePendingCount={derived.queuePendingCount}
              onShowInputModal={() => actions.setShowInputModal(true)}
              onShowPayment={() => actions.setShowPayment(true)}
              statusMessage={state.statusMessage}
              openOrders={state.openOrders}
              loadingOrders={state.loadingOrders}
              onLoadOrder={actions.loadOrder}
              onCancelOrder={actions.handleCancelOrder}
              isOnline={state.isOnline}
              wsStatus={state.wsStatus}
              tableNameMap={derived.tableNameMap}
            />
          </main>

          <PaymentModal
            show={state.showPayment}
            total={derived.total}
            cashReceived={state.cashReceived}
            changeDue={derived.changeDue}
            paymentMethod={state.paymentMethod}
            onCashReceivedChange={actions.setCashReceived}
            onPaymentMethodChange={actions.setPaymentMethod}
            payNow={state.payNow}
            onTogglePayNow={() => actions.setPayNow((value) => !value)}
            onClose={() => actions.setShowPayment(false)}
            onConfirm={actions.handleCreateOrder}
            formatVnd={formatVnd}
          />

          <InputModal
            show={state.showInputModal}
            inputForm={state.inputForm}
            ingredients={state.ingredients}
            inventoryInputs={state.inventoryInputs}
            onInputChange={actions.setInputForm}
            onClose={() => actions.setShowInputModal(false)}
            onCreateInput={actions.handleCreateInput}
            formatVnd={formatVnd}
          />
        </>
      ) : (
        <main className="layout">
          <section className="summary">
            <div className="card">
              <h3>Vui long dang nhap</h3>
              <p>Ban can dang nhap de thao tac ban hang.</p>
              <button className="btn primary" onClick={() => actions.setShowLogin(true)}>Dang nhap</button>
            </div>
          </section>
        </main>
      )}

      <LoginModal
        show={state.showLogin}
        token={state.token}
        branches={state.branches}
        branchId={state.branchId}
        loginForm={state.loginForm}
        onClose={() => actions.setShowLogin(false)}
        onBranchChange={handleBranchChange}
        onLoginFormChange={actions.setLoginForm}
        onLogout={actions.handleLogout}
        onOpenChangePassword={() => actions.setShowChangePassword(true)}
        onLogin={actions.handleLogin}
        onPersistSettings={actions.persistSettings}
      />

      <ChangePasswordModal
        show={state.showChangePassword}
        passwordForm={state.passwordForm}
        onPasswordFormChange={actions.setPasswordForm}
        onClose={() => actions.setShowChangePassword(false)}
        onSubmit={() => {
          actions.handleChangePassword();
          actions.setShowChangePassword(false);
        }}
      />
    </div>
  );
}
