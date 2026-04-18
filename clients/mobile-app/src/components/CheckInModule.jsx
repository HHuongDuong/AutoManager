import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMobileApp } from '../context/MobileAppContext';
import { styles } from '../styles/appStyles';

const CheckInModule = () => {
  const {
    apiBase,
    updateApiBase,
    branchId,
    branches,
    branchNameMap,
    updateBranchId,
    employeeId,
    updateEmployeeId,
    handleCheckIn,
    handleCheckOut,
    orderQueue,
    processQueue,
    wsStatus
  } = useMobileApp();

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Thiết lập nhanh</Text>
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>API Base</Text>
          <TextInput
            style={styles.input}
            value={apiBase}
            onChangeText={updateApiBase}
            placeholder="http://localhost:3000"
          />
        </View>
        <View style={styles.field}>
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
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>Employee ID</Text>
          <TextInput
            style={styles.input}
            value={employeeId}
            onChangeText={updateEmployeeId}
            placeholder="employee_id"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Ca làm</Text>
          <Text style={styles.muted}>Tự động theo giờ hiện tại</Text>
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
            Đồng bộ ({orderQueue.filter(i => i.status !== 'synced').length})
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.muted}>Realtime: {wsStatus}</Text>
    </View>
  );
};

export default CheckInModule;
