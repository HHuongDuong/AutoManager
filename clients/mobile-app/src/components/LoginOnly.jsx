import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useMobileApp } from '../context/MobileAppContext';
import { styles } from '../styles/appStyles';

const LoginOnly = () => {
  const { setShowLogin } = useMobileApp();

  return (
    <View style={styles.loginOnly}>
      <Text style={styles.cardTitle}>Vui lòng đăng nhập</Text>
      <Text style={styles.muted}>Bạn cần đăng nhập để sử dụng ứng dụng.</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowLogin(true)}>
        <Text style={styles.primaryText}>Đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );
};

export default LoginOnly;
