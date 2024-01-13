// models/motorcycle.js
const { Sequelize, sequelize } = require("../index");

const Motorcycle = sequelize.define("motorcycle", {
  brand: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  color: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  series: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  gear: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  price: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});

module.exports = Motorcycle;
