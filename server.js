const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const corsOptions = {
  origin: "https://stockchallenge.herokuapp.com/"
};

app.use(cors());
app.use(express.static("public"));

app.get("/", function(req, res,next) {
  res.sendFile("index.html");
});

app.get("/stocks", cors(corsOptions), function(req, res) { // Example, /stocks?symbol=AAPL
  var newRequest = "https://api.stocktwits.com/api/2/streams/symbol/" + req.query.symbol + ".json";

  fetch(newRequest)
		.then(res  => res.json())
		.then(data => res.send(data))
		.catch(err => res.redirect("/error"));
});

var port = process.env.PORT || 3000;

app.listen(port);
