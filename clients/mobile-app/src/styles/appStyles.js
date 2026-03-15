import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb'
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
    color: '#0f172a'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  label: {
    fontSize: 12,
    color: '#64748b'
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  dropdownText: {
    color: '#0f172a'
  },
  dropdownCaret: {
    color: '#64748b'
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
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1
  },
  primaryBtnSmall: {
    backgroundColor: '#2563eb',
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
    borderColor: '#e2e8f0',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1
  },
  outlineText: {
    color: '#0f172a'
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999
  },
  ghostText: {
    color: '#0f172a'
  },
  moduleTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap'
  },
  moduleTab: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff'
  },
  moduleTabActive: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8'
  },
  moduleTabText: {
    color: '#0f172a',
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
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  segmentActive: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8'
  },
  segmentText: {
    color: '#0f172a',
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
    borderColor: '#e2e8f0'
  },
  productName: {
    color: '#0f172a',
    fontWeight: '600'
  },
  productPrice: {
    color: '#64748b',
    fontSize: 12
  },
  addBtn: {
    color: '#2563eb',
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
    borderColor: '#e2e8f0',
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
    borderTopColor: '#e2e8f0',
    paddingTop: 10
  },
  totalValue: {
    color: '#2563eb',
    fontWeight: '700'
  },
  muted: {
    color: '#64748b'
  },
  status: {
    color: '#2563eb',
    textAlign: 'center'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  }
});
