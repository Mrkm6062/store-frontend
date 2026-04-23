import Order from "../models/Order.js";
import Store from "../models/Store.js";

// CREATE NEW ORDER (Placed by Customer via Storefront)
export const createOrder = async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, address, orderItems, totalAmount } = req.body;

    const storeSlug = req.headers['x-store'];
    if (!storeSlug) {
      return res.status(400).json({ message: "Store context missing from headers" });
    }

    const store = await Store.findOne({ storeSlug });
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    const order = await Order.create({
      store: store._id,
      customerName,
      customerEmail,
      customerPhone,
      address,
      orderItems,
      totalAmount,
      paymentStatus: "pending",
      orderStatus: "placed"
    });

    res.status(201).json({ message: "Order placed successfully!", order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET ALL ORDERS FOR A STORE (Admin Dashboard)
export const getOrders = async (req, res) => {
  try {
    const { storeId } = req.query;

    // Security: Ensure the user owns this store
    const store = await Store.findOne({ _id: storeId, ownerId: req.user.userId });
    if (!store) {
      return res.status(403).json({ message: "Not authorized to view these orders" });
    }

    // Fetch orders, sorted by newest first
    const orders = await Order.find({ store: storeId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE ORDER STATUS
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const store = await Store.findOne({ _id: order.store, ownerId: req.user.userId });
    if (!store) return res.status(403).json({ message: "Not authorized to update this order" });

    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();
    res.json({ message: "Order updated successfully", order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};