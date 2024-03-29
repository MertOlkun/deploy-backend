// routes/productRoutes.js
const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
router.post(
  "/product-post",
  productController.upload.array("images", 5),
  productController.createProduct,
  (req, res) => {
    res.send("Fotoğraflar yüklendi.");
  }
);

router.delete("/:productId", productController.deleteProduct);

router.get("/getUserProduct", productController.getUserProduct);

router.get("/getAllProduct", productController.getAllProducts);

router.post("/favorite/:productId", productController.addFavorite);

// router.put(
//   "/updateProduct/:productId",
//   productController.upload.array("images", 5),
//   productController.updateProductInfo,
//   (req, res) => {
//     res.send("Fotoğraflar yüklendi.");
//   }
// );
module.exports = router;
