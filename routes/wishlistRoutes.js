import express from "express";
import { isAuth } from "../middlewares/authMiddleware.js";
import {
  getWishlistController,
  addToWishlistController,
  removeFromWishlistController,
  moveToCartController,
  clearWishlistController,
} from "../controllers/wishlistController.js";

const router = express.Router();

// Get user's wishlist
router.get("/", isAuth, getWishlistController);

// Add item to wishlist
router.post("/add-item", isAuth, addToWishlistController);

// Remove item from wishlist
router.delete("/remove-item/:productId", isAuth, removeFromWishlistController);

// Move item to cart
router.post("/move-to-cart/:productId", isAuth, moveToCartController);

// Clear wishlist
router.delete("/clear", isAuth, clearWishlistController);

export default router;
