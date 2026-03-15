import React from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMobileApp } from '../context/MobileAppContext';
import { styles } from '../styles/appStyles';

const LoginModal = () => {
  const {
    showLogin,
    setShowLogin,
    apiBase,
    updateApiBase,
    branchId,
    branchNameMap,
    branches,
    updateBranchId,
    loginForm,
    setLoginForm,
    passwordForm,
    setPasswordForm,
    token,
    handleLogin,
    handleLogout,
    handleChangePassword,
    statusMessage
  } = useMobileApp();

  return (
    <Modal visible={showLogin} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.cardTitle}>Cài đặt & Đăng nhập</Text>
          <TextInput
            style={styles.input}
            value={apiBase}
            onChangeText={updateApiBase}
            placeholder="API Base"
          />
          <Text style={styles.label}>Chi nhánh</Text>
          <Text style={styles.muted}>{branchNameMap[branchId] || branchId || 'Chưa chọn'}</Text>
          {branches.length > 0 ? (
            <View style={styles.productList}>
              {branches.map(branch => (
                <TouchableOpacity
                  key={branch.id}
                  style={styles.productCard}
                  onPress={() => updateBranchId(branch.id)}
                >
                  <View>
                    <Text style={styles.productName}>{branch.name || branch.code || branch.id}</Text>
                    <Text style={styles.productPrice}>{branch.address || branch.location || branch.id}</Text>
                  </View>
                  <Text style={styles.addBtn}>Chọn</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TextInput
              style={styles.input}
              value={branchId}
              onChangeText={updateBranchId}
              placeholder="branch_id"
            />
          )}
          <TextInput
            style={styles.input}
            value={loginForm.username}
            onChangeText={(value) => setLoginForm({ ...loginForm, username: value })}
            placeholder="Username"
          />
          <TextInput
            style={styles.input}
            value={loginForm.password}
            onChangeText={(value) => setLoginForm({ ...loginForm, password: value })}
            placeholder="Password"
            secureTextEntry
          />
          {token && (
            <>
              <TextInput
                style={styles.input}
                value={passwordForm.old_password}
                onChangeText={(value) => setPasswordForm({ ...passwordForm, old_password: value })}
                placeholder="Mật khẩu cũ"
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                value={passwordForm.new_password}
                onChangeText={(value) => setPasswordForm({ ...passwordForm, new_password: value })}
                placeholder="Mật khẩu mới"
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                value={passwordForm.confirm_password}
                onChangeText={(value) => setPasswordForm({ ...passwordForm, confirm_password: value })}
                placeholder="Xác nhận mật khẩu mới"
                secureTextEntry
              />
            </>
          )}
          <View style={styles.row}>
            {token && (
              <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowLogin(false)}>
                <Text style={styles.outlineText}>Đóng</Text>
              </TouchableOpacity>
            )}
            {token && (
              <TouchableOpacity style={styles.outlineBtn} onPress={handleLogout}>
                <Text style={styles.outlineText}>Đăng xuất</Text>
              </TouchableOpacity>
            )}
            {token && (
              <TouchableOpacity style={styles.outlineBtn} onPress={handleChangePassword}>
                <Text style={styles.outlineText}>Đổi mật khẩu</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
              <Text style={styles.primaryText}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
          {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
        </View>
      </View>
    </Modal>
  );
};

export default LoginModal;
