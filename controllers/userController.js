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
const Favorite = require("../models/favorite");

//! REGISTER OPERATIONS
async function registerUser(req, res) {
  const { username, email, phoneNumber, password, confirmPassword } = req.body;
  // Password check
  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }

  try {
    // Save the user to the database
    const salt = bcrypt.genSaltSync(5);
    const hashPassword = bcrypt.hashSync(password, salt);

    await User.create({ username, email, phoneNumber, hashPassword });

    // Send response indicating successful registration
    res.status(201).json({ message: "User successfully registered." });
  } catch (error) {
    res.status(500).json({
      error: `An error occurred while registering the user: ${error.message}`,
    });
  }
}

//! LOGIN OPERATIONS
async function loginUser(req, res) {
  const { email, password } = req.body;

  try {
    // Return an error if the user is not found
    const user = await User.findOne({ where: { email } });

    // Error message to return if the user is not found
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const passwordMatch = await bcrypt.compare(password, user.hashPassword);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid password." });
    }

    // Create JWT
    const token = jwt.sign({ userId: user.id }, "jwtSecretKey123456789", {
      expiresIn: "1d",
    });

    // Message to send in case of successful login
    res.json({ message: "Login successful", token });
  } catch (error) {
    // Message to send in case of an error
    res.status(500).json({ error: "An error occurred during login." });
  }
}

//! FORGOT-PASSWORD OPERATIONS
async function forgotPassword(req, res) {
  const { email } = req.body;

  try {
    // Find the user in the database
    const user = await User.findOne({ where: { email } });

    // Return an error if the user is not found
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Create the password reset token
    const resetToken = jwt.sign(
      { userId: user.id },
      "resetSecretKey123456789",
      { expiresIn: "1h" }
    );

    // Sending the email
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
      subject: "Password Reset",
      text: `To reset your password, click on the link: https://www.emporium-web.online/sifremiunuttum/sifre-degistirme/${resetToken}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        return res.status(500).json({
          error: "An error occurred while sending the password reset email.",
        });
      } else {
        console.log("Email sent: " + info.response);
        return res.status(200).json({
          message: `Password reset link has been sent.${resetToken} `,
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      error: `An error occurred during the password reset process: ${error.message}`,
    });
  }
}

//! RESET-PASSWORD OPERATIONS
async function resetPassword(req, res) {
  const { newPassword, newPassword2 } = req.body;
  const resetToken = req.params.resetToken; // Get the token from the URL

  try {
    if (newPassword == newPassword2) {
      // Verify the token and find the user
      const decodedToken = jwt.verify(resetToken, "resetSecretKey123456789");
      const userId = decodedToken.userId;

      const user = await User.findOne({ userId });

      // If the user is not found or the token has expired, return an error
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired token." });
      }

      // Hash the new password and update the user information
      const salt = bcrypt.genSaltSync(5);
      const hashedPassword = bcrypt.hashSync(newPassword, salt);
      user.hashPassword = hashedPassword;
      await user.save();
    }

    // Return a success message when the password is successfully reset
    return res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    return res.status(500).json({
      error: `An error occurred during the password reset process: ${error.message}`,
    });
  }
}

//! GET-USER OPERATIONS
const getUserInfo = async (req, res) => {
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

    // Retrieve user information from the User table
    const userInfo = await User.findByPk(userId);

    if (!userInfo) {
      // Return null or an empty object if the user is not found
      return null;
    }

    const favorites = await Favorite.findAll({
      attributes: ["productId"],
      where: { userId: userId },
    });

    // You can format the user information as desired
    const UserInfo = {
      id: userInfo.id,
      username: userInfo.username,
      email: userInfo.email,
      phoneNumber: userInfo.phoneNumber,
      createdAt: userInfo.createdAt,
      favorites,
    };

    // Send a success message to the client when successfully retrieved
    res.status(200).json({ userinfo: UserInfo });
  } catch (error) {
    // Send an error message to the client if an error occurs
    console.error(
      "An error occurred while transferring user data:",
      error.message
    );
    res.status(500).json({
      error: "An error occurred while transferring user data",
    });
  }
};

//! UPDATE-USER OPERATIONS
const updateUser = async (req, res) => {
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

    // Select only allowed fields
    const validUpdateFields = ["username", "email", "phoneNumber"];
    const updateData = {};

    validUpdateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Update user information
    const [updatedRowCount] = await User.update(updateData, {
      where: { id: userId },
    });

    if (updatedRowCount === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    // Retrieve updated user information
    const updatedUser = await User.findOne({ where: { id: userId } });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const updatedUserInfoResponse = {
      username: updatedUser.username,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber,
    };

    // Send the updated information to the client when successfully updated
    res.status(200).json({
      updatedUserInfo: "User information updated",
      updatedUserInfoResponse,
    });
  } catch (error) {
    // Send an error message to the client if an error occurs
    console.error(
      "An error occurred while updating user information:",
      error.message
    );
    res.status(500).json({
      error: "An error occurred while updating user information",
    });
  }
};

//! DELETE-USER OPERATIONS
const deleteUser = async (req, res) => {
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

    // Find user products in the database
    const userProduct = await Product.findAll({
      where: { userId: userId },
    });

    // Extract product IDs of the user to an array
    const userProductIds = userProduct.map((product) => product.id);

    // Deletion process for products and images
    await sequelize.transaction(async (t) => {
      for (const productId of userProductIds) {
        // Get the imageId value of the product to be deleted from the Product table
        const deletedProduct = await Product.findByPk(productId, {
          attributes: ["imageId"],
          transaction: t,
        });

        const imageId = deletedProduct ? deletedProduct.imageId : null;

        // Delete the product from other tables
        const subcategory = userProduct.find(
          (product) => product.id === productId
        )?.subcategory;

        if (subcategory) {
          await sequelize.models[subcategory].destroy({
            where: { productId: productId },
            transaction: t,
          });
        }

        // Delete the product
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

        // Delete files in the Images folder
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
                  console.log(`"${imageName}" files deleted successfully.`);
                }
              } catch (error) {
                console.error(
                  `Error occurred while deleting "${imageName}" file:`,
                  error.message
                );
              }
            })
        );

        // If imageId exists and there is a record with this value in the Images table, delete it
        if (imageId !== null) {
          await Images.destroy({
            where: { id: imageId },
            transaction: t,
          });
        }
      }

      // Delete the user from the User table
      await User.destroy({
        where: { id: userId },
        transaction: t,
      });
    });

    // Send a success message to the client when successfully deleted
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    // Send an error message to the client if an error occurs
    console.error("An error occurred while deleting the user:", error.message);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the user" });
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
