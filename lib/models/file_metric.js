var db = require('./index');
var Sequelize = db.Sequelize;

var FileMetric = db.sequelize.define(
  'FileMetric',
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
    filePath: {
      type: Sequelize.STRING(100),
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
    tableName: 'file_metrics',
    classMethods: {
      STATES: {
        'TRACKED': 'T',
        'ADDED': 'A',
        'MODIFIED': 'M',
        'DELETED': 'D'
      },

      findMostRecent: function(beforeTime) { 
        var where = '(key, "filePath", "commitTime") in (select key, "filePath", max("commitTime") from file_metrics ';
        if (beforeTime) {
          where += 'where "commitTime" < ? ';
        }
        where += 'group by key, "filePath")';
        return this.findAll({ where: [ where, beforeTime ]});
      }
    }
  }
);

module.exports = FileMetric;