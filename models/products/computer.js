// models/computer.js
const { Sequelize, sequelize } = require("../index");

const Computer = sequelize.define("computer", {
  brand: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  model: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  ram: {
    type: Sequelize.TINYINT,
    allowNull: true,
  },
  gpu: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  processor: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  memory: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  price: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
});

module.exports = Computer;
