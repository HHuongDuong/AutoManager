import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMobileApp } from '../context/MobileAppContext';
import { styles } from '../styles/appStyles';
import { formatVnd } from '../utils/format';

const IngredientPickerModal = ({
  visible,
  ingredients,
  selectedIngredientId,
  onClose,
  onSelect
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalBackdrop}>
      <View style={styles.modalSheet}>
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleBlock}>
            <Text style={styles.cardTitle}>Chọn nguyên liệu</Text>
            <Text style={styles.modalSubtitle}>Chọn nguyên liệu cần nhập kho từ danh sách đã tạo.</Text>
          </View>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseText}>X</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
          {ingredients.map((ingredient) => {
            const selected = ingredient.id === selectedIngredientId;
            const subtitleParts = [
              ingredient.unit ? `Đơn vị: ${ingredient.unit}` : null,
              ingredient.category_name || null,
              ingredient.on_hand != null ? `Tồn: ${ingredient.on_hand}` : null
            ].filter(Boolean);

            return (
              <TouchableOpacity
                key={ingredient.id}
                style={[styles.branchOptionCard, selected && styles.branchOptionCardSelected]}
                onPress={() => {
                  onSelect(ingredient.id);
                  onClose();
                }}
              >
                <View style={styles.branchOptionMeta}>
                  <Text style={styles.branchOptionTitle}>{ingredient.name || ingredient.id}</Text>
                  <Text style={styles.branchOptionSubtitle}>
                    {subtitleParts.join(' - ') || ingredient.id}
                  </Text>
                </View>
                <Text style={[styles.branchOptionBadge, selected && styles.branchOptionBadgeSelected]}>
                  {selected ? 'Đang chọn' : 'Chọn'}
                </Text>
              </TouchableOpacity>
            );
          })}

          {ingredients.length === 0 ? (
            <Text style={styles.muted}>Chưa có danh sách nguyên liệu.</Text>
          ) : null}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const InventoryModule = () => {
  const {
    inputForm,
    setInputForm,
    ingredients,
    inventoryInputs,
    handleCreateInput
  } = useMobileApp();

  const [showIngredientPicker, setShowIngredientPicker] = useState(false);

  const ingredientMap = useMemo(
    () => ingredients.reduce((acc, ingredient) => {
      acc[ingredient.id] = ingredient;
      return acc;
    }, {}),
    [ingredients]
  );

  const selectedIngredient = ingredientMap[inputForm.ingredient_id] || null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Nhập kho nguyên liệu</Text>

      <Text style={styles.label}>Nguyên liệu</Text>
      <TouchableOpacity
        style={styles.dropdownInput}
        onPress={() => setShowIngredientPicker(true)}
        disabled={ingredients.length === 0}
      >
        <Text style={styles.dropdownText}>
          {selectedIngredient?.name || 'Chọn nguyên liệu'}
        </Text>
        <Text style={styles.dropdownCaret}>v</Text>
      </TouchableOpacity>
      {selectedIngredient ? (
        <Text style={styles.muted}>
          {[selectedIngredient.unit ? `Đơn vị: ${selectedIngredient.unit}` : null, selectedIngredient.category_name || null]
            .filter(Boolean)
            .join(' - ')}
        </Text>
      ) : null}
      {ingredients.length === 0 ? (
        <Text style={styles.muted}>Chưa tải được danh sách nguyên liệu.</Text>
      ) : null}

      <Text style={styles.label}>Số lượng</Text>
      <TextInput
        style={styles.input}
        value={inputForm.quantity}
        onChangeText={(value) => setInputForm({ ...inputForm, quantity: value })}
        placeholder="Nhập số lượng"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Đơn giá</Text>
      <TextInput
        style={styles.input}
        value={inputForm.unit_cost}
        onChangeText={(value) => setInputForm({ ...inputForm, unit_cost: value })}
        placeholder="Nhập đơn giá"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Lý do</Text>
      <TextInput
        style={styles.input}
        value={inputForm.reason}
        onChangeText={(value) => setInputForm({ ...inputForm, reason: value })}
        placeholder="Ví dụ: nhập hàng đầu ngày"
      />

      <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateInput}>
        <Text style={styles.primaryText}>Tạo phiếu nhập</Text>
      </TouchableOpacity>

      {inventoryInputs.slice(0, 5).map((input) => {
        const ingredient = ingredientMap[input.ingredient_id];
        return (
          <View key={input.id} style={styles.cartRow}>
            <View style={styles.field}>
              <Text style={styles.productName}>{ingredient?.name || input.ingredient_id}</Text>
              <Text style={styles.muted}>
                {input.quantity}
                {ingredient?.unit ? ` ${ingredient.unit}` : ''}
                {' - '}
                {formatVnd(input.unit_cost || 0)}
              </Text>
            </View>
            <Text style={styles.totalValue}>{formatVnd(input.total_cost || 0)}</Text>
          </View>
        );
      })}

      {inventoryInputs.length === 0 ? (
        <Text style={styles.muted}>Chưa có phiếu nhập kho.</Text>
      ) : null}

      <IngredientPickerModal
        visible={showIngredientPicker}
        ingredients={ingredients}
        selectedIngredientId={inputForm.ingredient_id}
        onClose={() => setShowIngredientPicker(false)}
        onSelect={(ingredientId) => setInputForm({ ...inputForm, ingredient_id: ingredientId })}
      />
    </View>
  );
};

export default InventoryModule;
