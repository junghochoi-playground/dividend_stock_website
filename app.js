const express               =        require('express'),
      mongoose              =        require('mongoose'),
      bodyParser            =        require('body-parser'),
      User                  =        require("./models/user.js"),
      passport              =        require("passport"),
      localStrategy         =        require("passport-local"),
      passportLocalMongoose =        require("passport-local-mongoose"),
      axios                 =        require("axios");





var app = express();
app.use(require("express-session")({
    secret: "QWERTY",
    resave: false,
    saveUninitialized: false
}));

mongoose.connect("mongodb://localhost/div_stock_app", {useNewUrlParser: true, useUnifiedTopology: true});


//===================== MIDDLE WARE=======================


app.use(bodyParser.urlencoded({extended: true}));



app.use(require('express-session')({
    secret: "#$2f32f",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session({secret: "4hP42F"}));
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//Global Varaibles MiddleWare
app.use((req, res, next)=>{
    res.locals.currentUser = req.user;
    next();
});

// ===========================================================





//=====================WEBSITE ROUTES=======================
app.get('/', (req, res) => {
    res.render("landing.ejs");
  });
app.get("/dashboard", authenticate, (req,res)=>{
    res.render("dashboard.ejs");
});



app.get("/stock", (req, res)=>{

    var ticker = req.query.ticker.toUpperCase();


    var finnhuburl = `https://finnhub.io/api/v1/stock/dividend?symbol=${ticker}&from=2010-02-01&to=2020-02-01&token=br02f5vrh5rbiraoee7g`
    var iexurl = `https://cloud.iexapis.com/stable/stock/${ticker}/stats?token=sk_99cab9ccb73b478faf3bf35989163ae5`
    
    axios.get(finnhuburl).then(finnhub =>{
        axios.get(iexurl).then(iex=>{
            console.log(iex.data);
    
      
            res.render("stock.ejs", {
                ticker: ticker,
                stats: iex.data,
                dividends: finnhub.data,
                checkContent: (object) =>{
                    return object ? object !== null : "N/A";
                }
            });
        });
    });


    
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


app.get("/logout", (req, res)=>{
    req.logout();
    res.redirect("/");
});

function authenticate(req, res, next){
    if (req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}



// =========================================================



app.listen(3000, ()=>{
    console.log("Server has started");
});