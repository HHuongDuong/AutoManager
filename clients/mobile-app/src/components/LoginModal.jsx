import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMobileApp } from '../context/MobileAppContext';
import { styles } from '../styles/appStyles';

const BranchPickerModal = ({
  visible,
  branches,
  branchId,
  onClose,
  onSelect
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalBackdrop}>
      <View style={styles.modalSheet}>
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleBlock}>
            <Text style={styles.cardTitle}>Chọn chi nhánh</Text>
            <Text style={styles.modalSubtitle}>Chi nhánh này được áp dụng cho chấm công, bán hàng và nhập kho.</Text>
          </View>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseText}>X</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
          {branches.map((branch) => {
            const selected = branch.id === branchId;
            return (
              <TouchableOpacity
                key={branch.id}
                style={[styles.branchOptionCard, selected && styles.branchOptionCardSelected]}
                onPress={() => {
                  onSelect(branch.id);
                  onClose();
                }}
              >
                <View style={styles.branchOptionMeta}>
                  <Text style={styles.branchOptionTitle}>{branch.name || branch.code || branch.id}</Text>
                  <Text style={styles.branchOptionSubtitle}>{branch.address || branch.location || branch.id}</Text>
                </View>
                <Text style={[styles.branchOptionBadge, selected && styles.branchOptionBadgeSelected]}>
                  {selected ? 'Đang chọn' : 'Chọn'}
                </Text>
              </TouchableOpacity>
            );
          })}
          {branches.length === 0 ? (
            <Text style={styles.muted}>Chưa có dữ liệu chi nhánh.</Text>
          ) : null}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const PasswordModal = ({
  visible,
  passwordForm,
  setPasswordForm,
  statusMessage,
  onClose,
  onSave
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalBackdrop}>
      <View style={styles.modalSheet}>
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleBlock}>
            <Text style={styles.cardTitle}>Đổi mật khẩu</Text>
            <Text style={styles.modalSubtitle}>Nhập đầy đủ thông tin để cập nhật mật khẩu đăng nhập.</Text>
          </View>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseText}>X</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.label}>Mật khẩu cũ</Text>
          <TextInput
            style={styles.input}
            value={passwordForm.old_password}
            onChangeText={(value) => setPasswordForm({ ...passwordForm, old_password: value })}
            placeholder="Nhập mật khẩu cũ"
            secureTextEntry
          />
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.label}>Mật khẩu mới</Text>
          <TextInput
            style={styles.input}
            value={passwordForm.new_password}
            onChangeText={(value) => setPasswordForm({ ...passwordForm, new_password: value })}
            placeholder="Nhập mật khẩu mới"
            secureTextEntry
          />
        </View>

        <View style={styles.modalSection}>
          <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
          <TextInput
            style={styles.input}
            value={passwordForm.confirm_password}
            onChangeText={(value) => setPasswordForm({ ...passwordForm, confirm_password: value })}
            placeholder="Nhập lại mật khẩu mới"
            secureTextEntry
          />
        </View>

        {statusMessage ? <Text style={styles.modalStatus}>{statusMessage}</Text> : null}

        <View style={styles.modalActionRow}>
          <TouchableOpacity style={styles.outlineBtn} onPress={onClose}>
            <Text style={styles.outlineText}>Đóng</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onSave}
          >
            <Text style={styles.primaryText}>Lưu</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

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
        <View style={styles.modalSheet}>
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleBlock}>
              <Text style={styles.cardTitle}>{token ? 'Cài đặt tài khoản' : 'Đăng nhập AutoManager'}</Text>
              <Text style={styles.modalSubtitle}>
                {token
                  ? 'Cập nhật chi nhánh thao tác và thông tin truy cập tài khoản.'
                  : 'Đăng nhập để sử dụng chấm công, bán hàng và nhập kho trên mobile.'}
              </Text>
            </View>
            {token ? (
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowLogin(false)}>
                <Text style={styles.modalCloseText}>X</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalInfoCard}>
              <Text style={styles.modalInfoTitle}>Chi nhánh đang chọn</Text>
              <Text style={styles.modalInfoValue}>{branchNameMap[branchId] || 'Chưa chọn chi nhánh'}</Text>
              <TouchableOpacity
                style={styles.dropdownInput}
                onPress={() => setShowBranchPicker(true)}
                disabled={branches.length === 0}
              >
                <Text style={styles.dropdownText}>{branchNameMap[branchId] || 'Chọn chi nhánh'}</Text>
                <Text style={styles.dropdownCaret}>v</Text>
              </TouchableOpacity>
              {branches.length === 0 ? (
                <Text style={styles.muted}>Chưa tải được danh sách chi nhánh.</Text>
              ) : null}
            </View>

            {!token ? (
              <>
                <View style={styles.modalSection}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput
                    style={styles.input}
                    value={loginForm.username}
                    onChangeText={(value) => setLoginForm({ ...loginForm, username: value })}
                    placeholder="Nhập username"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    style={styles.input}
                    value={loginForm.password}
                    onChangeText={(value) => setLoginForm({ ...loginForm, password: value })}
                    placeholder="Nhập password"
                    secureTextEntry
                  />
                </View>
              </>
            ) : (
              <View style={styles.modalInfoCard}>
                <Text style={styles.modalInfoTitle}>Trạng thái tài khoản</Text>
                <Text style={styles.modalInfoValue}>Đã đăng nhập</Text>
                <Text style={styles.modalNote}>Bạn có thể đổi chi nhánh, đổi mật khẩu hoặc đăng xuất tại đây.</Text>
              </View>
            )}

            {statusMessage ? <Text style={styles.modalStatus}>{statusMessage}</Text> : null}

            <View style={styles.modalActionsStack}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={token ? () => setShowLogin(false) : handleLogin}
              >
                <Text style={styles.primaryText}>{token ? 'Lưu và đóng' : 'Đăng nhập'}</Text>
              </TouchableOpacity>

              {token ? (
                <View style={styles.modalActionRow}>
                  <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowPasswordModal(true)}>
                    <Text style={styles.outlineText}>Đổi mật khẩu</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.outlineBtn} onPress={handleLogout}>
                    <Text style={styles.outlineText}>Đăng xuất</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </View>

      <BranchPickerModal
        visible={showBranchPicker}
        branches={branches}
        branchId={branchId}
        onClose={() => setShowBranchPicker(false)}
        onSelect={updateBranchId}
      />

      {token ? (
        <PasswordModal
          visible={showPasswordModal}
          passwordForm={passwordForm}
          setPasswordForm={setPasswordForm}
          statusMessage={statusMessage}
          onClose={() => setShowPasswordModal(false)}
          onSave={handleChangePassword}
        />
      ) : null}
    </Modal>
  );
};

export default LoginModal;
