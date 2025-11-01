
require('dotenv').config();

module.exports = {
  development: {
    username: "user_dev",
    password: "password_dev",
    database: "db_dev",
    host: process.env.DB_HOST || 'localhost',
    dialect: "mysql"
  },
  test: {
    username: "user_dev",
    password: "password_dev",
    database: "db_dev",
    host: process.env.DB_HOST || 'localhost',
    dialect: "mysql"
  },
  production: {
    username: "user_dev",
    password: "password_dev",
    database: "db_dev",
    host: process.env.DB_HOST || 'localhost',
    dialect: "mysql"
  }
};
