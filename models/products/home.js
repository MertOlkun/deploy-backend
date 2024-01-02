// models/home.js
const { Sequelize, sequelize } = require("../index");

const Home = sequelize.define("home", {
  squareMeters: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  room: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  propertyType: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  price: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
});

module.exports = Home;
