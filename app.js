const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const {format, parseISO, isValid} = require('date-fns')

const app = express()

app.use(express.json())

let db = null

const dbPath = path.join(__dirname, 'todoApplication.db')

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const validateDetails = async (request, response, next) => {
  let status1, priority1, category1, date1
  let accessToNext = true

  if (request.method === 'GET') {
    let {status, priority, category, date} = request.query
    status1 = status
    priority1 = priority
    category1 = category
    date1 = date
  } else {
    let {status, priority, category, dueDate} = request.body
    status1 = status
    priority1 = priority
    category1 = category
    date1 = dueDate
  }

  if (status1 !== undefined) {
    const statusBar = ['TO DO', 'IN PROGRESS', 'DONE']
    if (accessToNext) {
      if (statusBar.includes(status1)) {
        accessToNext = true
      } else {
        accessToNext = false
        response.status(400)
        response.send('Invalid Todo Status')
      }
    }
  }

  if (priority1 !== undefined) {
    const priorityBar = ['LOW', 'MEDIUM', 'HIGH']
    if (accessToNext) {
      if (priorityBar.includes(priority1)) {
        accessToNext = true
      } else {
        accessToNext = false
        response.status(400)
        response.send('Invalid Todo Priority')
      }
    }
  }

  if (category1 !== undefined) {
    const categoryBar = ['WORK', 'HOME', 'LEARNING']
    if (accessToNext) {
      if (categoryBar.includes(category1)) {
        accessToNext = true
      } else {
        accessToNext = false
        response.status(400)
        response.send('Invalid Todo Category')
      }
    }
  }

  if (date1 !== undefined) {
    if (accessToNext) {
      const l = (date1.length >= 8 ) | (date1.length <=  10)
      let due_date = new Date(date1)
      due_date = format(due_date, 'yyyy-MM-dd')
      console.log(l) 
      due_date = parseISO(due_date)
      if (isValid(due_date) & l) {
        accessToNext = true
      } else {
        accessToNext = false
        response.status(400)
        response.send('Invalid Due Date')
      }
    }
  }

  if (accessToNext === true) {
    next()
  }
}

const hasTodo = todo => {
  return todo !== undefined
}

const hasStatus = status => {
  return status !== undefined
}

const hasPriority = priority => {
  return priority !== undefined
}

const hasCategory = category => {
  return category !== undefined
}

const hasdueDate = dueDate => {
  return dueDate !== undefined
}

const hasStatusAndPriority = (status, priority) => {
  return (status !== undefined) & (priority !== undefined)
}

const hasStatusAndCategory = (status, category) => {
  return (status !== undefined) & (category !== undefined)
}

const hasPriorityAndCategory = (priority, category) => {
  return (priority !== undefined) & (category !== undefined)
}

//API 1

app.get('/todos/', validateDetails, async (request, response) => {
  const {status, priority, category, search_q = ''} = request.query
  let getQuery
  let result
  switch (true) {
    case hasStatus(status):
      getQuery = `
      SELECT * FROM todo WHERE status="${status}" AND todo LIKE "%${search_q}%";`
      result = await db.all(getQuery)
      response.send(result)
      break
    case hasPriority(priority):
      getQuery = `
      SELECT * FROM todo WHERE priority="${priority}" AND todo LIKE "%${search_q}%";`
      result = await db.all(getQuery)
      response.send(result)
      break
    case hasCategory(category):
      getQuery = `
      SELECT * FROM todo WHERE category="${category}" AND todo LIKE "%${search_q}%";`
      result = await db.all(getQuery)
      response.send(result)
      break
    case hasStatusAndPriority(status, priority):
      getQuery = `
      SELECT * FROM todo WHERE status="${status}" AND priority="${priority}" AND todo LIKE "%${search_q}%";`
      result = await db.all(getQuery)
      response.send(result)
      break
    case hasStatusAndCategory(status, category):
      getQuery = `
      SELECT * FROM todo WHERE status="${status}" AND category="${category}" AND todo LIKE "%${search_q}%";`
      result = await db.all(getQuery)
      response.send(result)
      break
    case hasPriorityAndCategory(priority, category):
      getQuery = `
      SELECT * FROM todo WHERE priority="${priority}" AND category="${category}" AND todo LIKE "%${search_q}%";`
      result = await db.all(getQuery)
      response.send(result)
      break
    default:
      getQuery = `
      SELECT * FROM todo WHERE todo LIKE "%${search_q}%";`
      result = await db.all(getQuery)
      response.send(result)
  }
})

//API 2
app.get('/todos/:todoId/', validateDetails, async (request, response) => {
  const {todoId} = request.params
  const getQuery = `SELECT * FROM todo WHERE id=${todoId};`
  const result = await db.get(getQuery)
  response.send(result)
})

//API 3
app.get('/agenda/', validateDetails, async (request, response) => {
  const {date} = request.query
  let due_date = new Date(date)
  due_date = format(due_date, 'yyyy-MM-dd')
  const getQuery = `
  SELECT * FROM todo WHERE due_date="${due_date}";`
  const result = await db.all(getQuery)
  if(result.due_date !== undefined){
    response.send(result)
  }else{
    response.status(400)
    response.send("Invalid Due Date")
  }
})

//API 4
app.post('/todos/', validateDetails, async (request, response) => {
  const {id, todo, status, priority, category, dueDate} = request.body
  const creteQuery = `
  INSERT INTO todo (id,todo,priority,status,category,due_date) VALUES (${id},"${todo}","${priority}","${status}","${category}","${dueDate}");`
  await db.run(creteQuery)
  response.send('Todo Successfully Added')
})

app.put('/todos/:todoId/', validateDetails, async (request, response) => {
  const {todoId} = request.params
  const {todo, status, priority, category, dueDate} = request.body
  let updateQuery

  switch (true) {
    case hasTodo(todo):
      updateQuery = `
      UPDATE todo SET todo="${todo}" WHERE id=${todoId};`
      await db.run(updateQuery)
      response.send('Todo Updated')
      break
    case hasStatus(status):
      updateQuery = `
      UPDATE todo SET status="${status}" WHERE id=${todoId};`
      await db.run(updateQuery)
      response.send('Status Updated')
      break
    case hasPriority(priority):
      updateQuery = `
      UPDATE todo SET priority="${priority}" WHERE id=${todoId};`
      await db.run(updateQuery)
      response.send('Priority Updated')
      break

    case hasCategory(category):
      updateQuery = `
      UPDATE todo SET category="${category}" WHERE id=${todoId};`
      await db.run(updateQuery)
      response.send('Category Updated')
      break
    case hasdueDate(dueDate):
      updateQuery = `
      UPDATE todo SET due_date="${dueDate}" WHERE id=${todoId};`
      await db.run(updateQuery)
      response.send('Due Date Updated')
      break
  }
})

//API 6
app.delete('/todos/:todoId/', validateDetails, async (request, response) => {
  const {todoId} = request.params
  const deleteQuery = `
  DELETE FROM todo WHERE id=${todoId};`
  await db.run(deleteQuery)
  response.send('Todo Deleted')
})

module.exports = app
