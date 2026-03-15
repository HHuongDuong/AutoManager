import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMobileApp } from '../context/MobileAppContext';
import { styles } from '../styles/appStyles';
import { formatVnd } from '../utils/format';

const InventoryModule = () => {
  const {
    inputForm,
    setInputForm,
    ingredients,
    inventoryInputs,
    handleCreateInput
  } = useMobileApp();

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Nhập kho nguyên liệu</Text>
      <Text style={styles.label}>Ingredient ID</Text>
      <TextInput
        style={styles.input}
        value={inputForm.ingredient_id}
        onChangeText={(value) => setInputForm({ ...inputForm, ingredient_id: value })}
        placeholder="ingredient_id"
      />
      {ingredients.length > 0 && (
        <Text style={styles.muted}>Gợi ý: {ingredients.slice(0, 3).map(i => i.name).join(', ')}</Text>
      )}
      <Text style={styles.label}>Số lượng</Text>
      <TextInput
        style={styles.input}
        value={inputForm.quantity}
        onChangeText={(value) => setInputForm({ ...inputForm, quantity: value })}
        placeholder="quantity"
        keyboardType="numeric"
      />
      <Text style={styles.label}>Đơn giá</Text>
      <TextInput
        style={styles.input}
        value={inputForm.unit_cost}
        onChangeText={(value) => setInputForm({ ...inputForm, unit_cost: value })}
        placeholder="unit_cost"
        keyboardType="numeric"
      />
      <Text style={styles.label}>Lý do</Text>
      <TextInput
        style={styles.input}
        value={inputForm.reason}
        onChangeText={(value) => setInputForm({ ...inputForm, reason: value })}
        placeholder="reason"
      />
      <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateInput}>
        <Text style={styles.primaryText}>Tạo phiếu nhập</Text>
      </TouchableOpacity>
      {inventoryInputs.slice(0, 5).map(input => (
        <View key={input.id} style={styles.cartRow}>
          <View>
            <Text style={styles.productName}>{input.ingredient_id}</Text>
            <Text style={styles.muted}>{input.quantity} • {formatVnd(input.unit_cost || 0)}</Text>
          </View>
          <Text style={styles.totalValue}>{formatVnd(input.total_cost || 0)}</Text>
        </View>
      ))}
      {inventoryInputs.length === 0 && <Text style={styles.muted}>Chưa có phiếu nhập kho.</Text>}
    </View>
  );
};

export default InventoryModule;
