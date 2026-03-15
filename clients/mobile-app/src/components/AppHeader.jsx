import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useMobileApp } from '../context/MobileAppContext';
import { styles } from '../styles/appStyles';

const AppHeader = () => {
  const { token, setShowLogin } = useMobileApp();

  return (
    <View style={styles.header}>
      <Text style={styles.brand}>AutoManager</Text>
      <TouchableOpacity style={styles.ghostBtn} onPress={() => setShowLogin(true)}>
        <Text style={styles.ghostText}>{token ? 'Cài đặt' : 'Đăng nhập'}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AppHeader;
