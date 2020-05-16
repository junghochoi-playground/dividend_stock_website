const express               =        require('express'),
      mongoose              =        require('mongoose'),
      bodyParser            =        require('body-parser'),
      User                  =        require("./models/user.js"),
      passport              =        require("passport"),
      localStrategy         =        require("passport-local"),
      passportLocalMongoose =        require("passport-local-mongoose")




   

var app = express();
app.use(require("express-session")({
    secret: "QWERTY",
    resave: false,
    saveUninitialized: false
}));

mongoose.connect("mongodb://localhost/div_stock_app", {useNewUrlParser: true, useUnifiedTopology: true});


app.use((req, res, next)=>{

    
    console.log(req.user);
    res.locals.username = req.user;
    next();
    
});
app.use(bodyParser.urlencoded({extended: true}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



app.get('/', (req, res) => {
  res.render("landing.ejs");
});


//=====================WEBSITE ROUTES=======================
app.get("/dashboard", (req,res)=>{
    res.render("dashboard.ejs");
});




//=========================================================


// ====================== AUTH ROUTES ======================

app.get("/register", (req,res)=>{
    res.render("auth/register.ejs");
});

app.post("/register", (req,res)=>{
    var newUser = new User({
        username: req.body.username,
    });
    User.register(newUser, req.body.password, (err,user)=>{
        if(err) return res.send(err.message);
        
        passport.authenticate("local")(req, res, function(){
            res.redirect("/dashboard");
        });
    });
});

app.get("/login", (req, res)=>{
    res.render("auth/login.ejs");
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "login"
}));

app.post("/login", (req, res)=>{
    console.log(req.user);
});

app.get("logout", (req, res)=>{
    req.logout();
    res.redirect("/");
})



// =========================================================



app.listen(3000, ()=>{
    console.log("Server has started");
});