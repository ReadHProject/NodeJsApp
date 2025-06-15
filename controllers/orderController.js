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

    //VALIDATION
    // if (
    //   !shippingInfo ||
    //   !orderItems ||
    //   !paymentMethod ||
    //   !paymentInfo ||
    //   !itemPrice ||
    //   !tax ||
    //   !shippingCharges ||
    //   !totalAmount
    // ) {
    //   return res.status(500).send({
    //     success: false,
    //     message: "Please provide all fields",
    //   });
    // }

    //CREATE ORDER
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

    //STOCK UPDATE
    for (let i = 0; i < orderItems.length; i++) {
      //FIND PRODUCT
      const product = await productModel.findById(orderItems[i].product);
      product.stock -= orderItems[i].quantity;
      await product.save();
    }

    return res.status(201).send({
      success: true,
      message: "Order Created Successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Create Order API: ${console.log(error)}`,
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
export const changeOrderStatusController = async (req, res) => {
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

    if (order.orderStatus === "processing") order.orderStatus = "shipped";
    else if (order.orderStatus === "shipped") {
      order.orderStatus = "delivered";
      order.deliveredAt = Date.now();
    } else {
      return res.status(500).send({
        success: false,
        message: "Order already delivered",
      });
    }

    //UPDATE ORDER STATUS
    await order.save();
    return res.status(200).send({
      success: true,
      message: "Order Status Updated Successfully",
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
      message: `Error in Change Order Status API: ${console.log(error)}`,
      error,
    });
  }
};
