const express = require('express')
const app = express()
const sqlite3 = require('sqlite3')
const cors = require('cors')
const dotenv = require('dotenv')
const session = require('express-session')
const bcrypt = require('bcryptjs')

const db = new sqlite3.Database('users.db', (err) => {
  if (err) console.log('Error ocurred - ' + err.message)
  else console.log('connected to db')
})

dotenv.config()

app.use(cors())

app.use(express.json())

app.use(
  session({
    secret: '123456789',
    resave: false,
    saveUninitialized: false,
  })
)

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      res.status(400).send({ message: 'username and password required' })
      return
    }
    db.serialize(() => {
      const sql = 'SELECT * FROM user WHERE username = ?'
      db.get(sql, [username], async (err, row) => {
        const valid_password = await bcrypt.compare(password, row.password)
        if (err) {
          res.send('Error querying to database: ' + err.message)
          return
        } else if (!row) {
          res.status(404).send({ message: 'user not found' })
          return
        } else if (valid_password) {
          req.session.is_logged_in = true
          req.session.username = username
          console.log('successfully login')
          res.send({ success: true, message: 'successfully login', user: row })
          return
        } else {
          res.status(401).send({ message: 'invalid password' })
          return
        }
      })
    })
  } catch (e) {
    console.error('Error in /login route:', e)
    res
      .status(500)
      .send('An unexpected error occurred. Please try again later.')
  }
})

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body
    const hash = await bcrypt.hash(password, 10)

    if (!username || !password) {
      res.status(400).send({ message: 'username and password required' })
      return
    }
    db.serialize(() => {
      const check = 'SELECT * FROM user WHERE username = ?'
      db.get(check, [username], (err, row) => {
        if (row) {
          if (username === row.username) {
            res.status(403).send({ message: 'user already exists' })
            return
          }
        } else {
          const sql = 'INSERT INTO user(username, password) VALUES (?, ?)'
          db.get(sql, [username, hash], (err) => {
            if (err) {
              res.send('Error inserting to database: ' + err.message)
              return
            }
            res.status(200).send({ message: `${username} added successfully` })
            return
          })
        }
      })
    })
  } catch (e) {
    console.error('Error in /login route:', e)
    res
      .status(500)
      .send('An unexpected error occurred. Please try again later.')
  }
})

function require_login(req, res, next) {
  if (req.session.is_logged_in && req.session.username) {
    next()
  } else {
    res.status(403).send({ message: 'Access denied. please log in first.' })
    return
  }
}

app.post('/change_password', require_login, async (req, res) => {
  req.session.username
  const { username, password } = req.body
  const hash = await bcrypt.hash(password, 10)
  if (!password) {
    res.status(400).send({ message: 'new password required' })
    return
  }
  db.serialize(() => {
    const check = 'SELECT * FROM user WHERE username = ?'
    db.get(check, [username], (err, row) => {
      if (req.session.username !== username) {
        res.status(403).send({
          message: 'you can only change your password. check username',
        })
        return
      }
      if (err) {
        res.status(500).send({ message: 'Database error', error: err.message })
        return
      }
      if (!row) {
        res.status(400).send({
          message: 'username not found',
        })
        return
      } else if (row.password === password) {
        res.status(400).send({
          message: 'new password must be diferent than current password',
        })
        return
      } else {
        const sql = 'UPDATE user SET password = ? WHERE username = ?'
        db.get(sql, [hash, username], (err, row) => {
          if (err) {
            console.log('Error querying the database: ' + err.message)
            res.status(500).send('Error querying the database:' + err.message)
            return
          }
          res.status(200).send({ message: 'password updated successfully' })
          return
        })
      }
    })
  })
})

app.post('/logout', require_login, (req, res) => {
  req.session.destroy()
  db.close((err) => {
    if (err) {
      console.error('Error closing the database:', err.message)
    } else {
      console.log('Database connection closed.')
    }
  })
  res.send('successfully logout')
})

app.get('/', (req, res) => {
  res.send('server on')
})

app.listen(process.env.PORT, () => {
  console.log('connected to server')
})
