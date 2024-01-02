// productController.js
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
const { BOOLEAN } = require("sequelize");

//! CREATE PRODUCT İŞLEMLERİ
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

  // Dosya adlarını al
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
    // Token kontrolü
    const token = req.headers.authorization;
    if (!token) {
      return res
        .status(401)
        .json({ error: "Yetkilendirme başarısız. Token bulunamadı." });
    }

    // Token doğrulama
    const decodedToken = jwt.verify(token, "jwtSecretKey123456789");
    const userId = decodedToken.userId;

    // Kullanıcı kontrolü
    const user = await User.findByPk(userId);
    if (!user) {
      return res
        .status(401)
        .json({ error: "Yetkilendirme başarısız. Kullanıcı bulunamadı." });
    }

    // Transaction başlatın
    await sequelize.transaction(async (t) => {
      if (images.length > 5) {
        return res
          .status(400)
          .json({ error: "En fazla 5 fotoğraf ekleyebilirsiniz." });
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

      // Product tablosuna yeni bir ürün ekleyin
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

      // Diğer tablolara veri eklemek için tablo adını belirleyin
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

      // İlgili tabloya yeni bir ürün ekleyin
      await sequelize.models[subcategory.toLowerCase()].create(
        { ...specificFields, productId: createdProduct.id },
        { transaction: t }
      );
    });
    // Başarılı bir şekilde eklendiyse, istemciye başarı mesajı gönderin
    res.status(201).json({ message: "Ürün başarıyla eklendi" });
  } catch (error) {
    // Hata oluştuğunda istemciye hata mesajını gönderin
    console.error("Ürün eklenirken bir hata oluştu:", error.message);
    res.status(500).json({ error: "Ürün eklenirken bir hata oluştu" });
  }
};

// //! GET USER PRODUCT İŞLEMLERİ
const getUserProduct = async (req, res) => {
  try {
    // Token kontrolü
    const token = req.headers.authorization;
    if (!token) {
      return res
        .status(401)
        .json({ error: "Yetkilendirme başarısız. Token bulunamadı." });
    }

    // Token doğrulama
    const decodedToken = jwt.verify(token, "jwtSecretKey123456789");
    const userId = decodedToken.userId;

    // Kullanıcı kontrolü
    const user = await User.findByPk(userId);
    if (!user) {
      return res
        .status(401)
        .json({ error: "Yetkilendirme başarısız. Kullanıcı bulunamadı." });
    }
    // userId ile product tablosunda kullanıcı ürünü bulmak
    const userProduct = await Product.findAll({
      where: { userId: userId },
    });

    //
    const userProductId = await Product.findAll({
      attiributes: ["id"],
      where: { userId: userId },
    });
    const x = userProductId.map((Product) => Product.id);

    const userSubcategoryId = await Product.findAll({
      attributes: ["subcategory"],
      where: { userId: userId },
    });
    const y = userSubcategoryId.map((Product) => Product.subcategory);

    function uniqueItems(arr) {
      const uniqueSet = new Set(arr);
      const uniqueArray = Array.from(uniqueSet);
      return uniqueArray;
    }
    const resultArray = uniqueItems(y);

    // switch (y) {
    //   case "car":
    //     break;
    //   case "motorcycle":
    //     break;
    //   case "home":
    //     break;
    //   case "land":
    //     break;
    //   case "phone":
    //     break;
    //   case "computer":
    //     break;
    // }

    // const search = await y.findAll({
    //   where: { productId: x },
    // });

    // Başarılı bir şekilde eklendiyse, istemciye başarı mesajı gönderin

    res.status(201).json(t);
  } catch (error) {
    // Hata oluştuğunda istemciye hata mesajını gönderin
    console.error("Ürün eklenirken bir hata oluştu:", error.message);
    res.status(500).json({ error: "Ürün eklenirken bir hata oluştu" });
  }
};
// //! DELETE PRODUCT İŞLEMLERİ

const deleteProduct = async (req, res) => {
  try {
    //token kontrolü
    const token = req.headers.authorization;
    if (!token) {
      return res
        .status(401)
        .json({ error: "Yetkilendirme başarısız. token bulunamadı." });
    }

    //token doğrulama
    const decodedToken = jwt.verify(token, "jwtSecretKey123456789");
    const userId = decodedToken.userId;

    //Kullanıcı kontrolü
    const user = await User.findByPk(userId);
    if (!user) {
      return res
        .status(401)
        .json({ error: "Yetkilendirme başarısız. Kullanıcı bulunamadı." });
    }
    //Ürün ve fotoğrafları silme işlemi
    await sequelize.transaction(async (t) => {
      const productId = req.params.productId;

      // Ürünü sil
      await Product.destroy({ where: { id: productId }, transaction: t });

      img;
    });
  } catch {}
};

//     // Ürünü ve fotoğrafları silme işlemi
//     await sequelize.transaction(async (t) => {
//       const productId = req.params.productId;

//       // Ürünü sil
//       await Product.destroy({ where: { id: productId }, transaction: t });

//       img.destroy();
//       // // Fotoğrafları sil
//       // await Image.destroy({ where: { productId: productId }, transaction: t });

//       // Diğer tablolardan ürünü sil
//       const subcategory = req.params.subcategory;
//       await sequelize.models[subcategory.toLowerCase()].destroy({
//         where: { productId: productId },
//         transaction: t,
//       });
//     });

//     // Başarılı bir şekilde silindiğinde istemciye başarı mesajı gönderin
//     res.status(200).json({ message: "Ürün başarıyla silindi" });
//   } catch (error) {
//     // Hata oluştuğunda istemciye hata mesajını gönderin
//     console.error("Ürün silinirken bir hata oluştu:", error.message);
//     res.status(500).json({ error: "Ürün silinirken bir hata oluştu" });
//   }
// };

// Kullanımı
// DELETE /products/:subcategory/:productId
// Örneğin, /products/car/1
// router.delete("/products/:subcategory/:productId", deleteProduct);

module.exports = {
  createProduct,
  getUserProduct,
  upload,
  deleteProduct,
};
