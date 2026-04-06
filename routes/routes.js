import { Router } from "express";
const router = Router();

import {
  RegisterUser,
  LoginUser,
  AddMember,
} from "../controller/users/users.js";
import {
  AllStockData,
  AddStock,
  deleteProduct,
  CreateOrder,
  GetAllTransactions,
} from "../controller/stock/stock.js";
import {
  AddBuisness,
  AllOrganizations,
} from "../controller/buisness/buisness.js";

router.get("/stock", (req, res) => {
  return res.json({
    message: "stock data rescieved",
    status: true,
  });
});

router.get("/wakie-wakie", (req, res) => {
  res.status(200).json({
    message: "all good",
  });
});

router.get("/get-org-data", AllOrganizations);
router.get("/orders", GetAllTransactions);

router.post("/stock-data", AllStockData);
router.post("/add-buisness", AddBuisness);
router.post("/add-member", AddMember);
router.post("/stock", AddStock);
router.post("/save-user", LoginUser);
router.post("/register-user", RegisterUser);
router.post("/order", CreateOrder);

router.delete("/delete-product", deleteProduct);

export default router;
