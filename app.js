const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'twitterClone.db')

let db = null

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

//API 1
app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    if (password.length >= 6) {
      const hashedPassword = await bcrypt.hash(password, 10)
      const createUserQuery = `
      INSERT INTO 
          user (username, name, password, gender) 
      VALUES 
          (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}'
          )`
      await db.run(createUserQuery)
      response.status(200)
      response.send(`User created successfully`)
    } else {
      response.status(400)
      response.send('Password is too short')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

//API 2
app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
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

/// JWT TOKEN VALIDATION
const validateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'R_S_Token', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  }
}

//GETTING USER_ID THROUGH USERNAME
const getuserIdfunc = async username => {
  const getuser = `
  SELECT user_id FROM user WHERE username='${username}';`
  let userId = await db.get(getuser)
  userId = userId.user_id
  console.log(userId)
  return userId
}

//API 3
app.get('/user/tweets/feed/', validateToken, async (request, response) => {
  const {username} = request
  const userId = await getuserIdfunc(username)
  const getQuery = `
  SELECT user.username, tweet.tweet, tweet.date_time as dateTime FROM 
  user NATURAL JOIN tweet WHERE user.user_id IN ( SELECT follower.following_user_id FROM user INNER JOIN follower ON user.user_id = follower.follower_user_id WHERE  user.user_id = ${userId} and user.user_id=follower.follower_user_id);
   ORDER BY dateTime DESC LIMIT 4;`
  const dbRes = await db.all(getQuery)
  response.send(dbRes)
})

//API 4
app.get('/user/following/', validateToken, async (request, response) => {
  const {username} = request
  const userId = await getuserIdfunc(username)
  const getQuery = `
    SELECT name FROM user WHERE user_id IN ( SELECT follower.following_user_id FROM user INNER JOIN follower ON user.user_id = follower.follower_user_id WHERE  user.user_id = ${userId} and user.user_id=follower.follower_user_id);
    `
  const dbRes = await db.all(getQuery)
  response.send(dbRes)
})

//API 5
app.get('/user/followers/', validateToken, async (request, response) => {
  const {username} = request
  const userId = await getuserIdfunc(username)
  const getQuery = `
    SELECT name FROM user WHERE user_id IN ( SELECT follower.follower_user_id FROM user INNER JOIN follower ON user.user_id = follower.follower_user_id WHERE user.user_id=follower.follower_user_id and follower.following_user_id = '${userId}');
    `
  const dbRes = await db.all(getQuery)
  response.send(dbRes)
})

//API 6
app.get('/tweets/:tweetId/', validateToken, async (request, response) => {
  const {username} = request
  const userId = await getuserIdfunc(username)
  const {tweetId} = request.params
  const getTweetuserId = `SELECT user_id FROM tweet WHERE tweet.tweet_id= ${tweetId};`
  let dbTweetuserId = await db.get(getTweetuserId)
  dbTweetuserId = dbTweetuserId.user_id
  const getQueryuserfollowing = `
    SELECT user_id FROM user WHERE user_id IN ( SELECT follower.following_user_id FROM user INNER JOIN follower ON user.user_id = follower.follower_user_id WHERE  user.user_id = ${userId} and user.user_id=follower.follower_user_id);
    `
  const dbRes = await db.all(getQueryuserfollowing)
  const userfollowinglist = dbRes.map(each => {
    return each.user_id
  })
  if (userfollowinglist.includes(dbTweetuserId)) {
    const getQuery = `
    SELECT tweet.tweet,
    count(DISTINCT like.like_id) as likes,
    count(DISTINCT reply.reply_id) as replies,
    tweet.date_time as dateTime 
    FROM (tweet LEFT JOIN like ON tweet.tweet_id=like.tweet_id ) 
    LEFT JOIN reply ON tweet.tweet_id = reply.tweet_id 
    WHERE tweet.tweet_id=${tweetId} and tweet.user_id IN (${userfollowinglist});`
    const dbtweetDetailsRes = await db.get(getQuery)
    response.send(dbtweetDetailsRes)
  } else {
    response.status(401)
    response.send('Invalid Request')
  }
})

//API 7

app.get('/tweets/:tweetId/likes/', validateToken, async (request, response) => {
  const {username} = request
  const userId = await getuserIdfunc(username)
  const {tweetId} = request.params
  const getTweetuserId = `SELECT user_id FROM tweet WHERE tweet.tweet_id= ${tweetId};`
  let dbTweetuserId = await db.get(getTweetuserId)
  dbTweetuserId = dbTweetuserId.user_id
  const getQueryuserfollowing = `
    SELECT user_id FROM user WHERE user_id IN ( SELECT follower.following_user_id FROM user INNER JOIN follower ON user.user_id = follower.follower_user_id WHERE  user.user_id = ${userId} and user.user_id=follower.follower_user_id);
    `
  const dbRes = await db.all(getQueryuserfollowing)
  const userfollowinglist = dbRes.map(each => {
    return each.user_id
  })
  if (userfollowinglist.includes(dbTweetuserId)) {
    const getQuery = `SELECT user.username as likes  FROM user NATURAL JOIN like WHERE like.tweet_id=${tweetId};`
    const dbtweetDetailsRes = await db.all(getQuery)
    let result = dbtweetDetailsRes.map(each => {
      return each.likes
    })
    result = {
      likes: result,
    }
    response.send(result)
  } else {
    response.status(401)
    response.send('Invalid Request')
  }
})

//API 8
app.get(
  '/tweets/:tweetId/replies/',
  validateToken,
  async (request, response) => {
    const {username} = request
    const userId = await getuserIdfunc(username)
    const {tweetId} = request.params
    const getTweetuserId = `SELECT user_id FROM tweet WHERE tweet.tweet_id= ${tweetId};`
    let dbTweetuserId = await db.get(getTweetuserId)
    dbTweetuserId = dbTweetuserId.user_id
    const getQueryuserfollowing = `
    SELECT user_id FROM user WHERE user_id IN ( SELECT follower.following_user_id FROM user INNER JOIN follower ON user.user_id = follower.follower_user_id WHERE  user.user_id = ${userId} and user.user_id=follower.follower_user_id);
    `
    const dbRes = await db.all(getQueryuserfollowing)
    const userfollowinglist = dbRes.map(each => {
      return each.user_id
    })
    if (userfollowinglist.includes(dbTweetuserId)) {
      const getQuery = `SELECT user.name, reply.reply FROM user NATURAL JOIN reply WHERE reply.tweet_id=${tweetId};`
      const dbtweetDetailsRes = await db.all(getQuery)
      let result = {
        replies: dbtweetDetailsRes,
      }
      response.send(result)
    } else {
      response.status(401)
      response.send('Invalid Request')
    }
  },
)

//API 9
app.get('/user/tweets', validateToken, async (request, response) => {
  const {username} = request
  const userId = await getuserIdfunc(username)
  const getUserTweetUserIds = `SELECT tweet_id FROM tweet WHERE user_id=${userId};`

  const userTweetsIds = await db.all(getUserTweetUserIds)
  console.log(userTweetsIds)
  let result = []
  if (userTweetsIds != undefined) {
    for (let tweetId of userTweetsIds) {
      const getQuery = `
        SELECT tweet.tweet,
        count(DISTINCT like.like_id) as likes,
        count(DISTINCT reply.reply_id) as replies,
        tweet.date_time as dateTime 
        FROM (tweet LEFT JOIN like ON tweet.tweet_id=like.tweet_id ) 
        LEFT JOIN reply ON tweet.tweet_id = reply.tweet_id 
        WHERE tweet.tweet_id=${tweetId.tweet_id} and tweet.user_id=${userId};`
      const dbtweetDetailsRes = await db.get(getQuery)
      result.push(dbtweetDetailsRes)
    }
  }
  response.send(result)
})

//API 10
app.post('/user/tweets/', validateToken, async (request, response) => {
  const {username} = request
  const userId = await getuserIdfunc(username)
  const {tweet} = request.body
  console.log(tweet)
  const dateTime = new Date()
  console.log(dateTime)
  const createQuery = `
  INSERT INTO tweet (tweet,user_id,date_time)
   VALUES 
   (
    '${tweet}',
    ${userId},
    '${dateTime}'
   )`
  const dbRes = await db.run(createQuery)
  console.log(dbRes)

  response.send('Created a Tweet')
})

//API 11
app.delete('/tweets/:tweetId/', validateToken, async (request, response) => {
  const {username} = request
  const userId = await getuserIdfunc(username)
  const {tweetId} = request.params

  const accessingUserId = `
  SELECT user_id FROM tweet WHERE tweet_id=${tweetId};`
  let tweetUserId = await db.get(accessingUserId)
  if (tweetUserId != undefined) {
    tweetUserId = tweetUserId.user_id
    if (userId === tweetUserId) {
      const deleteQuery = `
      DELETE FROM tweet WHERE tweet_id=${tweetId};`
      await db.run(deleteQuery)
      response.send('Tweet Removed')
    } else {
      response.status(401)
      response.send('Invalid Request')
    }
  } else {
    response.status(400)
    response.send('User Does Not Excits!')
  }
})

module.exports = app
