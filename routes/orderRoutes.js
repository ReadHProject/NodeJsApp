import express from "express";
import { isAdmin, isAuth } from "../middlewares/authMiddleware.js";
import {
  changeOrderStatusController,
  createOrderController,
  getAllOrdersController,
  getMyOrdersController,
  paymentsController,
  singleOrderDetailsController,
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

//CHANGE ORDER STATUS
router.put("/admin/order/:id", isAuth, isAdmin, changeOrderStatusController);

export default router;
