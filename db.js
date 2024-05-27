var mongoose = require('mongoose');

mongoose.connect('mongodb+srv://hungleminh371:Minhhung070210@cluster0.79qygga.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true })

mongoose.connection.on('connected', function () {
  console.log('Mongoose default connection open');
});

mongoose.connection.on('error', function (err) {
  console.log('Mongoose default connection error: ' + err);
});

mongoose.connection.on('disconnected', function () {
  console.log('Mongoose default connection disconnected');
});

process.on('SIGINT', function () {
  mongoose.connection.close(function () {
    console.log('Mongoose default connection disconnected through app termination');
    process.exit(0);
  });
}); 