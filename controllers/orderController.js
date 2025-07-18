import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import { stripe } from "../server.js";

//CREATE ORDER
export const createOrderController = async (req, res) => {
  try {
    const {
      shippingInfo,
      orderItems,
      paymentMethod,
      paymentInfo,
      itemPrice,
      tax,
      shippingCharges,
      totalAmount,
      notes,
    } = req.body;

    // Validate required fields
    if (!shippingInfo || !orderItems || !paymentMethod) {
      return res.status(400).send({
        success: false,
        message: "Missing required fields for order creation",
      });
    }

    // Prepare shipping info with phone if provided
    const orderShippingInfo = {
      ...shippingInfo,
      phone: shippingInfo.phone || "",
    };

    // Create the order
    const newOrder = await orderModel.create({
      user: req.user._id,
      shippingInfo: orderShippingInfo,
      orderItems,
      paymentMethod,
      paymentInfo,
      itemPrice,
      tax,
      shippingCharges,
      totalAmount,
      notes: notes || "",
      paidAt: paymentMethod === "ONLINE" && paymentInfo ? new Date() : null,
      estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });

    // ✅ Update stock safely without fetching full product or saving
    for (let i = 0; i < orderItems.length; i++) {
      const productId = orderItems[i].product;
      const quantityOrdered = orderItems[i].quantity;

      await productModel.findByIdAndUpdate(
        productId,
        { $inc: { stock: -quantityOrdered } }, // safely decrease stock
        { new: true, runValidators: false } // avoid validation errors
      );
    }

    return res.status(201).send({
      success: true,
      message: "Order Created Successfully",
      order: newOrder,
      orderId: newOrder._id,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Create Order API: ${error.message}`,
      error,
    });
  }
};

//GET ALL ORDERS
export const getMyOrdersController = async (req, res) => {
  try {
    //FIND ORDERS
    const orders = await orderModel
      .find({ user: req.user._id })
      .sort({ createdAt: -1 }) // Most recent first
      .populate({
        path: "orderItems.product",
        select: "name price images",
      });

    //VALIDATION
    if (!orders || orders.length === 0) {
      return res.status(200).send({
        success: true,
        message: "No orders found",
        totalOrders: 0,
        orders: [],
      });
    }

    // Add virtual property orderAge
    const ordersWithDetails = orders.map((order) => {
      const orderObj = order.toObject({ virtuals: true });
      return orderObj;
    });

    return res.status(200).send({
      success: true,
      message: "My Orders Fetched Successfully",
      totalOrders: orders.length,
      orders: ordersWithDetails,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Get My Orders API: ${error.message}`,
      error,
    });
  }
};

//GET SINGLE ORDERS
export const singleOrderDetailsController = async (req, res) => {
  try {
    //FIND ORDER
    const order = await orderModel.findById(req.params.id);

    //VALIDATION
    if (!order) {
      return res.status(404).send({
        success: false,
        message: "Order Not Found",
      });
    }

    return res.status(200).send({
      success: true,
      message: "Single Order Details Fetched Successfully",
      order,
    });
  } catch (error) {
    console.log(error);
    //Cast Error || Object Id
    if (error.name === "CastError") {
      return res.status(500).send({
        success: false,
        message: `Invalid Id`,
      });
    }
    return res.status(500).send({
      success: false,
      message: `Error in Single order Details API: ${console.log(error)}`,
      error,
    });
  }
};

//ACCEPT PAYMENTS
export const paymentsController = async (req, res) => {
  try {
    //GET AMOUNT
    const { totalAmount } = req.body;

    //VALIDATION
    if (!totalAmount) {
      return res.status(400).send({
        success: false,
        message: "Total amount is required",
      });
    }

    // Create a payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Number(totalAmount * 100), // convert to cents
      currency: "usd",
      metadata: {
        userId: req.user._id.toString(),
        integration_check: "accept_a_payment",
      },
    });

    return res.status(200).send({
      success: true,
      message: "Payment Intent Created Successfully",
      client_secret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Payment Processing API: ${error.message}`,
      error,
    });
  }
};

//******************ADMIN SECTION**********************/

//GET ALL ORDERS
export const getAllOrdersController = async (req, res) => {
  try {
    const orders = await orderModel.find({});
    return res.status(200).send({
      success: true,
      message: "All Orders Fetched Successfully",
      totalOrders: orders.length,
      orders,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in GET ALL ORDERS API: ${console.log(error)}`,
      error,
    });
  }
};

//CHANGE ORDER STATUS
// export const changeOrderStatusController = async (req, res) => {
//   try {
//     //FIND ORDER
//     const order = await orderModel.findById(req.params.id);
//     //VALIDATION
//     if (!order) {
//       return res.status(404).send({
//         success: false,
//         message: "Order Not Found",
//       });
//     }

//     if (order.orderStatus === "processing") order.orderStatus = "shipped";
//     else if (order.orderStatus === "shipped") {
//       order.orderStatus = "delivered";
//       order.deliveredAt = Date.now();
//     } else {
//       return res.status(500).send({
//         success: false,
//         message: "Order already delivered",
//       });
//     }

//     //UPDATE ORDER STATUS
//     await order.save();
//     return res.status(200).send({
//       success: true,
//       message: "Order Status Updated Successfully",
//       order,
//     });
//   } catch (error) {
//     console.log(error);
//     //Cast Error || Object Id
//     if (error.name === "CastError") {
//       return res.status(500).send({
//         success: false,
//         message: `Invalid Id`,
//       });
//     }
//     return res.status(500).send({
//       success: false,
//       message: `Error in Change Order Status API: ${console.log(error)}`,
//       error,
//     });
//   }
// };

// 1️⃣ Update Order Status (Manual)
export const updateOrderStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    const order = await orderModel.findById(id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    order.orderStatus = orderStatus;
    if (orderStatus.toLowerCase() === "delivered") {
      order.deliveredAt = Date.now();
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
};

// 2️⃣ Change Order Status (Auto Next Step)
export const changeOrderStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderModel.findById(id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.orderStatus === "processing") {
      order.orderStatus = "shipped";
    } else if (order.orderStatus === "shipped") {
      order.orderStatus = "delivered";
      order.deliveredAt = Date.now();
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Order already delivered" });
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status changed to next step",
      order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to change order status",
      error: error.message,
    });
  }
};

// 3️⃣ Delete Order
export const deleteOrderController = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await orderModel.findByIdAndDelete(id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete order",
      error: error.message,
    });
  }
};
