import React from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMobileApp } from '../context/MobileAppContext';
import { styles } from '../styles/appStyles';
import { formatVnd } from '../utils/format';

const PaymentModal = () => {
  const {
    showPayment,
    setShowPayment,
    currentOrderId,
    total,
    cashReceived,
    setCashReceived,
    changeDue,
    payNow,
    setPayNow,
    handleCreateOrder,
    handlePayOrder
  } = useMobileApp();

  return (
    <Modal visible={showPayment} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.cardTitle}>Thanh toán</Text>
          {currentOrderId ? (
            <Text style={styles.muted}>Đơn: {currentOrderId}</Text>
          ) : null}
          <Text style={styles.muted}>Tổng: {formatVnd(total)}</Text>
          <TextInput
            style={styles.input}
            value={cashReceived}
            onChangeText={setCashReceived}
            placeholder="Khách đưa"
            keyboardType="numeric"
          />
          <Text style={styles.muted}>Tiền thối: {formatVnd(changeDue)}</Text>
          <View style={styles.row}>
            {!currentOrderId ? (
              <TouchableOpacity style={styles.segment} onPress={() => setPayNow(v => !v)}>
                <Text>{payNow ? 'Thanh toán ngay' : 'Thanh toán sau'}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.segment}>
                <Text>Thanh toán đơn</Text>
              </View>
            )}
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowPayment(false)}>
              <Text style={styles.outlineText}>Đóng</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={currentOrderId ? handlePayOrder : handleCreateOrder}
          >
            <Text style={styles.primaryText}>Xác nhận</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default PaymentModal;
