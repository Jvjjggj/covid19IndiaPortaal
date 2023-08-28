const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
app.use(express.json());
const bcrypt = require("bcrypt");
const path = require("path");
const filePath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;
const connectSeverDb = async () => {
  try {
    db = await open({
      filename: filePath,
      driver: sqlite3.Database,
    });
    app.listen(3010, () => {
      console.log(`Server is running`);
    });
  } catch (error) {
    console.log(error.getMessage());
  }
};

connectSeverDb();

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const query = `
  select * from
     user 
  where 
     username="${username}";`;

  const dbresponse = await db.get(query);
  if (dbresponse === undefined) {
    //user not found
    response.status(400);
    response.send("Invalid user");
  } else {
    const ispasssword = await bcrypt.compare(password, dbresponse.password);
    if (ispasssword === false) {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
