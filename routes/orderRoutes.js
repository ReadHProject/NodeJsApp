import express from "express";
import { isAdmin, isAuth } from "../middlewares/authMiddleware.js";
import {
  changeOrderStatusController,
  createOrderController,
  deleteOrderController,
  getAllOrdersController,
  getMyOrdersController,
  paymentsController,
  singleOrderDetailsController,
  updateOrderStatusController,
} from "../controllers/orderController.js";

const router = express.Router();

//ROUTES
/*********************ORDER ROUTES***************************/

//CREATE ORDER
router.post("/create", isAuth, createOrderController);

//GET ALL ORDERS
router.get("/my-orders", isAuth, getMyOrdersController);

//GET SINGLE ORDERS
router.get("/my-orders/:id", isAuth, singleOrderDetailsController);

//ACCEPT PAYMENTS
router.post("/payments", isAuth, paymentsController);

//***************************ADMIN PART********************************/
//GET ALL ORDERS
router.get("/admin/get-all-orders", isAuth, isAdmin, getAllOrdersController);

// 1️⃣ Auto Next Status (Button)
router.put("/admin/:id", isAuth, isAdmin, changeOrderStatusController);

// 2️⃣ Manual Status Update (Modal)
router.put(
  "/admin/update-status/:id",
  isAuth,
  isAdmin,
  updateOrderStatusController
);

// 3️⃣ Delete Order
router.delete("/admin/:id", isAuth, isAdmin, deleteOrderController);

export default router;
