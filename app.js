const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const {format} = require('date-fns')
const {isValid} = require('date-fns')

const app = express()
app.use(express.json())

let dataBase = null

let DatabasePath = path.join(__dirname, 'todoApplication.db')

const initializeDbAndServer = async () => {
  try {
    dataBase = await open({
      filename: DatabasePath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000')
    })
  } catch (e) {
    console.log(e.message)
  }
}

initializeDbAndServer()

const validateDetails = async (request, response, next) => {
  let category1, priority1, status1, dueDate1

  console.log(request.method)
  console.log(request.method != 'GET' && request.method != 'DELETE')
  if (request.method != 'GET' && request.method != 'DELETE') {
    let {category, priority, status, dueDate} = request.body
    category1 = category
    priority1 = priority
    status1 = status
    dueDate1 = dueDate
  } else {
    let {category, priority, status, date} = request.query
    category1 = category
    priority1 = priority
    status1 = status
    dueDate1 = date
  }

  console.log(category1, priority1, status1, dueDate1)
  if (category1 != undefined) {
    const categoryBar = ['WORK', 'HOME', 'LEARNING']
    if (categoryBar.includes(category1)) {
      console.log(category1)
    } else {
      response.status(400)
      response.send('Invalid Todo Category')
      return
    }
  }

  if (status1 != undefined) {
    const statusBar = ['TO DO', 'IN PROGRESS', 'DONE']
    if (statusBar.includes(status1)) {
      console.log(status1)
    } else {
      response.status(400)
      response.send('Invalid Todo Status')
      return
    }
  }

  if (priority1 != undefined) {
    const priorityBar = ['HIGH', 'MEDIUM', 'LOW']
    if (priorityBar.includes(priority1)) {
      console.log(priority1)
    } else {
      response.status(400)
      response.send('Invalid Todo Priority')
      return
    }
  }

  if (dueDate1 != undefined) {
    let due_date = format(new Date(dueDate1), 'yyyy-MM-dd')
    console.log(due_date)

    let date1 = new Date(due_date)
    console.log(date1)
    date1 = new Date(
      `${date1.getFullYear()}-${date1.getMonth() + 1}-${date1.getDate()}`,
    )

    console.log(date1)

    console.log(isValid(date1))

    if (isValid(date1)) {
      console.log(`valid due_date: ${dueDate1}`)
      request.dueDate = due_date
    } else {
      response.status(400)
      response.send('Invalid Todo Due Date')
      return
    }
  }

  next()
}

const hasStatus = status => {
  return status != undefined
}

const hasPriority = priority => {
  return priority != undefined
}

const hasCategory = category => {
  return category != undefined
}

const hasTodo = todo => {
  return todo != undefined
}

const hasDueDate = dueDate => {
  return dueDate != undefined
}

const hasPriorityAndStatus = (priority, status) => {
  return (priority != undefined) & (status != undefined)
}
const hasStatusAndCategory = (status, category) => {
  return (category != undefined) & (status != undefined)
}
const hasCategoryAndPriority = (category, priority) => {
  return (priority != undefined) & (category != undefined)
}

app.get('/todos/', validateDetails, async (request, response) => {
  let getQuery
  const {search_q = '', priority, category, status} = request.query

  switch (true) {
    case hasStatus(status):
      getQuery = `
      SELECT * FROM todo WHERE status = "${status}" and todo like "%${search_q}%";`
      break

    case hasPriority(priority):
      getQuery = `
      SELECT * FROM todo WHERE priority = "${priority}" and todo like "%${search_q}%";`
      break
    case hasCategory(category):
      getQuery = `
      SELECT * FROM todo WHERE  category= "${category}" and todo like "%${search_q}%";`
      break

    case hasPriorityAndStatus(priority, status):
      getQuery = `
      SELECT * FROM todo WHERE priority="${priority}" and status="${status}" and todo like "%${search_q}%";`
      break
    case hasStatusAndCategory(status, category):
      getQuery = `
      SELECT * FROM todo WHERE category="${category}" and status="${status}" and todo like "%${search_q}%";`
      break
    case hasCategoryAndPriority(category, priority):
      getQuery = `
      SELECT * FROM todo WHERE category="${category}" and priority="${priority}" and todo like "%${search_q}%";`
      break
    default:
      getQuery = `
      SELECT * FROM todo WHERE todo like "%${search_q}%";`
      break
  }

  const result = await dataBase.all(getQuery)
  const resultArray = result.map(each => {
    return {
      id: each.id,
      todo: each.todo,
      priority: each.priority,
      status: each.status,
      category: each.category,
      dueDate: each.due_date,
    }
  })
  response.send(resultArray)
})

//Specified GET API
app.get('/todos/:todoId/', validateDetails, async (request, response) => {
  const {todoId} = request.params
  const getSpecifiedQuery = `
  SELECT * FROM todo WHERE id = ${todoId};`

  let result = await dataBase.get(getSpecifiedQuery)
  if (response != undefined) {
    result = {
      id: result.id,
      todo: result.todo,
      priority: result.priority,
      status: result.status,
      category: result.category,
      dueDate: result.due_date,
    }
  }
  response.send(result)
})

//API AGENDA 3
app.get('/agenda/', validateDetails, async (request, response) => {
  const {dueDate} = request
  console.log(dueDate)
  const getSpecifiedQuery = `
  SELECT * FROM todo WHERE due_date='${dueDate}';
  `
  let result = await dataBase.all(getSpecifiedQuery)
  if (result.length != 0) {
    result = result.map(each => {
      return {
        id: each.id,
        todo: each.todo,
        priority: each.priority,
        status: each.status,
        category: each.category,
        dueDate: each.due_date,
      }
    })
  }

  response.send(result)
})

//POST API
app.post('/todos/', validateDetails, async (request, response) => {
  const {id, todo, priority, status, category} = request.body
  const {dueDate} = request
  console.log(dueDate)
  const createTodo = `
  INSERT INTO todo (id,todo,priority,status,category,due_date) VALUES 
  (${id},"${todo}","${priority}","${status}","${category}","${dueDate}");`
  await dataBase.run(createTodo)
  response.send('Todo Successfully Added')
})

//PUT API
app.put('/todos/:todoId/', validateDetails, async (request, response) => {
  let putQuery
  const {todoId} = request.params
  const {todo, priority, status, category} = request.body
  const {dueDate} = request

  switch (true) {
    case hasStatus(status):
      putQuery = `UPDATE todo SET status="${status}" WHERE id=${todoId};`
      await dataBase.run(putQuery)
      response.send('Status Updated')
      break
    case hasCategory(category):
      putQuery = `UPDATE todo SET category="${category}" WHERE id=${todoId};`
      await dataBase.run(putQuery)
      response.send('Category Updated')
      break
    case hasPriority(priority):
      putQuery = `UPDATE todo SET priority="${priority}" WHERE id=${todoId};`
      await dataBase.run(putQuery)
      response.send('Priority Updated')
      break

    case hasTodo(todo):
      putQuery = `UPDATE todo SET todo="${todo}" WHERE id=${todoId};`
      await dataBase.run(putQuery)
      response.send('Todo Updated')
      break

    case hasDueDate(dueDate):
      putQuery = `UPDATE todo SET due_date="${dueDate}" WHERE id=${todoId};`
      await dataBase.run(putQuery)
      response.send('Due Date Updated')
  }
})

//DELETE API

app.delete('/todos/:todoId/', validateDetails, async (request, response) => {
  const {todoId} = request.params
  const deleteQuery = `
  DELETE FROM todo WHERE id=${todoId};`
  await dataBase.run(deleteQuery)
  response.send('Todo Deleted')
})

module.exports = app
