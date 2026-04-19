import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMobileApp } from '../context/MobileAppContext';
import { styles } from '../styles/appStyles';
import { formatVnd } from '../utils/format';

const OrderModule = () => {
  const {
    orderType,
    setOrderType,
    selectedTableId,
    setShowTablePicker,
    availableTables,
    search,
    setSearch,
    loadingProducts,
    products,
    addToCart,
    cart,
    updateQty,
    total,
    setShowPayment,
    currentOrderId,
    clearCurrentOrder,
    tableNameMap,
    openOrders,
    loadingOrders,
    loadOrder,
    fetchOpenOrders
  } = useMobileApp();

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>POS Order</Text>
        <View style={styles.segmented}>
          {['DINE_IN', 'TAKE_AWAY'].map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.segment, orderType === type && styles.segmentActive]}
              onPress={() => setOrderType(type)}
            >
              <Text style={orderType === type ? styles.segmentTextActive : styles.segmentText}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {orderType === 'DINE_IN' && (
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Chọn bàn</Text>
              <TouchableOpacity style={styles.dropdownInput} onPress={() => setShowTablePicker(true)}>
                <Text style={styles.dropdownText}>{tableNameMap[selectedTableId] || 'Chưa chọn'}</Text>
                <Text style={styles.dropdownCaret}>▼</Text>
              </TouchableOpacity>
              {availableTables.length === 0 && (
                <Text style={styles.muted}>Chưa có bàn trống.</Text>
              )}
            </View>
          </View>
        )}
        <TextInput
          style={styles.input}
          placeholder="Tìm món..."
          value={search}
          onChangeText={setSearch}
        />
        {loadingProducts ? (
          <ActivityIndicator />
        ) : (
          <View style={styles.productList}>
            {products.map(product => (
              <TouchableOpacity
                key={product.id || product.name}
                style={styles.productCard}
                onPress={() => addToCart(product)}
              >
                <View>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>{formatVnd(product.price)}</Text>
                </View>
                <Text style={styles.addBtn}>+ Thêm</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Giỏ hàng</Text>
          {currentOrderId ? (
            <TouchableOpacity style={styles.modalCloseBtn} onPress={clearCurrentOrder}>
              <Text style={styles.modalCloseText}>X</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {currentOrderId ? (
          <Text style={styles.muted}>Đang sửa đơn: {currentOrderId}</Text>
        ) : null}
        {cart.length === 0 && <Text style={styles.muted}>Chưa có món trong giỏ.</Text>}
        {cart.map(item => (
          <View key={item.id} style={styles.cartRow}>
            <View>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.muted}>{formatVnd(item.price)}</Text>
            </View>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, -1)}>
                <Text>-</Text>
              </TouchableOpacity>
              <Text>{item.quantity}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.id, 1)}>
                <Text>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text>Tổng cộng</Text>
          <Text style={styles.totalValue}>{formatVnd(total)}</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowPayment(true)}>
          <Text style={styles.primaryText}>{currentOrderId ? 'Thanh toán đơn' : 'Thanh toán'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Đơn chờ thanh toán</Text>
          <TouchableOpacity style={styles.ghostBtn} onPress={fetchOpenOrders}>
            <Text style={styles.ghostText}>Làm mới</Text>
          </TouchableOpacity>
        </View>
        {loadingOrders ? (
          <ActivityIndicator />
        ) : openOrders.length === 0 ? (
          <Text style={styles.muted}>Chưa có đơn chờ thanh toán.</Text>
        ) : (
          openOrders.map(order => (
            <View key={order.id} style={styles.productCard}>
              <View>
                <Text style={styles.productName}>{tableNameMap[order.table_id] || order.table_id || 'Bàn chưa chọn'}</Text>
                <Text style={styles.productPrice}>Tổng: {formatVnd(order.total_amount || 0)}</Text>
              </View>
              <View style={styles.openOrderActions}>
                <TouchableOpacity style={styles.ghostBtnCompact} onPress={() => loadOrder(order.id)}>
                  <Text style={styles.ghostText}>Mở</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryBtnCompact}
                  onPress={() => {
                    loadOrder(order.id);
                    setShowPayment(true);
                  }}
                >
                  <Text style={styles.primaryText}>Thu</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </>
  );
};

export default OrderModule;
