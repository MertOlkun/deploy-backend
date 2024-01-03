const express = require("express");
const cookieParser = require("cookie-parser");
const { sequelize } = require("./models");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const Cors = require("cors");

const app = express();

// Middleware
app.use(Cors());
app.use(express.json());
app.use(cookieParser());

//! Tabloları veritabanına aktaralım.
const User = require("./models/user");
const Car = require("./models/products/car");
const Motorcycle = require("./models/products/motorcycle");
const Phone = require("./models/products/phone");
const Computer = require("./models/products/computer");
const Home = require("./models/products/home");
const Land = require("./models/products/land");
const Product = require("./models/product");
const Images = require("./models/images");

//! Tablolar arası ilişkileri yapalım

function associate() {
  Car.belongsTo(Product);
  Motorcycle.belongsTo(Product);
  Phone.belongsTo(Product);
  Computer.belongsTo(Product);
  Home.belongsTo(Product);
  Land.belongsTo(Product);

  Product.hasOne(Car);
  Product.hasOne(Motorcycle);
  Product.hasOne(Phone);
  Product.hasOne(Computer);
  Product.hasOne(Home);
  Product.hasOne(Land);

  User.hasMany(Product);
  Images.hasMany(Product);
}
associate();

// Listen to server
sequelize.sync().then(() => {
  app.listen(process.env.DEV_DB_PORT || 5000, () => {
    console.log(`Server listening on port ${process.env.DEV_DB_PORT}`);
  });
});

// User routes
app.use("/user", userRoutes);
// Product routes
app.use("/product", productRoutes);
