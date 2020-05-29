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
      flash                 =        require("connect-flash");

 




var app = express();
dateFormat.masks.finnhub = "yyyy-mm-dd";
// const localConnection = "mongodb://localhost/div_stock_app";
const connection = "mongodb+srv://dchoi315:315choi2002@divstockusers-ctwtg.mongodb.net/test?retryWrites=true&w=majority";
mongoose.connect(connection, {
    useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true
}).then(()=>{
    console.log("Connected to DB");
}).catch(err =>{
    console.log("ERROR: ", err.message);
});


//===================== MIDDLE WARE=======================


app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.use(express.static(__dirname + "/public"));
app.use(flash());

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
    res.locals.error = req.flash("error");
    res.locals.success= req.flash("success");
    
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


        //TODO does not work why is req.body.symbol unefined
        let exists = await Security.exists({symbol:req.body.companyDescription["symbol"]});
        
  
        if(!exists){
     
            let security = {
                symbol: req.body.companyDescription["symbol"],
                companyName: req.body.companyDescription["companyName"],
                description: req.body.companyDescription["description"],
                industry: req.body.companyDescription["industry"],
                investors:[]
            }
            await Security.create(security);
        }

        Security.findOne({symbol: req.body.companyDescription["symbol"]}, (err, security)=>{
            User.findById(req.user._id, (err,user)=>{
                if(err) return res.send(err.message);
                user.portfolio.push(security._id);
                
                security.investors.push(user._id);
                user.save();
                security.save();
            
        
                req.flash("success", "Added Portfolio Successfully!")
                res.redirect("/dashboard");
            });
        });


    }


    addPortfolio();

    
    
    
});



app.get("/dashboard/search", (req, res)=>{
    var symbol = req.query.symbol.toUpperCase().trim();
    res.redirect(`/dashboard/${symbol}`);
});
app.get("/dashboard/:symbol", (req, res)=>{
    
    let now = dateFormat(new Date(), "finnhub");
    let symbol = req.params.symbol;
    let finnhuburl = `https://finnhub.io/api/v1/stock/dividend?symbol=${symbol}&from=1970-01-01&to=${now}&token=br02f5vrh5rbiraoee7g`
    let iexurl = `https://cloud.iexapis.com/stable/stock/${symbol}/stats?token=sk_99cab9ccb73b478faf3bf35989163ae5`
    let iexurl2 = `https://cloud.iexapis.com/stable/stock/${symbol}/company/stats?token=sk_99cab9ccb73b478faf3bf35989163ae5`
    
    async function callAPI(){
    
        try{
      
            const finnhub = (await axios.get(finnhuburl)).data;
            const iex = (await axios.get(iexurl)).data;
            const iex2 = await Security.exists({symbol: symbol}) ? await Security.findOne({symbol: symbol}) : (await axios.get(iexurl2)).data;
            
            let contains = false;
            if (req.isAuthenticated()){
                await Security.findOne({symbol: symbol}, (err, security)=>{
                    if (security != null){
                        contains = req.user.portfolio.includes(security._id);
                    }  
                })
            }

            res.render("stock.ejs", {
                symbol: symbol,
                companyDescription: iex2,
                companyStats: iex,
                dividends: finnhub,
                loggedIn: req.isAuthenticated(),
                contains:  contains, // req.isAuthenticated() ? await req.user.portfolio.includes({symbol : symbol}) :  false,
                checkContent: object =>{ return object !== null ? object : "N/A";}
            });
        } catch(err){
            req.flash("error", "Ticker Does not exist")
            res.redirect("/dashboard");
        }
    }
    callAPI();
});

app.get("/dashboard/:symbol/news", (req,res)=>{

    async function callAPI(){
        try{
            let now = dateFormat(new Date(), "finnhub");
            let oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate()-2);
            oneWeekAgo = dateFormat(oneWeekAgo, "finnhub");
        
 
            
            let finnhuburl = `https://finnhub.io/api/v1/company-news?symbol=${req.params.symbol}&from=${oneWeekAgo}&to=${now}&token=br02f5vrh5rbiraoee7g`

            const finnhub = await axios.get(finnhuburl);
          
            res.render("news.ejs", {articles: finnhub.data });
        } catch(err){
            console.log(err);
            res.send(`${err.response.status} - ${err.response.statusText}`)
        }   
    }

    callAPI();
    
});

app.delete("/dashboard/:symbol", (req, res)=>{

    User.findById(req.user._id, (err, user)=>{
        if (err) return res.send("User Error");
        Security.findOne({symbol: req.body.symbol}, (err, security)=>{
            if (err) return res.send("Error");
            security.investors.remove({_id: req.user.id});
            user.portfolio.remove({_id: security._id});
            security.save();
            user.save();
            req.flash("error", "Deleted Stock Successfully");
            res.redirect("/dashboard");
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
            req.flash("success", "Successfully Signed Up")
            res.redirect("/dashboard");
        });
    });
});

app.get("/login", (req, res)=>{
    res.render("auth/login.ejs");
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "login",
    successFlash: 'Successfully Logged In',
    failureFlash: 'Invalid credentials'
}));


app.get("/logout", (req, res)=>{
    req.logout();
    req.flash("success", "Successfully Logged Out");
    res.redirect("/");
});

function authenticate(req, res, next){
    if (req.isAuthenticated()){
        return next();
    }
    req.flash("error", "You must login first");
    res.redirect("/login");
}



// =========================================================
// Middle War


app.listen(process.env.PORT ||3000, ()=>{
    console.log("Server has started");
});