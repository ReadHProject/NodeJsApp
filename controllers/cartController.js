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

    // Find the product to update its stock
    const product = await productModel.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if product has enough stock
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: "Not enough stock available",
      });
    }

    // For size-specific stock updates
    if (size && color) {
      // Find the color
      const colorObj = product.colors.find((c) => c.colorName === color);
      if (colorObj) {
        // Find the size
        const sizeObj = colorObj.sizes.find((s) => s.size === size);
        if (sizeObj) {
          // Check if size has enough stock
          if (sizeObj.stock < quantity) {
            return res.status(400).json({
              success: false,
              message: `Not enough stock available for size ${size}`,
            });
          }

          // Update size stock
          sizeObj.stock -= quantity;
        }
      }
    }

    // Update general product stock
    product.stock -= quantity;
    await product.save();

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
        // Find the product to update its stock
        const product = await productModel.findById(productId);

        if (!product) {
          return res.status(404).json({
            success: false,
            message: "Product not found",
          });
        }

        // Check if product has enough stock
        if (product.stock < 1) {
          return res.status(400).json({
            success: false,
            message: "Not enough stock available",
          });
        }

        // For size-specific stock updates
        if (item.size && item.color) {
          // Find the color
          const colorObj = product.colors.find(
            (c) => c.colorName === item.color
          );
          if (colorObj) {
            // Find the size
            const sizeObj = colorObj.sizes.find((s) => s.size === item.size);
            if (sizeObj) {
              // Check if size has enough stock
              if (sizeObj.stock < 1) {
                return res.status(400).json({
                  success: false,
                  message: `Not enough stock available for size ${item.size}`,
                });
              }

              // Update size stock
              sizeObj.stock -= 1;
            }
          }
        }

        // Update general product stock
        product.stock -= 1;
        await product.save();

        // Increase cart item quantity
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
        // Find the product to update its stock
        const product = await productModel.findById(productId);

        if (!product) {
          return res.status(404).json({
            success: false,
            message: "Product not found",
          });
        }

        // For size-specific stock updates
        if (item.size && item.color) {
          // Find the color
          const colorObj = product.colors.find(
            (c) => c.colorName === item.color
          );
          if (colorObj) {
            // Find the size
            const sizeObj = colorObj.sizes.find((s) => s.size === item.size);
            if (sizeObj) {
              // Update size stock
              sizeObj.stock += 1;
            }
          }
        }

        // Update general product stock
        product.stock += 1;
        await product.save();

        // Decrease cart item quantity
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

    // First check if cart exists
    const existingCart = await cartModel.findOne({ user: userId });

    if (!existingCart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // Check if item exists in cart before trying to remove it
    const itemIndex = existingCart.items.findIndex(
      (item) => item.productId.toString() === productId.toString()
    );

    if (itemIndex === -1) {
      return res.status(200).json({
        success: true,
        message: "Item already removed",
        cart: existingCart,
      });
    }

    // Get the item before removing it
    const item = existingCart.items[itemIndex];

    // Find the product to update its stock
    const product = await productModel.findById(productId);

    if (product) {
      // For size-specific stock updates
      if (item.size && item.color) {
        // Find the color
        const colorObj = product.colors.find((c) => c.colorName === item.color);
        if (colorObj) {
          // Find the size
          const sizeObj = colorObj.sizes.find((s) => s.size === item.size);
          if (sizeObj) {
            // Update size stock
            sizeObj.stock += item.quantity;
          }
        }
      }

      // Update general product stock
      product.stock += item.quantity;
      await product.save();
    }

    // Remove the item from the cart
    existingCart.items.splice(itemIndex, 1);
    await existingCart.save();

    return res.status(200).json({
      success: true,
      message: "Item removed from cart",
      cart: existingCart,
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
    const cart = await cartModel.findOne({ user: userId });

    if (cart && cart.items.length > 0) {
      // Return all items in cart to stock
      for (const item of cart.items) {
        const product = await productModel.findById(item.productId);

        if (product) {
          // For size-specific stock updates
          if (item.size && item.color) {
            // Find the color
            const colorObj = product.colors.find(
              (c) => c.colorName === item.color
            );
            if (colorObj) {
              // Find the size
              const sizeObj = colorObj.sizes.find((s) => s.size === item.size);
              if (sizeObj) {
                // Update size stock
                sizeObj.stock += item.quantity;
              }
            }
          }

          // Update general product stock
          product.stock += item.quantity;
          await product.save();
        }
      }

      // Clear the cart
      cart.items = [];
      await cart.save();
    }

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
