import React from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';
import { useMobileApp } from './src/context/MobileAppContext';
import { styles } from './src/styles/appStyles';
import AppHeader from './src/components/AppHeader';
import CheckInModule from './src/components/CheckInModule';
import InventoryModule from './src/components/InventoryModule';
import LoginModal from './src/components/LoginModal';
import LoginOnly from './src/components/LoginOnly';
import ModuleTabs from './src/components/ModuleTabs';
import OrderModule from './src/components/OrderModule';
import PaymentModal from './src/components/PaymentModal';
import TablePickerModal from './src/components/TablePickerModal';

export default function App() {
  const { token, statusMessage, activeModule } = useMobileApp();

  return (
    <SafeAreaView style={styles.container}>
      {token ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <AppHeader />
          <ModuleTabs />
          {activeModule === 'checkin' && <CheckInModule />}
          {activeModule === 'order' && <OrderModule />}
          {activeModule === 'inventory' && <InventoryModule />}
          {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
        </ScrollView>
      ) : (
        <LoginOnly />
      )}

      <PaymentModal />
      <TablePickerModal />
      <LoginModal />
    </SafeAreaView>
  );
}
