const { ObjectId } = require('mongodb');
const MongoClient = require( 'mongodb' ).MongoClient;
const url = "mongodb://localhost:27017";
var db;

module.exports = {

  connectToServer: function( callback ) {
    MongoClient.connect( url,  { useNewUrlParser: true }, function( err, client ) {
      db  = client.db('project');
      return callback( err );
    } );
  },

  getDb: function() {
    return db;
  },

  getObjectId: function(){
      return ObjectId;
  }
};

