"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {
    migration.createTable('file_metrics', {
	    id: {
	      type: DataTypes.INTEGER,
	      primaryKey: true,
	      autoIncrement: true
	    },
	    key: {
	    	type: DataTypes.STRING(50),
	    	allowNull: false
	    },
	    filePath: {
	    	type: DataTypes.STRING(100),
	    	allowNull: false
	    },
	    value: {
	    	type: DataTypes.INTEGER,
	    	allowNull: false
	    },
	    sha: {
	    	type: DataTypes.STRING(40),
	    	allowNull: false
	    },
	    commitTime: {
	    	type: DataTypes.DATE,
	    	allowNull: false
	    },
	    createdAt: DataTypes.DATE,
	    updatedAt: DataTypes.DATE
	  }).success(function () {
	  	migration.addIndex('file_metrics', ['key']);
	  }).success(function () {
	  	migration.addIndex('file_metrics', ['filePath']);
	  }).success(function () {
	  	migration.addIndex('file_metrics', ['key', 'filePath']);
	  	done();
	  }).error(function () {
	  	done();
	  });
  },

  down: function(migration, DataTypes, done) {
    migration.dropTable('file_metrics');
    done();
  }
};
