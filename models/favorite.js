const { DataTypes } = require("sequelize");
const { sequelize } = require("./index");

const Favorite = sequelize.define("favorite", {});
module.exports = Favorite;
