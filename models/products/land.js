// models/land.js
const { Sequelize, sequelize } = require("../index");

const Land = sequelize.define("land", {
  propertyType: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  squareMeters: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  price: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
});

module.exports = Land;
