const sqlite3 = require('sqlite3')

const db = new sqlite3.Database('users.db', (err) => {
  if (err) console.log('Error ocurred - ' + err.message)
  else console.log('connected to db')
})

module.exports = db
