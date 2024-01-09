const bcrypt = require("bcrypt");
const mailConfig = require("../config/email.json");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Product = require("../models/product");
const Images = require("../models/images");
const fs = require("fs").promises;
const path = require("path");
const { sequelize } = require("../models/index");
//! BURASI REGISTER BÖLÜMÜ
async function registerUser(req, res) {
  const { username, email, phoneNumber, password, confirmPassword } = req.body;
  // Şifre kontrolü
  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Şifreler eşleşmiyor." });
  }

  try {
    // Kullanıcıyı veritabanına kaydet
    const salt = bcrypt.genSaltSync(5);
    const hashPassword = bcrypt.hashSync(password, salt);

    await User.create({ username, email, phoneNumber, hashPassword });

    // Başarıyla kaydedildiğine dair cevap gönder
    res.status(201).json({ message: "Kullanıcı başarıyla kaydedildi." });
  } catch (error) {
    res.status(500).json({
      error: `Kullanıcı kaydedilirken bir hata oluştu: ${error.message}`,
    });
  }
}

//! BURASI LOGIN BÖLÜMÜ

async function loginUser(req, res) {
  const { email, password } = req.body;

  try {
    // Kullanıcı bulunmazsa hata döndür
    const user = await User.findOne({ where: { email } });

    // Kullanıcı bulunamazsa dönecek hata mesajı
    if (!user) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı." });
    }

    const passwordMatch = await bcrypt.compare(password, user.hashPassword);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Geçersiz şifre." });
    }

    // JWT oluşturmak
    const token = jwt.sign({ userId: user.id }, "jwtSecretKey123456789", {
      expiresIn: "1d",
    });

    // Girişin başarılı olması durumunsda gönderilecek mesaj
    res.json({ message: "Başarıyla giriş yapıldı", token });
  } catch (error) {
    // Hata durumunda gönderilecek mesaj
    res.status(500).json({ error: "Giriş yapılırken bir hata oluştu." });
  }
}

//! BURASI FORGOT-PASSWORD KISMI
async function forgotPassword(req, res) {
  const { email } = req.body;

  try {
    // Kullanıcıyı veritabanında bulun
    const user = await User.findOne({ where: { email } });

    // Kullanıcı bulunamazsa hata döndür
    if (!user) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı." });
    }
    // Şifre sıfırlama token'ını oluşturun
    const resetToken = jwt.sign(
      { userId: user.id },
      "resetSecretKey123456789",
      { expiresIn: "1h" }
    );

    // E-posta gönderme işlemi
    const transporter = nodemailer.createTransport({
      service: "outlook",
      auth: {
        user: mailConfig.mail.email,
        pass: mailConfig.mail.password,
      },
    });

    const mailOptions = {
      from: mailConfig.mail.email,
      to: user.email,
      subject: "Şifre Sıfırlama",
      text: `Şifrenizi sıfırlamak için bağlantı: https://mysql-emporium-deploy1.onrender.com/user/reset-password/${resetToken}`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        return res.status(500).json({
          error: "Şifre sıfırlama e-postası gönderilirken bir hata oluştu.",
        });
      } else {
        console.log("Email sent: " + info.response);
        return res
          .status(200)
          .json({ message: "Şifre sıfırlama bağlantısı gönderildi" });
      }
    });
  } catch (error) {
    res.status(500).json({
      error: `Şifre sıfırlama işlemi sırasında bir hata oluştu: ${error.message}`,
    });
  }
}

//! BURASI RESET-PASSWORD KISMI
async function resetPassword(req, res) {
  const { newPassword, newPassword2 } = req.body;
  const resetToken = req.params.resetToken; // URL'den token'i al

  try {
    if (newPassword == newPassword2) {
      // Token'ı doğrula ve kullanıcıyı bul
      const decodedToken = jwt.verify(resetToken, "resetSecretKey123456789");
      const userId = decodedToken.userId;

      const user = await User.findOne({ userId });

      // Kullanıcı bulunamazsa veya token süresi dolmuşsa hata döndür
      if (!user) {
        return res
          .status(400)
          .json({ error: "Geçersiz veya süresi dolmuş token." });
      }

      // Yeni şifreyi hashle ve kullanıcı bilgilerini güncelle
      const salt = bcrypt.genSaltSync(5);
      const hashedPassword = bcrypt.hashSync(newPassword, salt);
      user.hashPassword = hashedPassword;
      await user.save();
    }

    // Başarılı bir şekilde şifre sıfırlandı mesajını döndür
    return res.status(200).json({ message: "Şifre başarıyla sıfırlandı." });
  } catch (error) {
    return res.status(500).json({
      error: `Şifre sıfırlama işlemi sırasında bir hata oluştu: ${error.message}`,
    });
  }
}
//! BURASI GET-USER KISMI
const getUserInfo = async (req, res) => {
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

    // Kullanıcı bilgilerini User tablosundan getir
    const userInfo = await User.findByPk(userId);

    if (!userInfo) {
      // Kullanıcı bulunamazsa null veya boş bir nesne döndürebilirsiniz
      return null;
    }

    // Kullanıcı bilgilerini istediğiniz şekilde düzenleyebilirsiniz
    const UserInfo = {
      id: userInfo.id,
      username: userInfo.username,
      email: userInfo.email,
      phoneNumber: userInfo.phoneNumber,
      createdAt: userInfo.createdAt,
      // Diğer alanları ekleyebilirsiniz
    };

    // Başarılı bir şekilde silindiğinde istemciye başarı mesajı gönderin
    res.status(200).json({ UserInfo });
  } catch (error) {
    // Hata oluştuğunda istemciye hata mesajını gönderin
    console.error(
      "Kullanıcı verilerini aktarma sırasında bir hata oluştu:",
      error.message
    );
    res.status(500).json({
      error: "Kullanıcı verilerini aktarma sırasında bir hata oluştu",
    });
  }
};

//! BURASI UPDATE-USER KISMI
const updateUser = async (req, res) => {
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

    // Sadece izin verilen alanları seç
    const validUpdateFields = ["username", "email", "phoneNumber"];
    const updateData = {};

    validUpdateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    dataValues;

    // Kullanıcı bilgilerini güncelle
    const [updatedRowCount, updatedUsers] = await User.update(updateData, {
      where: { id: userId },
      returning: true, // Güncellenmiş bilgileri döndür
    });

    if (updatedRowCount === 0 || !updatedUsers || updatedUsers.length === 0) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı." });
    }

    // Güncellenmiş kullanıcı bilgilerini döndür
    const updatedUser = updatedUsers[0].dataValues;
    const updatedUserInfoResponse = {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber,
      // Diğer alanları ekleyebilirsiniz
    };

    // Başarılı bir şekilde güncellendiğinde istemciye güncellenmiş bilgileri gönderin
    res.status(200).json({ updatedUserInfo: updatedUserInfoResponse });
  } catch (error) {
    // Hata oluştuğunda istemciye hata mesajını gönderin
    console.error(
      "Kullanıcı bilgilerini güncelleme sırasında bir hata oluştu:",
      error.message
    );
    res.status(500).json({
      error: "Kullanıcı bilgilerini güncelleme sırasında bir hata oluştu",
    });
  }
};

//! BURASI DELETE-USER KISMI
const deleteUser = async (req, res) => {
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

    // Kullanıcının ürün ID'lerini bir diziye çıkar
    const userProductIds = userProduct.map((product) => product.id);

    console.log(userProductIds);

    // Ürün ve fotoğrafları silme işlemi
    await sequelize.transaction(async (t) => {
      for (const productId of userProductIds) {
        // Product tablosundan silinecek ürünün imageId değerini al
        const deletedProduct = await Product.findByPk(productId, {
          attributes: ["imageId"],
          transaction: t,
        });

        const imageId = deletedProduct ? deletedProduct.imageId : null;

        // Diğer tablolardan ürünü sil
        const subcategory = userProduct.find(
          (product) => product.id === productId
        )?.subcategory;

        if (subcategory) {
          await sequelize.models[subcategory].destroy({
            where: { productId: productId },
            transaction: t,
          });
        }

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
              const imagePath = path.join(__dirname, "../images", imageName);

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
                  console.log(`"${imageName}" dosyaları başarıyla silindi.`);
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
      }

      // Kullanıcıyı User tablosundan sil
      await User.destroy({
        where: { id: userId },
        transaction: t,
      });
    });

    // Başarılı bir şekilde silindiğinde istemciye başarı mesajı gönderin
    res.status(200).json({ message: "Kullanıcı başarıyla silindi" });
  } catch (error) {
    // Hata oluştuğunda istemciye hata mesajını gönderin
    console.error("Kullanıcı silme sırasında bir hata oluştu:", error.message);
    res
      .status(500)
      .json({ error: "Kullanıcı silme sırasında bir hata oluştu" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  deleteUser,
  getUserInfo,
  updateUser,
};
