const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()

app.use(express.json())

let database = null

let dbPath = path.join(__dirname, 'covid19IndiaPortal.db')

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server running at http://localhost:3000')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

//API 1

const validateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  } else {
    response.status(401)
    response.send('Invalid JWT Token')
  }

  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'R_S_Token', (error, payload) => {
      if (error) {
        response.send(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const loginUser = `SELECT * FROM user WHERE username="${username}";`
  const dbUser = await database.get(loginUser)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const validPassword = await bcrypt.compare(password, dbUser.password)
    if (validPassword) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'R_S_Token')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

//API 2

app.get('/states/', validateToken, async (request, response) => {
  const getstateQuery = `
  SELECT * FROM state ORDER BY state_id;`
  const dbRes = await database.all(getstateQuery)
  const result = dbRes.map(state => {
    return {
      stateId: state.state_id,
      stateName: state.state_name,
      population: state.population,
    }
  })

  response.send(result)
})

//API 3

app.get('/states/:stateId/', validateToken, async (request, response) => {
  const {stateId} = request.params
  const getstateQuery = `
  SELECT * FROM state WHERE state_id=${stateId};`
  const dbstate = await database.get(getstateQuery)
  const result = {
    stateId: dbstate.state_id,
    stateName: dbstate.state_name,
    population: dbstate.population,
  }
  response.send(result)
})

//API 4
app.post('/districts/', validateToken, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body

  const createDistrict = `
  INSERT INTO district (district_name, state_id, cases, cured, active, deaths) VALUES 
  ("${districtName}", ${stateId},${cases},${cured},${active},${deaths});`
  const res = await database.run(createDistrict)
  console.log(res)
  response.send('District Successfully Added')
})

//API 5
app.get('/districts/:districtId', validateToken, async (request, response) => {
  const {districtId} = request.params

  const getDistrictDetails = `SELECT * FROM district WHERE district_id = ${districtId};`
  const dbRes = await database.get(getDistrictDetails)
  const result = {
    districtName: dbRes.district_name,
    stateId: dbRes.state_id,
    cases: dbRes.cases,
    cured: dbRes.cured,
    active: dbRes.active,
    deaths: dbRes.deaths,
  }

  response.send(result)
})

//API 6
app.delete(
  '/districts/:districtId/',
  validateToken,
  async (request, response) => {
    const {districtId} = request.params

    const getDistrictDetails = `DELETE FROM district WHERE district_id = ${districtId};`
    const result = await database.run(getDistrictDetails)
    response.send('District Removed')
  },
)

//API 7
app.put('/districts/:districtId', validateToken, async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body

  const getDistrictDetails = `
  UPDATE district SET 
  
    district_name = "${districtName}",
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}   
  
  WHERE 
  district_id = ${districtId};`
  const result = await database.run(getDistrictDetails)
  response.send('District Details Updated')
})

//API 8

app.get('/states/:stateId/stats/', validateToken, async (request, response) => {
  const {stateId} = request.params
  const getstateQuery = `
  SELECT 

  SUM(cases) as totalCases,
  SUM(cured) as totalCured,
  SUM(active) as totalActive,
  SUM(deaths) as totalDeaths
  
  FROM state INNER JOIN district ON state.state_id=district.state_id
  WHERE state.state_id=${stateId};`
  const result = await database.get(getstateQuery)
  response.send(result)
})

module.exports = app
