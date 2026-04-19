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
    statusMessage,
    handleCreateOrder,
    handlePayOrder
  } = useMobileApp();

  return (
    <Modal visible={showPayment} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Thanh toán</Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowPayment(false)}>
              <Text style={styles.modalCloseText}>X</Text>
            </TouchableOpacity>
          </View>
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
          {!currentOrderId ? (
            <TouchableOpacity style={styles.checkboxRow} onPress={() => setPayNow(v => !v)}>
              <View style={[styles.checkboxBox, payNow && styles.checkboxBoxChecked]}>
                {payNow ? <Text style={styles.checkboxTick}>✓</Text> : null}
              </View>
              <Text style={styles.checkboxLabel}>Thanh toán ngay</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.segment}>
              <Text>Thanh toán đơn</Text>
            </View>
          )}
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={currentOrderId ? handlePayOrder : handleCreateOrder}
            >
              <Text style={styles.primaryText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
          {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
        </View>
      </View>
    </Modal>
  );
};

export default PaymentModal;
