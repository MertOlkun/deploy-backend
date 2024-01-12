// productController.js
const express = require("express");
const app = express();
const { Op } = require("sequelize");
const Sequelize = require("sequelize");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const fs = require("fs").promises;
const path = require("path");
const { sequelize } = require("../models/index");
const Product = require("../models/product");
const Car = require("../models/products/car");
const Computer = require("../models/products/computer");
const Home = require("../models/products/home");
const Land = require("../models/products/land");
const Motorcycle = require("../models/products/motorcycle");
const Phone = require("../models/products/phone");
const User = require("../models/user");
const Images = require("../models/images");

//! CREATE PRODUCT OPERATIONS
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "images/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + fileExtension);
  },
});

const upload = multer({ storage: storage });

const createProduct = async (req, res) => {
  const images = req.files;

  // Get file names
  const fileNames = images.map((file) => file.filename);

  const {
    productTitle,
    productName,
    model,
    description,
    category,
    subcategory,
    province,
    district,
    neighbourhood,
    brand,
    series,
    color,
    gear,
    price,
    ram,
    gpu,
    processor,
    memory,
    squareMeters,
    room,
    propertyType,
  } = req.body;

  try {
    // Token validation
    let token = req.headers.authorization;
    if (!token) {
      return res
        .status(401)
        .json({ error: "Authorization failed. Token not found." });
    }

    // Verify the token
    token = token.split(" ")[1];
    const decodedToken = jwt.verify(token, "jwtSecretKey123456789");
    const userId = decodedToken.userId;

    // User validation
    const user = await User.findByPk(userId);
    if (!user) {
      return res
        .status(401)
        .json({ error: "Authorization failed. User not found." });
    }

    // Start the transaction
    await sequelize.transaction(async (t) => {
      if (images.length > 5) {
        return res
          .status(400)
          .json({ error: "You can upload at most 5 photos." });
      }
      const imgCreate = await Images.create(
        {
          img1: fileNames[0],
          img2: fileNames[1],
          img3: fileNames[2],
          img4: fileNames[3],
          img5: fileNames[4],
        },
        { transaction: t }
      );

      // Add a new product to the Product table
      const createdProduct = await Product.create(
        {
          productTitle,
          productName,
          description,
          category,
          subcategory,
          province,
          district,
          neighbourhood,
          userId,
          imageId: imgCreate.id,
        },
        { transaction: t }
      );
      // Specify the table name to add data to other tables
      let specificFields;
      switch (subcategory.toLowerCase()) {
        case "car":
          specificFields = { brand, series, color, gear, price };
          break;
        case "motorcycle":
          specificFields = { brand, series, color, gear, price };
          break;
        case "home":
          specificFields = { squareMeters, room, propertyType, price };
          break;
        case "land":
          specificFields = { propertyType, squareMeters, price };
          break;
        case "computer":
          specificFields = {
            brand,
            model,
            ram,
            gpu,
            processor,
            memory,
            price,
          };
          break;
        case "phone":
          specificFields = {
            brand,
            model,
            color,
            ram,
            processor,
            memory,
            price,
          };
          break;
        default:
          specificFields = {};
          break;
      }
      // Add a new product to the relevant table
      await sequelize.models[subcategory.toLowerCase()].create(
        { ...specificFields, productId: createdProduct.id },
        { transaction: t }
      );
    });
    // Send a success message to the client when successfully added
    res.status(201).json({ message: `Product added successfully` });
  } catch (error) {
    // Send an error message to the client if an error occurs
    console.error("An error occurred while adding the product:", error.message);
    res
      .status(500)
      .json({ error: "An error occurred while adding the product" });
  }
};

//! GET USER PRODUCT İŞLEMLERİ

const getUserProduct = async (req, res) => {
  try {
    // Get the token sent by the user
    let token = req.headers.authorization;
    if (!token) {
      // If there is no token, return an authentication error
      return res
        .status(401)
        .json({ error: "Authentication failed. Token not found." });
    }

    // Verify the token and extract the user ID
    token = token.split(" ")[1];
    const decodedToken = jwt.verify(token, "jwtSecretKey123456789");
    const userId = decodedToken.userId;

    // Find the user in the database
    const user = await User.findByPk(userId);
    if (!user) {
      // If the user is not found, return an authentication error
      return res
        .status(401)
        .json({ error: "Authentication failed. User not found." });
    }

    // Find the user's products in the database
    const userProduct = await Product.findAll({
      where: { userId: userId },
    });

    // Retrieve user information from the User table
    const userInfo = await User.findByPk(userId);

    if (!userInfo) {
      // Return null or an empty object if the user is not found
      return null;
    }

    // You can format the user information as desired
    const UserInfo = {
      id: userInfo.id,
      username: userInfo.username,
      email: userInfo.email,
      phoneNumber: userInfo.phoneNumber,
      createdAt: userInfo.createdAt,
    };

    // Extract the product IDs of the user's products into an array
    const userProductIds = userProduct.map((product) => product.id);

    // Extract the subcategories of the user's products into an array
    const userProductSubcategories = userProduct.map(
      (product) => product.subcategory
    );

    // Get unique subcategories from the array
    const uniqueSubcategories = [...new Set(userProductSubcategories)];

    // Create an object to hold the results
    const result = {};
    for (const subcategory of uniqueSubcategories) {
      const model = sequelize.models[subcategory];

      if (model) {
        // For each subcategory, find the products from the corresponding model
        const items = await model.findAll({
          where: { productId: { [Op.in]: userProductIds } },
        });
        result[subcategory] = items;
      }
    }

    const userImagesId = userProduct.map((product) => product.imageId);

    const pht = await Images.findAll({
      where: { id: { [Op.in]: userImagesId } },
    });

    // Assign images as an object variable
    const imageMap = {};
    pht.forEach((img) => {
      // If none of the img values in the image are null, meaning it's a filled image
      if (img.img1 || img.img2 || img.img3 || img.img4 || img.img5) {
        imageMap[img.id] = {
          img1: img.img1 || null,
          img2: img.img2 || null,
          img3: img.img3 || null,
          img4: img.img4 || null,
          img5: img.img5 || null,
        };
      }
    });

    // Merge userProduct and result for matching product IDs
    const finalResult = userProduct.map((product) => {
      const matchingImage = pht.find((img) => img.id === product.imageId);
      return {
        ...product.dataValues,
        img1: matchingImage ? matchingImage.img1 : null,
        img2: matchingImage ? matchingImage.img2 : null,
        img3: matchingImage ? matchingImage.img3 : null,
        img4: matchingImage ? matchingImage.img4 : null,
        img5: matchingImage ? matchingImage.img5 : null,
        details: result[product.subcategory].find(
          (detail) => detail.productId === product.id
        ),
      };
    });

    // Send the results to the client
    res.status(201).json({ mergedResult: finalResult, UserInfo });
  } catch (error) {
    // If an error occurs, send an error message to the client
    console.error(
      "An error occurred while displaying products:",
      error.message
    );
    res
      .status(500)
      .json({ error: "An error occurred while displaying products" });
  }
};

//! GET ALL PRODUCT OPERATIONS

const getAllProducts = async (req, res) => {
  try {
    // Tüm ürünleri veritabanında bul
    const allProducts = await Product.findAll();

    // Tüm ürünlerin ID'lerini bir diziye çıkar
    const allProductIds = allProducts.map((product) => product.id);

    // userId'leri depolamak için boş bir dizi oluşturun
    const userIds = [];

    // Her bir ürünün içinde dolaşarak userId'leri toplayın
    allProducts.forEach((product) => {
      const userId = product.dataValues.userId;
      userIds.push(userId);
    });

    // User tablosundan kullanıcı bilgilerini al
    const userInfo = await User.findAll({
      where: { id: { [Op.in]: userIds } },
    });

    // Varsayılan olarak userIds ve userInfo'nin aynı sıraya sahip olduğunu düşünüyoruz
    const userInfoMap = {};
    userInfo.forEach((user) => {
      userInfoMap[user.id] = {
        id: user.id,
        username: user.username,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
      };
    });

    // Tüm ürün alt kategorilerini bir diziye çıkar
    const allProductSubcategories = allProducts.map(
      (product) => product.subcategory
    );

    // Alt kategorilerden benzersiz olanları al
    const uniqueSubcategories = [...new Set(allProductSubcategories)];

    // Sonuçları tutacak bir nesne oluştur
    const result = {};
    for (const subcategory of uniqueSubcategories) {
      const model = sequelize.models[subcategory];
      if (model) {
        // Her alt kategori için ilgili modelden ürünleri bul
        const items = await model.findAll({
          where: { productId: { [Op.in]: allProductIds } },
        });
        result[subcategory] = items;
      }
    }

    // Tüm ürünlerin ID'lerini bir diziye çıkar
    const allImagesId = allProducts.map((product) => product.imageId);

    // Tüm resimleri veritabanında bul
    const allImages = await Images.findAll({
      where: { id: { [Op.in]: allImagesId } },
    });

    // Tüm ürünler ve result'u eşleşen ürün ID'leri için birleştir
    const finalResult = allProducts.map((product) => {
      const matchingImage = allImages.find((img) => img.id === product.imageId);
      return {
        ...product.dataValues,
        img1: matchingImage ? matchingImage.img1 : null,
        img2: matchingImage ? matchingImage.img2 : null,
        img3: matchingImage ? matchingImage.img3 : null,
        img4: matchingImage ? matchingImage.img4 : null,
        img5: matchingImage ? matchingImage.img5 : null,
        details: result[product.subcategory].find(
          (detail) => detail.productId === product.id
        ),
      };
    });

    // Sonuçları istemciye gönder
    res.status(200).json({ allProducts: finalResult, userInfoMap });
  } catch (error) {
    console.error("Tüm ürünler getirilirken bir hata oluştu:", error.message);
    res.status(500).json({ error: "Tüm ürünler getirilirken bir hata oluştu" });
  }
};

//! UPDATE PRODUCT OPERATIONS

const updateProductInfo = async (
  req,
  res,
  productId,
  updatedData,
  newImages,
  subcategory
) => {
  try {
    // Token validation
    let token = req.headers.authorization;
    if (!token) {
      return res
        .status(401)
        .json({ error: "Authorization failed. Token not found." });
    }

    // Verify the token
    token = token.split(" ")[1];
    const decodedToken = jwt.verify(token, "jwtSecretKey123456789");
    const userId = decodedToken.userId;

    // User validation
    const user = await User.findByPk(userId);
    if (!user) {
      return res
        .status(401)
        .json({ error: "Authorization failed. User not found." });
    }

    // Start the transaction
    await sequelize.transaction(async (t) => {
      // Update the product information
      await Product.update(updatedData, {
        where: { id: productId },
        transaction: t,
      });

      // Get the current image names associated with the product
      const currentImages = await Images.findByPk(productId);

      // Delete the old images from the 'images/' directory
      Object.values(currentImages.dataValues).forEach(async (image) => {
        if (image) {
          const imagePath = path.join("images/", image);
          if (fs.existsSync(imagePath)) {
            await fs.promises.unlink(imagePath);
          }
        }
      });

      // Create a new entry in the 'Images' table for the updated images
      const imgCreate = await Images.create(
        {
          img1: newImages[0],
          img2: newImages[1],
          img3: newImages[2],
          img4: newImages[3],
          img5: newImages[4],
        },
        { transaction: t }
      );

      // Update the product's imageId to the new entry in the 'Images' table
      await Product.update(
        { imageId: imgCreate.id },
        { where: { id: productId }, transaction: t }
      );

      // Update specific fields in the relevant table
      await sequelize.models[subcategory.toLowerCase()].update(
        { ...updatedData, imageId: imgCreate.id }, // Update the relevant fields
        { where: { productId }, transaction: t }
      );
    });

    console.log("Product information and images updated successfully");
    res
      .status(200)
      .json({ message: "Product information and images updated successfully" });
  } catch (error) {
    console.error(
      "An error occurred while updating product information:",
      error.message
    );
    res
      .status(500)
      .json({ error: "An error occurred while updating product information" });
  }
};

//! DELETE PRODUCT OPERATIONS

// Token check
const deleteProduct = async (req, res) => {
  try {
    // Token check
    let token = req.headers.authorization;
    if (!token) {
      return res
        .status(401)
        .json({ error: "Authorization failed. Token not found." });
    }

    // Token verification
    token = token.split(" ")[1];
    const decodedToken = jwt.verify(token, "jwtSecretKey123456789");
    const userId = decodedToken.userId;

    // Find user's products in the database
    const userProduct = await Product.findAll({
      where: { userId: userId },
    });

    // Product ID from the request parameters
    const productId = req.params.productId;

    // Convert user's product IDs to an array
    const userProductIds = userProduct.map((product) => product.id);

    // If the user is deleting their own product, proceed; otherwise, return an error
    if (!userProductIds.includes(parseInt(productId))) {
      res.status(403).json({ error: "Product not found or not owned by you." });
      return;
    }

    // Transaction: Start
    await sequelize.transaction(async (t) => {
      // Get the imageId of the product to be deleted from the Product table
      const deletedProduct = await Product.findByPk(productId, {
        attributes: ["imageId"],
        transaction: t,
      });

      const imageId = deletedProduct ? deletedProduct.imageId : null;

      // Delete product entries from other tables based on the subcategory
      const subcategory = userProduct.map((product) => product.subcategory);

      await sequelize.models[subcategory].destroy({
        where: { productId: productId },
        transaction: t,
      });

      // Delete the product from the Product table
      await Product.destroy({
        where: { id: productId },
        transaction: t,
      });

      // Retrieve image names from the Images table for deletion
      const imageDelete = await Images.findByPk(imageId, { transaction: t });

      let img1 = imageDelete ? imageDelete.dataValues.img1 : null;
      let img2 = imageDelete ? imageDelete.dataValues.img2 : null;
      let img3 = imageDelete ? imageDelete.dataValues.img3 : null;
      let img4 = imageDelete ? imageDelete.dataValues.img4 : null;
      let img5 = imageDelete ? imageDelete.dataValues.img5 : null;

      // Delete files from the Images folder
      await Promise.all(
        [img1, img2, img3, img4, img5]
          .filter(Boolean)
          .map(async (imageName) => {
            const imagePath = path.join(__dirname, "../images", imageName);

            try {
              // Check the existence of the file
              const fileExists = await fs
                .access(imagePath)
                .then(() => true)
                .catch(() => false);

              if (fileExists) {
                // Delete the file
                await fs.unlink(imagePath);
                console.log(`"${imageName}" file successfully deleted.`);
              }
            } catch (error) {
              console.error(
                `Error deleting "${imageName}" file:`,
                error.message
              );
            }
          })
      );

      // If imageId exists and there is a corresponding entry in the Images table, delete it
      if (imageId !== null) {
        await Images.destroy({
          where: { id: imageId },
          transaction: t,
        });
      }
    });

    // Success: Send a success message to the client
    res.status(200).json({ message: "Product successfully deleted" });
  } catch (error) {
    // Error: Send an error message to the client
    console.error("Error deleting a product:", error.message);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the product" });
  }
};

// DELETE /products/:productId
// router.delete("/products/:productId", deleteProduct);

module.exports = {
  createProduct,
  getUserProduct,
  upload,
  deleteProduct,
  getAllProducts,
  updateProductInfo,
};
