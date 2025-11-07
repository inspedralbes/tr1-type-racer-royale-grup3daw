'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'avatar', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'nave',
    });
    await queryInterface.addColumn('Users', 'color', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'Azul',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'avatar');
    await queryInterface.removeColumn('Users', 'color');
  }
};
