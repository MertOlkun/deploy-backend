// models/phone.js
const { Sequelize, sequelize } = require("../index");

const Phone = sequelize.define("phone", {
  brand: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  model: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  color: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  ram: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  processor: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  memory: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  price: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
});

module.exports = Phone;
