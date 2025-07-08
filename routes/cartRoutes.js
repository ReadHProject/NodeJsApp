import express from "express";
import {
  addToCartController,
  getCartController,
  removeFromCartController,
  clearCartController,
  increaseCartItem,
  decreaseCartItem,
} from "../controllers/cartController.js";
import { isAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/add", isAuth, addToCartController);
router.get("/", isAuth, getCartController);
router.put("/increase/:productId", isAuth, increaseCartItem);
router.put("/decrease/:productId", isAuth, decreaseCartItem);
router.delete("/remove/:productId", isAuth, removeFromCartController);
router.delete("/clear", isAuth, clearCartController);

export default router;
