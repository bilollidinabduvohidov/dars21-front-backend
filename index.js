const express = require("express")
const fileUpload = require("express-fileupload")
const ejs = require("ejs")
const uuid = require("uuid")
const bcrypt = require("bcrypt")
const session = require("express-session")

const path = require("path")
const fs = require("fs")

const uploadsDir = path.join(__dirname, "static", "files")

const posts = JSON.parse(fs.readFileSync(path.join(__dirname, "data.txt")))
const users = JSON.parse(fs.readFileSync(path.join(__dirname, "users.txt")))

const save = () => {
  fs.writeFileSync(path.join(__dirname, "data.txt"), JSON.stringify(posts))
}

const saveUsers = () => {
  fs.writeFileSync(path.join(__dirname, "users.txt"), JSON.stringify(users))
}

const app = express()

app.use(express.json())
app.use(fileUpload({useTempFiles: true,}));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("static"))
app.use(session( {secret: "MY_KEY"} ))

app.set("view engine", "ejs")


const PORT = process.env.PORT || 4001


// home page 
app.get("/", (req, res) => {
  if(req.session.user_id){
    const isLogin = true
    res.render("index", {name: "", isLogin})
  }
  else{
    const isLogin = false

    res.render("index", {name: "", isLogin})
  }
})

// get all users

app.get("/post", (req, res) => {
  if(req.session.user_id){
    res.render("users", {posts})
  }else{
    res.render("login", {message: ""})
  }
})

// create new user
app.post("/post", (req, res) => {
  const {name} = req.body

  const image = req.files.photo

  const nameImg = uuid.v4() + "." + image.mimetype.split("/")[1]

  const addresImg = "/files/" + nameImg

  image.mv(path.join(uploadsDir, nameImg), err=>{
    if(err){
      return console.log(err);
    }
  })

  const newPost = {
    id: uuid.v4(),
    name,
    image: addresImg,
  }

  posts.push(newPost)

  save()

  res.render("users", {posts})
})

// app.put()
app.post("/update/:id", (req, res) => {
  const {id} = req.params 

  const {name} = req.body

  const post = posts.find(post => post.id === id)

  if(req.files){
    const image = req.files.photo

    const nameImg = uuid.v4() + "." + image.mimetype.split("/")[1]

    const addresImg = "/files/" + nameImg

    image.mv(path.join(uploadsDir, nameImg), err=>{
      if(err){
       return console.log(err);
      }
    })

    fs.unlinkSync(path.join(__dirname, 'static', post.image))

    post.image = addresImg

    save()

  } 

  post.name = name

  save()
  
  res.render("users", {posts})  
})


app.get("/edit/:id", (req, res) => {
  const {id} = req.params

  const post = posts.find(post => post.id === id)
  
  res.render("edit", {post})  
})

// delete
app.get("/post/:id", (req, res) => {
  const {id} = req.params

  const index = posts.findIndex(user => user.id === id)
  fs.unlinkSync(path.join(__dirname, 'static', posts[index].image))
  
  posts.splice(index, 1)

  save()

  res.render("users", {posts})  
})



// Authorization
app.get("/register", (req, res) => {
  res.render("signup", {message: ''})
})

app.post("/signup", async (req, res) => {

  const {name, email, password} = req.body

  if(!name || !email || !password){
    return res.render("signup", {message: "Iltmos qatorni ohirgacham to'ldiring"})
  }

  const user = users.find(user => user.email === email)

  if(user){
    return res.render("signup", {message: "Bu email oldin ro'yhatdan o'tgan!"})
  } 

  const hashPassword = await bcrypt.hash(password, 8)

  
  const newUser = {
    name,
    email,
    password: hashPassword
  }

  users.push(newUser)

  saveUsers()

  res.render("login", {message: ""})
})

// Login

app.get("/login", (req, res) => {
  return res.render("login", {message: ""})
})

app.post("/login", async (req, res) => {
  const {email, password} = req.body
  if(!email || !password) {
    return res.render("login", {message: "Iltmos qatorni ohirgacham to'ldiring"})
  }

  const findUser = users.find(user => user.email === email)

  if(findUser) {

    const verifyPassword = await bcrypt.compare(password, findUser.password)

    if(verifyPassword) {
      req.session.user_id = findUser.email
      req.session.user_role = findUser.role
      const isLogin = true
      return res.render("index", {name: findUser.name, isLogin})
    }
    req.session.user_id = null 
    return res.render("login", {message: "login yoki parol noto'g'ri"})
  }

  return res.render("login", {message: "User not found!"})

})

app.listen(PORT, ()=> {
  console.log(`Server running on port: ${PORT}`);
})


