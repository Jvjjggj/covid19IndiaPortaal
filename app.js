const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
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

const logger = (request, response, next) => {
  const header = request.headers["authorization"];
  let jwtoken;
  if (header !== undefined) {
    jwtoken = header.split(" ")[1];
  }
  if (jwtoken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtoken, "MY_KEY", async (error, user) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

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
    } else {
      const payload = username;
      const jwtToken = jwt.sign(payload, "MY_KEY");
      response.send({ jwtToken });
    }
  }
});

// GET states API

const stateFormat = (i) => {
  return {
    stateId: i.state_id,
    stateName: i.state_name,
    population: i.population,
  };
};

const districtFormat = (i) => {
  return {
    districtId: i.district_id,
    districtName: i.district_name,
    stateId: i.state_id,
    cases: i.cases,
    active: i.active,
    deaths: i.deaths,
  };
};

app.get("/states/", logger, async (request, response) => {
  const query = `
    select * from 
       state`;

  const dbresponse = await db.all(query);
  let lst = [];
  for (let i of dbresponse) {
    const format = stateFormat(i);
    lst.push(format);
  }
  response.send(lst);
});

// GET state with Id

app.get("/states/:stateId/", logger, async (request, response) => {
  const { stateId } = request.params;
  const query = `
  select * from state 
  where 
     state_id=${stateId};`;
  const dbresponse = await db.get(query);
  const format = stateFormat(dbresponse);
  response.send(format);
});

// API create a district in a district table

app.post("/districts/", logger, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const query = `
  insert into district
    (district_name,state_id,cases,cured,active,deaths)
   values
     ("${districtName}",${stateId},${cases},${cured},${active},${deaths});`;
  const dbreesponse = await db.run(query);
  response.send("District Successfully Added");
});

// API for getting district with districtId
app.get("/districts/:districtId/", logger, async (request, response) => {
  const { districtId } = request.params;
  const query = `
  select * from district
  where district_id=${districtId};`;

  const dbresponse = await db.get(query);
  const format = districtFormat(dbresponse);
  response.send(format);
});

// API delete district with respective districtID

app.delete("/districts/:districtId/", logger, async (request, response) => {
  const { districtId } = request.params;
  const query = `
  delete from district
  where 
     district_id=${districtId};`;
  const dbresponse = await db.run(query);
  response.send("District Removed");
});

// API update the district details

app.put("/districts/:districtId/", logger, async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const query = `
  update 
     district
   set district_name="${districtName}",
        state_id=${stateId},
        cases=${cases},
        cured=${cured},
        active=${active},
        deaths=${deaths}
    where 
       district_id=${districtId};`;

  const dbrresponse = await db.run(query);
  response.send("District Details Updated");
});

// API statics of state with stateId

app.get("/states/:stateId/stats/", logger, async (request, response) => {
  const { stateId } = request.params;
  const query = `
  select 
     sum(cases) as totalCases,
     sum(cured) as totalCured,
     sum(active) as totalActive,
     sum(deaths) as totalDeaths
  from 
     district 
  where 
     state_id=${stateId};`;
  const dbresponse = await db.all(query);
  response.send(...dbresponse);
});

module.exports = app;
