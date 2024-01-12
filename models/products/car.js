// models/car.js
const { Sequelize, sequelize } = require("../index");

const Car = sequelize.define("car", {
  brand: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  series: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  color: {
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

module.exports = Car;
