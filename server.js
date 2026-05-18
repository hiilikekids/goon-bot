const express = require("express");
const client = require("./index.js");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/status", (req, res) => {
  res.json({
    online: true,
    bot: client.user ? client.user.tag : null
  });
});

app.listen(PORT, () => console.log("Backend online on port " + PORT));
