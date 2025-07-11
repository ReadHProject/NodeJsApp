import wishlistModel from "../models/wishlistModel.js";
import cartModel from "../models/cartModel.js";

// ➤ Get User Wishlist
export const getWishlistController = async (req, res) => {
  try {
    const userId = req.user._id;
    const wishlist = await wishlistModel
      .findOne({ user: userId })
      .populate("items.productId");

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        message: "Wishlist is empty",
        wishlist: { user: userId, items: [] },
      });
    }

    return res.status(200).json({
      success: true,
      wishlist,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching wishlist",
      error: error.message,
    });
  }
};

// ➤ Add item to wishlist
export const addToWishlistController = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, name, image, price, size = "", color = "" } = req.body;

    console.log("Adding to wishlist:", req.body);

    let wishlist = await wishlistModel.findOne({ user: userId });

    if (!wishlist) {
      // Create new wishlist if it doesn't exist
      wishlist = await wishlistModel.create({
        user: userId,
        items: [{ productId, name, image, price, size, color }],
      });
    } else {
      // Check if item already exists with same productId + size + color
      const existingItemIndex = wishlist.items.findIndex(
        (item) =>
          item.productId.equals(productId) &&
          item.size === size &&
          item.color === color
      );

      if (existingItemIndex > -1) {
        // Item already exists in wishlist
        return res.status(200).json({
          success: true,
          message: "Item already in wishlist",
          wishlist,
        });
      } else {
        // Add new item to wishlist
        wishlist.items.push({
          productId,
          name,
          image,
          price,
          size,
          color,
        });

        await wishlist.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Item added to wishlist",
      wishlist,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error adding item to wishlist",
      error: error.message,
    });
  }
};

// ➤ Remove item from wishlist
export const removeFromWishlistController = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;
    const { size, color } = req.body;

    // Find user's wishlist
    const wishlist = await wishlistModel.findOne({ user: userId });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    // Store original items length for comparison
    const originalLength = wishlist.items.length;

    // Filter out the item to remove
    if (size && color) {
      // Remove specific variant with both size and color
      wishlist.items = wishlist.items.filter(
        (item) =>
          !(
            item.productId.toString() === productId &&
            item.size === size &&
            item.color === color
          )
      );
    } else if (size) {
      // Remove specific variant with matching size only
      wishlist.items = wishlist.items.filter(
        (item) =>
          !(item.productId.toString() === productId && item.size === size)
      );
    } else if (color) {
      // Remove specific variant with matching color only
      wishlist.items = wishlist.items.filter(
        (item) =>
          !(item.productId.toString() === productId && item.color === color)
      );
    } else {
      // Remove all variants of this product
      wishlist.items = wishlist.items.filter(
        (item) => item.productId.toString() !== productId
      );
    }

    // Check if any items were removed
    if (wishlist.items.length === originalLength) {
      console.log("No items were removed from wishlist");
    } else {
      console.log(
        `${originalLength - wishlist.items.length} items removed from wishlist`
      );
    }

    await wishlist.save();

    return res.status(200).json({
      success: true,
      message: "Item removed from wishlist",
      wishlist,
    });
  } catch (error) {
    console.error("Error in removeFromWishlistController:", error);
    return res.status(500).json({
      success: false,
      message: "Error removing item from wishlist",
      error: error.message,
    });
  }
};

// ➤ Move item from wishlist to cart
export const moveToCartController = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;
    const { size, color } = req.body;

    // Find user's wishlist
    const wishlist = await wishlistModel.findOne({ user: userId });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    // Find the item to move
    let itemToMove;
    let remainingItems = [];

    if (size && color) {
      // Find specific variant
      itemToMove = wishlist.items.find(
        (item) =>
          item.productId.toString() === productId &&
          item.size === size &&
          item.color === color
      );

      // Keep all other items
      remainingItems = wishlist.items.filter(
        (item) =>
          !(
            item.productId.toString() === productId &&
            item.size === size &&
            item.color === color
          )
      );
    } else {
      // Find first variant of this product
      itemToMove = wishlist.items.find(
        (item) => item.productId.toString() === productId
      );

      // Keep all other items
      remainingItems = wishlist.items.filter(
        (item) => item.productId.toString() !== productId
      );
    }

    if (!itemToMove) {
      return res.status(404).json({
        success: false,
        message: "Item not found in wishlist",
      });
    }

    // Update wishlist with remaining items
    wishlist.items = remainingItems;
    await wishlist.save();

    // Add item to cart
    let cart = await cartModel.findOne({ user: userId });

    if (!cart) {
      // Create new cart if it doesn't exist
      cart = await cartModel.create({
        user: userId,
        items: [
          {
            productId: itemToMove.productId,
            name: itemToMove.name,
            image: itemToMove.image,
            price: itemToMove.price,
            quantity: 1, // Default quantity
            size: itemToMove.size,
            color: itemToMove.color,
          },
        ],
      });
    } else {
      // Check if item already exists with same productId + size + color
      const existingItemIndex = cart.items.findIndex(
        (item) =>
          item.productId.equals(itemToMove.productId) &&
          item.size === itemToMove.size &&
          item.color === itemToMove.color
      );

      if (existingItemIndex > -1) {
        // If item exists, increase quantity
        cart.items[existingItemIndex].quantity += 1;
      } else {
        // Add new item to cart
        cart.items.push({
          productId: itemToMove.productId,
          name: itemToMove.name,
          image: itemToMove.image,
          price: itemToMove.price,
          quantity: 1, // Default quantity
          size: itemToMove.size,
          color: itemToMove.color,
        });
      }

      await cart.save();
    }

    return res.status(200).json({
      success: true,
      message: "Item moved to cart",
      wishlist,
      cart,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error moving item to cart",
      error: error.message,
    });
  }
};

// ➤ Clear Wishlist
export const clearWishlistController = async (req, res) => {
  try {
    const userId = req.user._id;
    await wishlistModel.findOneAndUpdate({ user: userId }, { items: [] });

    return res.status(200).json({
      success: true,
      message: "Wishlist cleared successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error clearing wishlist",
      error: error.message,
    });
  }
};
