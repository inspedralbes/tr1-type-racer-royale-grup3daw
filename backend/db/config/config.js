
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
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    host: process.env.DB_HOST,
    dialect: "mysql" // Sequelize usará el driver de mysql
  }
};
