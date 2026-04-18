import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f7'
  },
  loginOnly: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12
  },
  scroll: {
    padding: 20,
    gap: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  brand: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2124'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e1e3e5'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2124'
  },
  label: {
    fontSize: 12,
    color: '#6d7175'
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#1f2124',
    borderWidth: 1,
    borderColor: '#e1e3e5'
  },
  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e1e3e5'
  },
  dropdownText: {
    color: '#1f2124'
  },
  dropdownCaret: {
    color: '#6d7175'
  },
  row: {
    flexDirection: 'row',
    gap: 12
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  field: {
    flex: 1,
    gap: 6
  },
  primaryBtn: {
    backgroundColor: '#005bd3',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1
  },
  primaryBtnSmall: {
    backgroundColor: '#005bd3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center'
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '700'
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#e1e3e5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1
  },
  outlineText: {
    color: '#1f2124'
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: '#e1e3e5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999
  },
  ghostText: {
    color: '#1f2124'
  },
  moduleTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap'
  },
  moduleTab: {
    borderWidth: 1,
    borderColor: '#e1e3e5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff'
  },
  moduleTabActive: {
    backgroundColor: '#005bd3',
    borderColor: '#0047aa'
  },
  moduleTabText: {
    color: '#1f2124',
    fontSize: 12,
    fontWeight: '600'
  },
  moduleTabTextActive: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  segmented: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  segment: {
    borderWidth: 1,
    borderColor: '#e1e3e5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  segmentActive: {
    backgroundColor: '#005bd3',
    borderColor: '#0047aa'
  },
  segmentText: {
    color: '#1f2124',
    fontSize: 12
  },
  segmentTextActive: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  productList: {
    gap: 10
  },
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e3e5'
  },
  productName: {
    color: '#1f2124',
    fontWeight: '600'
  },
  productPrice: {
    color: '#6d7175',
    fontSize: 12
  },
  addBtn: {
    color: '#005bd3',
    fontWeight: '600'
  },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  qtyBtn: {
    borderWidth: 1,
    borderColor: '#e1e3e5',
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e1e3e5',
    paddingTop: 10
  },
  totalValue: {
    color: '#005bd3',
    fontWeight: '700'
  },
  muted: {
    color: '#6d7175'
  },
  status: {
    color: '#005bd3',
    textAlign: 'center'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 24, 40, 0.35)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e1e3e5'
  }
});
