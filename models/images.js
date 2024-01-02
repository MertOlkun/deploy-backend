// models/images.js
const { sequelize } = require("./index");
const { DataTypes } = require("sequelize");

const Images = sequelize.define("images", {
  img1: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  img2: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  img3: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  img4: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  img5: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = Images;
