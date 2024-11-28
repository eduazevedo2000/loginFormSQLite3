const express = require('express')
const app = express()
const sqlite3 = require('sqlite3')

const db = new sqlite3.Database('users.db', (err) => {
  if (err) console.log('Error ocurred - ' + err.message)
  else console.log('connected to db')
})

app.use(express.json())

app.post('/login', (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).send({ message: 'username and password required' })
  }
  db.serialize(() => {
    const sql = 'SELECT * FROM user WHERE username = ?'
    db.get(sql, [username], (err, row) => {
      if (err) {
        console.log('Error querying the database: ' + err.message)
      } else if (!row) {
        res.status(404).send({ message: 'user not found' })
      } else if (row.password === password) {
        console.log('Login successfull: ', row)
        res.send({ success: true, message: 'successfully login', user: row })
      } else {
        res.status(401).send({ message: 'invalid password' })
      }
    })
  })
})

app.post('/register', (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).send({ message: 'username and password required' })
  }
  db.serialize(() => {
    const check = 'SELECT * FROM user WHERE username = ?'
    const sql = 'INSERT INTO user(username, password) VALUES (?, ?)'
    db.get(check, [username], (err, row) => {
      if (row.username === username) {
        res.send({ message: 'user already exists' })
      } else {
        db.get(sql, [username, password], (err) => {
          if (err) {
            console.log('Error inserting to database: ' + err.message)
            res.send(err)
          } else {
            console.log(username)
            res.send({ message: `${username} added successfully` })
          }
        })
      }
    })
  })
})

app.post('/change_password', (req, res) => {
  const { username, password } = req.body
  if (!password) {
    return res.status(400).send({ message: 'new password required' })
  }
  db.serialize(() => {
    const check = 'SELECT * FROM user WHERE username = ?'
    db.get(check, [username], (err, row) => {
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
      } else {
        const sql = 'UPDATE user SET password = ? WHERE username = ?'
        db.get(sql, [password, username], (err, row) => {
          if (err) {
            console.log('Error querying the database: ' + err.message)
            res.status(500).send('Error querying the database:' + err.message)
          }
          res.status(200).send({ message: 'password updated successfully' })
        })
      }
    })
  })
})

app.get('/', (req, res) => {
  res.send('server on')
})

app.listen(3000, () => {
  console.log('connected to server')
})
