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
    } = req.body;

    // Create the order
    await orderModel.create({
      user: req.user._id,
      shippingInfo,
      orderItems,
      paymentMethod,
      paymentInfo,
      itemPrice,
      tax,
      shippingCharges,
      totalAmount,
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
    const orders = await orderModel.find({ user: req.user._id });

    //VALIDATION
    if (!orders) {
      return res.status(404).send({
        success: false,
        message: "Orders Not Found",
      });
    }

    return res.status(200).send({
      success: true,
      message: "My Orders Fetched Successfully",
      totalOrders: orders.length,
      orders,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Get My Orders API: ${console.log(error)}`,
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
      return res.status(404).send({
        success: false,
        message: "Total amount is required",
      });
    }

    const { client_secret } = await stripe.paymentIntents.create({
      amount: Number(totalAmount * 100),
      currency: "usd",
    });

    return res.status(200).send({
      success: true,
      message: "Payment Done Successfully",
      client_secret,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Single order Details API: ${console.log(error)}`,
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
