import cartModel from "../models/cartModel.js";
import productModel from "../models/productModel.js";

// ➤ Add item to cart (Create or Update)
export const addToCartController = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      productId,
      name,
      image,
      price,
      quantity,
      size = "",
      color = "",
    } = req.body;

    console.log("Incoming Cart Data:", req.body); // ✅ Add this to check incoming size & color

    let cart = await cartModel.findOne({ user: userId });

    if (!cart) {
      // 🆕 No cart? Create one with this first item
      cart = await cartModel.create({
        user: userId,
        items: [{ productId, name, image, price, quantity, size, color }],
      });
    } else {
      // 🆕 Fix: Match on productId + size + color (instead of just productId)
      const existingItemIndex = cart.items.findIndex(
        (item) =>
          item.productId.equals(productId) &&
          item.size === size &&
          item.color === color
      );

      if (existingItemIndex > -1) {
        // ✅ Same product + same size + same color → increase quantity
        cart.items[existingItemIndex].quantity += quantity;
      } else {
        // ✅ Different size or color → Add as new line item
        cart.items.push({
          productId,
          name,
          image,
          price,
          quantity,
          size,
          color,
        });
      }

      await cart.save();
    }

    return res.status(200).json({
      success: true,
      message: "Product added to cart",
      cart,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error adding product to cart",
      error: error.message,
    });
  }
};

// ➤ Get User Cart
export const getCartController = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await cartModel
      .findOne({ user: userId })
      .populate("items.productId");

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Cart is empty",
        cart: { user: userId, items: [] },
      });
    }

    return res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching cart",
      error: error.message,
    });
  }
};

export const increaseCartItem = async (req, res) => {
  try {
    const userId = req.user._id; // assuming you use auth middleware
    const { productId } = req.params;

    const cart = await cartModel.findOne({ user: userId });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find((i) => i.productId.toString() === productId);
    if (item) {
      if (item.quantity < 10) {
        item.quantity += 1;
        await cart.save();
      } else {
        return res.status(400).json({ message: "Max quantity reached" });
      }
    }

    res.status(200).json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const decreaseCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    const cart = await cartModel.findOne({ user: userId });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find((i) => i.productId.toString() === productId);
    if (item) {
      if (item.quantity > 1) {
        item.quantity -= 1;
        await cart.save();
      } else {
        return res.status(400).json({ message: "Minimum quantity is 1" });
      }
    }

    res.status(200).json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ➤ Remove Item from Cart
export const removeFromCartController = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    const cart = await cartModel.findOneAndUpdate(
      { user: userId },
      { $pull: { items: { productId } } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Item removed from cart",
      cart,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error removing item from cart",
      error: error.message,
    });
  }
};

// ➤ Clear Cart
export const clearCartController = async (req, res) => {
  try {
    const userId = req.user._id;
    await cartModel.findOneAndUpdate({ user: userId }, { items: [] });

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error clearing cart",
      error: error.message,
    });
  }
};
