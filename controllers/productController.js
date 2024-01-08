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

  console.log(req.body, req.files);

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
    res.status(201).json({ message: `Ürün başarıyla eklendi` });
  } catch (error) {
    // Hata oluştuğunda istemciye hata mesajını gönderin
    console.error("Ürün eklenirken bir hata oluştu:", error.message);
    res.status(500).json({ error: "Ürün eklenirken bir hata oluştu" });
  }
};

//! GET USER PRODUCT İŞLEMLERİ
// app.use(`/photo:${}`, express.static(path.join(__dirname, "images")));

const getUserProduct = async (req, res) => {
  try {
    // Kullanıcının gönderdiği token'ı al
    const token = req.headers.authorization;
    if (!token) {
      // Eğer token yoksa yetkilendirme hatası döndür
      return res
        .status(401)
        .json({ error: "Yetkilendirme başarısız. Token bulunamadı." });
    }

    // Token'ı doğrula ve kullanıcı ID'sini çıkar
    const decodedToken = jwt.verify(token, "jwtSecretKey123456789");
    const userId = decodedToken.userId;

    // Kullanıcıyı veritabanında bul
    const user = await User.findByPk(userId);
    if (!user) {
      // Eğer kullanıcı bulunamazsa yetkilendirme hatası döndür
      return res
        .status(401)
        .json({ error: "Yetkilendirme başarısız. Kullanıcı bulunamadı." });
    }

    // Kullanıcının ürünlerini veritabanında bul
    const userProduct = await Product.findAll({
      where: { userId: userId },
    });

    // Kullanıcının ürün ID'lerini bir diziye çıkar
    const userProductIds = userProduct.map((product) => product.id);
    // Kullanıcının ürün alt kategorilerini bir diziye çıkar
    const userProductSubcategories = userProduct.map(
      (product) => product.subcategory
    );

    // Alt kategorilerden benzersiz olanları al
    const uniqueSubcategories = [...new Set(userProductSubcategories)];

    // Sonuçları tutacak bir nesne oluştur
    const result = {};
    for (const subcategory of uniqueSubcategories) {
      const model = sequelize.models[subcategory];
      if (model) {
        // Her alt kategori için ilgili modelden ürünleri bul
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

    // Resimleri nesne olarak bir değişkene atama
    const imageMap = {};
    pht.forEach((img) => {
      // Eğer resimde hiçbir img değeri null değilse, yani içi dolu bir resimse
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

    // const enKucuk = Math.min(...userImagesId);
    // const enBuyuk = Math.max(...userImagesId);

    // for (i = enKucuk; i < enBuyuk + 1; i++) {
    //   for (let index = 0; index < 6; index++) {}
    // }
    // console.log(y);
    // userProduct ve result'u eşleşen ürün ID'leri için birleştir
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

    // Sonuçları istemciye gönder
    res.status(201).json({ mergedResult: finalResult, photo: imageMap });
  } catch (error) {
    // Hata oluştuğunda istemciye hata mesajını gönder
    console.error("Ürün gösterilirken bir hata oluştu:", error.message);
    res.status(500).json({ error: "Ürün gösterilirken bir hata oluştu" });
  }
};

//! DELETE PRODUCT İŞLEMLERİ

const deleteProduct = async (req, res) => {
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

    // Kullanıcının ürünlerini veritabanında bul
    const userProduct = await Product.findAll({
      where: { userId: userId },
    });

    // Kullanıcının ürün ID'si
    const productId = req.params.productId;

    // Kullanıcının ürün ID'lerini bir diziye çıkar
    const userProductIds = userProduct.map((product) => product.id);

    // Eğer kullanıcı kendi ürününü siliyorsa devam et, değilse hata döndür
    if (!userProductIds.includes(parseInt(productId))) {
      res.status(403).json({ error: "Ürün bulunamadı veya size ait değil." });
      return;
    }

    // Ürün ve fotoğrafları silme işlemi
    await sequelize.transaction(async (t) => {
      // Product tablosundan silinen ürünün imageId değerini al
      const deletedProduct = await Product.findByPk(productId, {
        attributes: ["imageId"],
        transaction: t,
      });

      const imageId = deletedProduct ? deletedProduct.imageId : null;

      // Diğer tablolardan ürünü sil
      const subcategory = req.params.subcategory;
      await sequelize.models[subcategory.toLowerCase()].destroy({
        where: { productId: productId },
        transaction: t,
      });

      // Ürünü sil
      await Product.destroy({
        where: { id: productId },
        transaction: t,
      });

      const imageDelete = await Images.findByPk(imageId, { transaction: t });

      let img1 = imageDelete ? imageDelete.dataValues.img1 : null;
      let img2 = imageDelete ? imageDelete.dataValues.img2 : null;
      let img3 = imageDelete ? imageDelete.dataValues.img3 : null;
      let img4 = imageDelete ? imageDelete.dataValues.img4 : null;
      let img5 = imageDelete ? imageDelete.dataValues.img5 : null;

      // Images klasöründeki dosyaları sil
      await Promise.all(
        [img1, img2, img3, img4, img5]
          .filter(Boolean)
          .map(async (imageName) => {
            const imagePath = path.join(__dirname, "images", imageName);

            console.log(typeof imagePath);

            try {
              // İlgili dosyanın varlığını kontrol et
              const fileExists = await fs
                .access(imagePath)
                .then(() => true)
                .catch(() => false);

              if (fileExists) {
                // Dosyayı sil
                await fs.unlink(imagePath);
                console.log(`"${imageName}" dosyası başarıyla silindi.`);
              }
            } catch (error) {
              console.error(
                `"${imageName}" dosyasını silerken hata oluştu:`,
                error.message
              );
            }
          })
      );

      // Eğer imageId değeri varsa ve Images tablosunda bu değere sahip bir kayıt varsa sil
      if (imageId !== null) {
        await Images.destroy({
          where: { id: imageId },
          transaction: t,
        });
      }
    });

    // Başarılı bir şekilde silindiğinde istemciye başarı mesajı gönderin
    res.status(200).json({ message: "Ürün başarıyla silindi" });
  } catch (error) {
    // Hata oluştuğunda istemciye hata mesajını gönderin
    console.error("Ürün silinirken bir hata oluştu:", error.message);
    res.status(500).json({ error: "Ürün silinirken bir hata oluştu" });
  }
};

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
