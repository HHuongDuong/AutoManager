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
    bluetoothConnected,
    bluetoothDevices,
    scanBluetooth,
    disconnectBluetooth,
    printerTarget,
    updatePrinterTarget,
    connectBluetooth,
    printReceipt,
    cart,
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
          <Text style={styles.label}>Máy in Bluetooth</Text>
          <Text style={styles.muted}>Trạng thái: {bluetoothConnected ? 'Đã kết nối' : 'Chưa kết nối'}</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.outlineBtn} onPress={scanBluetooth}>
              <Text style={styles.outlineText}>Quét thiết bị</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn} onPress={disconnectBluetooth}>
              <Text style={styles.outlineText}>Ngắt kết nối</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>Địa chỉ máy in Bluetooth</Text>
          <TextInput
            style={styles.input}
            value={printerTarget}
            onChangeText={updatePrinterTarget}
            placeholder="00:11:22:33:44:55"
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={() => connectBluetooth(printerTarget)}>
            <Text style={styles.primaryText}>Kết nối</Text>
          </TouchableOpacity>
        </View>
      </View>
      {bluetoothDevices.length > 0 && (
        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>Thiết bị đã ghép đôi</Text>
            <View style={styles.productList}>
              {bluetoothDevices.map(device => (
                <TouchableOpacity
                  key={device.address}
                  style={styles.productCard}
                  onPress={() => {
                    updatePrinterTarget(device.address);
                    connectBluetooth(device.address);
                  }}
                >
                  <View>
                    <Text style={styles.productName}>{device.name || 'Bluetooth Printer'}</Text>
                    <Text style={styles.productPrice}>{device.address}</Text>
                  </View>
                  <Text style={styles.addBtn}>Kết nối</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={() => printReceipt(null, cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            subtotal: item.price * item.quantity
          })))}
        >
          <Text style={styles.outlineText}>In thử</Text>
        </TouchableOpacity>
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
