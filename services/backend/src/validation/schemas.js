const Joi = require('joi');

const orderItemSchema = Joi.object({
  product_id: Joi.string().allow(null, ''),
  name: Joi.string().allow(null, ''),
  unit_price: Joi.number().required(),
  quantity: Joi.number().min(1).required()
}).or('product_id', 'name');

const loginSchema = Joi.object({
  username: Joi.string().trim().min(1).required(),
  password: Joi.string().min(1).required()
});

const branchCreateSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  address: Joi.string().allow(null, '')
});

const branchPatchSchema = Joi.object({
  name: Joi.string().trim().min(1).allow(null, ''),
  address: Joi.string().allow(null, '')
}).or('name', 'address');

const branchLocationSchema = Joi.object({
  latitude: Joi.number().required(),
  longitude: Joi.number().required()
});

const orderCreateSchema = Joi.object({
  branch_id: Joi.string().required(),
  order_type: Joi.string().valid('DINE_IN', 'TAKE_AWAY', 'TAKEAWAY', 'DELIVERY').required(),
  table_id: Joi.string().allow(null, ''),
  items: Joi.array().min(1).items(orderItemSchema).required(),
  payments: Joi.array().items(Joi.object({
    amount: Joi.number().min(0).required(),
    payment_method: Joi.string().allow(null, ''),
    provider_metadata: Joi.any().optional()
  })).optional(),
  client_id: Joi.string().allow(null, ''),
  created_by: Joi.string().allow(null, ''),
  metadata: Joi.any().optional()
}).custom((value, helpers) => {
  if (value.order_type === 'DINE_IN' && !value.table_id) {
    return helpers.error('any.custom', { message: 'table_id_required_for_dine_in' });
  }
  return value;
}, 'table_id_required_for_dine_in');

const orderItemAddSchema = Joi.object({
  product_id: Joi.string().allow(null, ''),
  name: Joi.string().allow(null, ''),
  unit_price: Joi.number().required(),
  quantity: Joi.number().min(1).required()
}).or('product_id', 'name');

const orderItemPatchSchema = Joi.object({
  quantity: Joi.number().min(1),
  unit_price: Joi.number().min(0)
}).or('quantity', 'unit_price');

const orderPaymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  payment_method: Joi.string().allow(null, ''),
  provider_metadata: Joi.any().optional()
});

const rbacRoleCreateSchema = Joi.object({
  name: Joi.string().trim().min(1).required()
});

const rbacPermissionCreateSchema = Joi.object({
  code: Joi.string().trim().min(1).required(),
  description: Joi.string().allow(null, '')
});

const rbacRolePermissionAddSchema = Joi.object({
  permission_id: Joi.string().required()
});

const rbacUserRoleAddSchema = Joi.object({
  role_id: Joi.string().required()
});

const rbacUserBranchAddSchema = Joi.object({
  branch_id: Joi.string().required()
});

const employeeCreateSchema = Joi.object({
  username: Joi.string().trim().min(1).required(),
  password: Joi.string().min(1).required(),
  branch_id: Joi.string().allow(null, ''),
  full_name: Joi.string().allow(null, ''),
  phone: Joi.string().allow(null, ''),
  position: Joi.string().allow(null, '')
});

const employeePatchSchema = Joi.object({
  full_name: Joi.string().allow(null, ''),
  phone: Joi.string().allow(null, ''),
  position: Joi.string().allow(null, ''),
  branch_id: Joi.string().allow(null, '')
});

const userStatusSchema = Joi.object({
  is_active: Joi.boolean().required()
});

const inventoryCategoryCreateSchema = Joi.object({
  name: Joi.string().trim().min(1).required()
});

const inventoryCategoryPatchSchema = Joi.object({
  name: Joi.string().trim().min(1).required()
});

const ingredientCreateSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  unit: Joi.string().allow(null, ''),
  category_id: Joi.string().allow(null, '')
});

const ingredientPatchSchema = Joi.object({
  name: Joi.string().trim().min(1),
  unit: Joi.string().allow(null, ''),
  category_id: Joi.string().allow(null, '')
});

const inventoryItemSchema = Joi.object({
  ingredient_id: Joi.string().required(),
  quantity: Joi.number().invalid(0).required(),
  unit_cost: Joi.number().allow(null)
});

const inventoryBatchSchema = Joi.object({
  branch_id: Joi.string().required(),
  items: Joi.array().min(1).items(inventoryItemSchema).required(),
  reason: Joi.string().allow(null, '')
});

const inventoryTransactionCreateSchema = Joi.object({
  branch_id: Joi.string().required(),
  ingredient_id: Joi.string().required(),
  order_id: Joi.string().allow(null, ''),
  quantity: Joi.number().invalid(0).required(),
  transaction_type: Joi.string().min(1).required(),
  reason: Joi.string().allow(null, ''),
  unit_cost: Joi.number().allow(null)
});

const stocktakeCreateSchema = Joi.object({
  branch_id: Joi.string().required(),
  items: Joi.array().min(1).items(Joi.object({
    ingredient_id: Joi.string().required(),
    actual_qty: Joi.number().optional()
  })).required(),
  note: Joi.string().allow(null, '')
});

module.exports = {
  loginSchema,
  branchCreateSchema,
  branchPatchSchema,
  branchLocationSchema,
  orderItemSchema,
  orderCreateSchema,
  orderItemAddSchema,
  orderItemPatchSchema,
  orderPaymentSchema,
  rbacRoleCreateSchema,
  rbacPermissionCreateSchema,
  rbacRolePermissionAddSchema,
  rbacUserRoleAddSchema,
  rbacUserBranchAddSchema,
  employeeCreateSchema,
  employeePatchSchema,
  userStatusSchema,
  inventoryCategoryCreateSchema,
  inventoryCategoryPatchSchema,
  ingredientCreateSchema,
  ingredientPatchSchema,
  inventoryItemSchema,
  inventoryBatchSchema,
  inventoryTransactionCreateSchema,
  stocktakeCreateSchema
};
