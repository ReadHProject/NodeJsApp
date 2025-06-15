import express from "express";
import { isAuth, isAdmin } from "../middlewares/authMiddleware.js";
import {
  createCategoryController,
  deleteCategoryController,
  getAllCategoryController,
  updateCategoryController,
} from "../controllers/categoryController.js";

const router = express.Router();

//ROUTES
/*********************CATEGORY ROUTES***************************/

//CREATE CATEGORY
router.post("/create", isAuth, isAdmin, createCategoryController);

//GET ALL CATEGORY
router.get("/get-all", getAllCategoryController);

//DELETE CATEGORY
router.delete("/delete/:id", isAuth, isAdmin, deleteCategoryController);

//UPDATE CATEGORY
router.post("/update/:id", isAuth, isAdmin, updateCategoryController);

export default router;
