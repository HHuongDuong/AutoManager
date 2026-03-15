import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useMobileApp } from '../context/MobileAppContext';
import { styles } from '../styles/appStyles';

const TablePickerModal = () => {
  const {
    showTablePicker,
    setShowTablePicker,
    availableTables,
    setSelectedTableId
  } = useMobileApp();

  return (
    <Modal visible={showTablePicker} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.cardTitle}>Chọn bàn</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {availableTables.map(table => (
              <TouchableOpacity
                key={table.id}
                style={styles.productCard}
                onPress={() => {
                  setSelectedTableId(table.id);
                  setShowTablePicker(false);
                }}
              >
                <View>
                  <Text style={styles.productName}>{table.name}</Text>
                  <Text style={styles.productPrice}>{table.status}</Text>
                </View>
                <Text style={styles.addBtn}>Chọn</Text>
              </TouchableOpacity>
            ))}
            {availableTables.length === 0 && (
              <Text style={styles.muted}>Chưa có bàn trống.</Text>
            )}
          </ScrollView>
          <View style={styles.row}>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowTablePicker(false)}>
              <Text style={styles.outlineText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default TablePickerModal;
