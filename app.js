const express = require('express')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const app = express()
app.use(express.json())

const db_path = path.join(__dirname, 'covid19IndiaPortal.db')

let db

const initializeAndRunServer = async () => {
  try {
    db = await open({
      filename: db_path,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000')
    })
  } catch (e) {
    console.log(`DB ERROR: ${e.message}`)
  }
}

initializeAndRunServer()

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const userVerificationQuery = `Select * from user Where username = '${username}';`
  const userResponse = await db.get(userVerificationQuery)
  if (userResponse === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    console.log(password, userResponse.password)
    passwordMatched = await bcrypt.compare(password, userResponse.password)
    console.log(passwordMatched)
    if (passwordMatched === true) {
      const payload = {
        username: username,
      }
      const jwttoken = jwt.sign(payload, 'MY_SECRET_Token')
      response.send({jwttoken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

const authenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_Token', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

app.get('/states/', authenticateToken, async (request, response) => {
  const stateQuery = `Select * from state order by state_id`
  let stateRes = await db.all(stateQuery)
  stateRes = stateRes.map(each => {
    return {
      stateId: each.state_id,
      stateName: each.state_name,
      population: each.population,
    }
  })
  response.send(stateRes)
})

app.get('/states/:stateId', authenticateToken, async (request, response) => {
  const {stateId} = request.params
  const getStateDetailsQuery = `SELECT * FROM state WHERE state_id = ${stateId};`
  let stateDetails = await db.get(getStateDetailsQuery)

  stateDetails = {
    stateId: stateDetails.state_id,
    stateName: stateDetails.state_name,
    population: stateDetails.population,
  }

  response.send(stateDetails)
})

app.post('/district/', authenticateToken, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const createDistrictDetailsQuery = `INSERT INTO district (district_name, state_id, cases, cured, active, deaths) VALUES (
    '${districtName}',
    ${stateId},
    ${cases},
    ${cured},
    ${active},
    ${deaths}
  );`
  const dbDistrict = await db.run(createDistrictDetailsQuery)
  console.log(dbDistrict.lastID)
  response.send('District Successfully Added')
})

app.get(
  '/district/:districtId',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const getDistrictDetailsQuery = `SELECT * FROM district WHERE district_id = ${districtId};`
    let districtDetails = await db.get(getDistrictDetailsQuery)

    districtDetails = {
      districtId: districtDetails.district_id,
      districtName: districtDetails.district_name,
      stateId: districtDetails.state_id,
      cases: districtDetails.cases,
      cured: districtDetails.cured,
      active: districtDetails.active,
      deaths: districtDetails.deaths,
    }

    response.send(districtDetails)
  },
)

app.delete(
  '/district/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const getDistrictDetailsQuery = `DELETE FROM district WHERE district_id = ${districtId};`
    const dbres = await db.run(getDistrictDetailsQuery)
    console.log(dbres)

    response.send('District Removed')
  },
)

app.put(
  '/district/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const {districtName, stateId, cases, cured, active, deaths} = request.body
    console.log(districtName, stateId, cases, cured, active, deaths)
    const updateQuery = `
      UPDATE district
      SET 
        district_name = '${districtName}',
        state_id = ${stateId},
        cases = ${cases},
        cured=${cured},
        active = ${active},
        deaths = ${deaths}
      WHERE district_id=${districtId};`
    const updatedQuery = await db.run(updateQuery)
    console.log(updatedQuery)

    response.send('District Details Updated')
  },
)

app.get(
  '/states/:stateId/stats',
  authenticateToken,
  async (request, response) => {
    const {stateId} = request.params
    const getStateDetailsQuery = `
    SELECT 
      sum(district.cases) as totalCases,
      sum(district.cured) as totalCured,
      sum(district.active) as totalActive,
      sum(district.deaths) as totalDeaths
     FROM
      state INNER JOIN district 
    ON 
      state.state_id = district.state_id 
    WHERE 
      state.state_id = ${stateId};`
    let stateDetails = await db.get(getStateDetailsQuery)
    response.send(stateDetails)
  },
)

module.exports = app
