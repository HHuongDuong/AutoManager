import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useMobileApp } from '../context/MobileAppContext';
import { styles } from '../styles/appStyles';

const tabs = [
  { key: 'checkin', label: 'Check-in/out' },
  { key: 'order', label: 'Bán hàng' },
  { key: 'inventory', label: 'Nhập kho' }
];

const ModuleTabs = () => {
  const { activeModule, setActiveModule } = useMobileApp();

  return (
    <View style={styles.moduleTabs}>
      {tabs.map(item => (
        <TouchableOpacity
          key={item.key}
          style={[styles.moduleTab, activeModule === item.key && styles.moduleTabActive]}
          onPress={() => setActiveModule(item.key)}
        >
          <Text style={activeModule === item.key ? styles.moduleTabTextActive : styles.moduleTabText}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default ModuleTabs;
