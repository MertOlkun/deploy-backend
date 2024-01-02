const Sequelize = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DEV_DB_NAME,
  process.env.DEV_DB_USERNAME,
  process.env.DEV_DB_PASSWORD,
  {
    host: process.env.DEV_DB_HOST,
    dialect: "mysql",
  }
);

module.exports = { Sequelize, sequelize };
