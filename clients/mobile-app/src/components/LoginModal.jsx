import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMobileApp } from '../context/MobileAppContext';
import { styles } from '../styles/appStyles';

const LoginModal = () => {
  const {
    showLogin,
    setShowLogin,
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

  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (!token) setShowPasswordModal(false);
  }, [token]);

  return (
    <Modal visible={showLogin} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.cardTitle}>Cài đặt & Đăng nhập</Text>
          <Text style={styles.label}>Chi nhánh</Text>
          <TouchableOpacity
            style={styles.dropdownInput}
            onPress={() => setShowBranchPicker(true)}
            disabled={branches.length === 0}
          >
            <Text style={styles.dropdownText}>{branchNameMap[branchId] || 'Chưa chọn'}</Text>
            <Text style={styles.dropdownCaret}>▼</Text>
          </TouchableOpacity>
          {branches.length === 0 && (
            <Text style={styles.muted}>Chưa tải được danh sách chi nhánh.</Text>
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
              <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowPasswordModal(true)}>
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

      <Modal visible={showBranchPicker} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Chọn chi nhánh</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {branches.map(branch => (
                <TouchableOpacity
                  key={branch.id}
                  style={styles.productCard}
                  onPress={() => {
                    updateBranchId(branch.id);
                    setShowBranchPicker(false);
                  }}
                >
                  <View>
                    <Text style={styles.productName}>{branch.name || branch.code || branch.id}</Text>
                    <Text style={styles.productPrice}>{branch.address || branch.location || branch.id}</Text>
                  </View>
                  <Text style={styles.addBtn}>Chọn</Text>
                </TouchableOpacity>
              ))}
              {branches.length === 0 && (
                <Text style={styles.muted}>Chưa có dữ liệu chi nhánh.</Text>
              )}
            </ScrollView>
            <View style={styles.row}>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowBranchPicker(false)}>
                <Text style={styles.outlineText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {token && (
        <Modal visible={showPasswordModal} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.cardTitle}>Đổi mật khẩu</Text>
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
              <View style={styles.row}>
                <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowPasswordModal(false)}>
                  <Text style={styles.outlineText}>Đóng</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => {
                    handleChangePassword();
                    setShowPasswordModal(false);
                  }}
                >
                  <Text style={styles.primaryText}>Lưu</Text>
                </TouchableOpacity>
              </View>
              {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
};

export default LoginModal;
