const express = require("express");
const client = require("./index.js"); // your bot file
const app = express();
const PORT = 3000;

app.get("/status", (req, res) => {
  res.json({ online: true, bot: client.user ? client.user.tag : null });
});

app.listen(PORT, () => console.log("Website backend online on port " + PORT));
