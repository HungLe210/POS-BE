require('dotenv').config({ path: __dirname + "/.env" });
const express = require("express");
//express support creating new website
const app = express();
//handle HTTP request
const bodyParser = require("body-parser");
const cors = require("cors");
app.use(express.static(__dirname + "/uploaded"));


//manage CORS -- Cross-Origin Resource Sharing -> Easier when building API

require("./db");
const Users = require("./models/user_schema");




app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/api/v1", require("./api"))


const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log("Server is running... on port " + port);
});