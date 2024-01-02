// models/products.js
const { Sequelize, sequelize } = require("./index");

const Product = sequelize.define("product", {
  productTitle: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  productName: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  description: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
  category: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  subcategory: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  province: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  district: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  neighbourhood: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});

module.exports = Product;
