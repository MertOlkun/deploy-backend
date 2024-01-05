const bcrypt = require("bcrypt");
const mailConfig = require("../config/email.json");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Product = require("../models/product");

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

module.exports = { registerUser, loginUser, forgotPassword, resetPassword };
