"use strict";

module.exports = {
  up: function(migration, DataTypes, done) {
    migration.createTable('total_metrics', {
	    id: {
	      type: DataTypes.INTEGER,
	      primaryKey: true,
	      autoIncrement: true
	    },
	    key: {
	    	type: DataTypes.STRING(50),
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
	  	migration.addIndex('total_metrics', ['key']);
	  	done();
	  }).error(function () {
	  	done();
	  });
  },

  down: function(migration, DataTypes, done) {
    migration.dropTable('total_metrics');
    done();
  }
};
