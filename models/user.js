// models/user.js
const { Sequelize, sequelize } = require("./index");

const User = sequelize.define("user", {
  username: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  phoneNumber: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  hashPassword: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});

module.exports = User;
