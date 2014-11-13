var db = require('./index');
var Sequelize = db.Sequelize;

var TotalMetric = db.sequelize.define(
  'TotalMetric',
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    key: {
      type: Sequelize.STRING(50),
      allowNull: false
    },
    value: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    sha: {
      type: Sequelize.STRING(40),
      allowNull: false
    },
    commitTime: {
      type: Sequelize.DATE,
      allowNull: false
    },
    createdAt: Sequelize.DATE,
    updatedAt: Sequelize.DATE
  },
  {
    tableName: 'total_metrics'
  }
);

module.exports = TotalMetric;