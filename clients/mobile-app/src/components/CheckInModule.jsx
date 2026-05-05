import React, { useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useMobileApp } from '../context/MobileAppContext';
import { styles } from '../styles/appStyles';

const CheckInModule = () => {
  const {
    branchId,
    branches,
    branchNameMap,
    updateBranchId,
    employeeId,
    employeeProfile,
    handleCheckIn,
    handleCheckOut,
    orderQueue,
    processQueue,
    wsStatus
  } = useMobileApp();

  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const wsStatusLabel = {
    connected: 'Đã kết nối',
    connecting: 'Đang kết nối',
    disconnected: 'Mất kết nối',
    error: 'Lỗi kết nối'
  }[wsStatus] || wsStatus;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Chấm công</Text>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>Chi nhánh chấm công</Text>
          <TouchableOpacity
            style={styles.dropdownInput}
            onPress={() => setShowBranchPicker(true)}
            disabled={branches.length === 0}
          >
            <Text style={styles.dropdownText}>{branchNameMap[branchId] || 'Chưa chọn'}</Text>
            <Text style={styles.dropdownCaret}>v</Text>
          </TouchableOpacity>
          {branches.length === 0 ? (
            <Text style={styles.muted}>Chưa tải được danh sách chi nhánh.</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>Employee ID</Text>
          <Text style={styles.muted}>{employeeId || 'Chưa xác định'}</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Nhân viên</Text>
          <Text style={styles.muted}>{employeeProfile?.full_name || 'Chưa có hồ sơ'}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>Ca làm</Text>
          <Text style={styles.muted}>Tự động chọn theo giờ hiện tại</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Realtime</Text>
          <Text style={styles.muted}>{wsStatusLabel}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleCheckIn}>
          <Text style={styles.primaryText}>Check-in</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.outlineBtn} onPress={handleCheckOut}>
          <Text style={styles.outlineText}>Check-out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.outlineBtn} onPress={processQueue}>
          <Text style={styles.outlineText}>
            Đồng bộ ({orderQueue.filter(item => item.status !== 'synced').length})
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showBranchPicker} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Chọn chi nhánh chấm công</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {branches.map((branch) => (
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
              {branches.length === 0 ? (
                <Text style={styles.muted}>Chưa có dữ liệu chi nhánh.</Text>
              ) : null}
            </ScrollView>
            <View style={styles.row}>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowBranchPicker(false)}>
                <Text style={styles.outlineText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CheckInModule;
