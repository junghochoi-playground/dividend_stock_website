const express               =        require('express'),
      mongoose              =        require('mongoose'),
      bodyParser            =        require('body-parser'),
      User                  =        require("./models/user.js"),
      Security              =        require("./models/security.js"),
      passport              =        require("passport"),
      localStrategy         =        require("passport-local"),
      passportLocalMongoose =        require("passport-local-mongoose"),
      axios                 =        require("axios");
      methodOverride        =        require("method-override");
      dateFormat            =        require("dateformat"); 
 




var app = express();
dateFormat.masks.finnhub = "yyyy-mm-dd";

mongoose.connect("mongodb://localhost/div_stock_app", {useNewUrlParser: true, useUnifiedTopology: true});


//===================== MIDDLE WARE=======================


app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.use(express.static(__dirname + "/public"));


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
    
    // res.locals.currentUser = req.user.portfolio;
    next();
});

// ===========================================================





//=====================WEBSITE ROUTES=======================
app.get('/', (req, res) => {
    res.render("landing.ejs");
  });
app.get("/dashboard", authenticate, (req,res)=>{

    User.findById(req.user._id).populate("portfolio").exec((err, user) =>{
        if(err) return res.send(err);
 
        res.render("dashboard.ejs", {portfolio: user.portfolio});
    });
    
});

app.post("/dashboard", authenticate, (req, res)=>{


    async function addPortfolio(){
        let exists = await Security.exists({ticker: req.body.ticker});

       
        if(!exists){
     
            let security = {
                ticker: req.body.companyDescription["ticker"],
                company: req.body.companyDescription["companyName"],
                description: req.body.companyDescription["description"],
                industry: req.body.companyDescription["industry"],
                investors:[]
            }
            await Security.create(security);
        }

        Security.findOne({ticker: req.body.companyDescription["ticker"]}, (err, security)=>{
            User.findById(req.user._id, (err,user)=>{
                if(err) return res.send(err.message);
                user.portfolio.push(security._id);
                user.save();
                security.investors.push(user._id);
                security.save();
            
        
            });
        });
        res.redirect("/dashboard");

    }


    addPortfolio();

    
    
    
});



app.get("/dashboard/search", (req, res)=>{
    var ticker = req.query.ticker.toUpperCase().trim();
    res.redirect(`/dashboard/${ticker}`);
});
app.get("/dashboard/:ticker", (req, res)=>{
    
    let now = dateFormat(new Date(), "finnhub");
    let ticker = req.params.ticker;
    let finnhuburl = `https://finnhub.io/api/v1/stock/dividend?symbol=${ticker}&from=1970-01-01&to=${now}&token=br02f5vrh5rbiraoee7g`
    let iexurl = `https://cloud.iexapis.com/stable/stock/${ticker}/stats?token=sk_99cab9ccb73b478faf3bf35989163ae5`
    let iexurl2 = `https://cloud.iexapis.com/stable/stock/${ticker}/company/stats?token=sk_99cab9ccb73b478faf3bf35989163ae5`
    
    async function callAPI(){
    
        try{
      
            const finnhub = await axios.get(finnhuburl);
            const iex = await axios.get(iexurl);
            const iex2 = await axios.get(iexurl2);
            

            res.render("stock.ejs", {
                ticker: ticker,
                companyDescription: iex2.data,
                companyStats: iex.data,
                dividends: finnhub.data,
                loggedIn: req.isAuthenticated(),
                contains: req.isAuthenticated() ? req.user.portfolio.includes({ticker : ticker}) :  false,
                checkContent: object =>{ return object !== null ? object : "N/A";}
            });
        } catch(err){
            console.log(err);
            res.send(`${err.response.status} - ${err.response.statusText}`)
        }
    }
    callAPI();
});

app.get("/dashboard/:ticker/news", (req,res)=>{

    async function callAPI(){
        try{
            let now = dateFormat(new Date(), "finnhub");
            let oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate()-2);
            oneWeekAgo = dateFormat(oneWeekAgo, "finnhub");
        
 
            
            let finnhuburl = `https://finnhub.io/api/v1/company-news?symbol=${req.params.ticker}&from=${oneWeekAgo}&to=${now}&token=br02f5vrh5rbiraoee7g`

            const finnhub = await axios.get(finnhuburl);
        
            res.render("news.ejs", {articles: finnhub.data });
        } catch(err){
            console.log(err);
            res.send(`${err.response.status} - ${err.response.statusText}`)
        }   
    }

    callAPI();
    
});

app.delete("/dashboard/:ticker", (req, res)=>{


    console.log("heloooo");
    User.findById(req.user._id, (err, user)=>{
        if (err) return res.send("User Error");
        Security.findOne({ticker: req.body.ticker}, (err, security)=>{
            if (err) return res.send("Error");
            security.investors.remove({_id: req.user.id});
            user.portfolio.remove({_id: security._id});
            security.save();
            user.save();
            res.redirect("/dashboard");
        });
        
    });


    // User.findById(req.user._id, (err, user)=>{
    //     if (err) return res.send("Error");

    //     let index = user.portfolio.indexOf(req.params.ticker);
    //     if (index == -1) return res.send("error in deleting security from portfolio");
    //     user.portfolio.splice(index, 1);
    //     user.save();

    //     res.redirect("/dashboard");
    // });
   

    
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