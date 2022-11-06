//environment variables
require("dotenv").config();

//node + express
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

//set proxy
app.set("trust proxy", 1);

//routes
app.use("/scms/", require("./scms/scms"));

app.get("*", (req, res) => res.sendStatus(404));
app.listen(port, () => console.log("on port " + port));