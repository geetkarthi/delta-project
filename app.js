const express=require("express");
const ejs=require("ejs");
const request =require("request");
const app=express();
const bodyParser=require("body-parser");
const mongoose=require("mongoose");
const FacebookStrategy=require("passport-facebook");
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
app.use(session({
  secret:"Our little secret.",
  resave:false,
  saveUninitialized: false
}));
const userSchema=new mongoose.Schema({
  username:String,
  password:String,
  facebookId:String
});
userSchema.plugin(passportLocalMongoose);
var User = mongoose.model("User", userSchema);





app.use(passport.initialize());
app.use(passport.session());
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({ extended: true}));
mongoose.connect('mongodb://localhost:27017/commentDB', {useNewUrlParser: true});
mongoose.set("useCreateIndex",true);
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


const blogSchema=new mongoose.Schema({
  username:String,
  blog:String,
  link:String
});

passport.use(new FacebookStrategy({
    clientID: "1264185027079270",
    clientSecret: "3eb23f8e10e48de247c65783bf9f96bf",
    callbackURL: "http://localhost:3000/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log(profile);
    User.findOne({
            facebookId: profile.id
        }, function(err, user) {
            if (err) {
                return done(err);
            }
            //No user was found... so create a new user with values from Facebook (all the profile. stuff)
            if (!user) {
                user = new User({

                    username: profile.displayName[0]

                    //now in the future searching on User.findOne({'facebook.id': profile.id } will match because of this next line

                });
                user.save(function(err) {
                    if (err) console.log(err);
                    return done(err, user);
                });
            } else {
                //found user. Return
                return done(err, user);
            }
        });

  }
));

passport.use(new GoogleStrategy({
    clientID: "643247093237-scrnb40pfimo73h47unpet86no362evp.apps.googleusercontent.com",
    clientSecret: "6xBlYGTkOvIXo9yaZFBFAWah",
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOne({ googleId: profile.id
    }, function(err, user) {
        if (err) {
            return done(err);
        }
        //No user was found... so create a new user with values from Facebook (all the profile. stuff)
        if (!user) {
            user = new User({

                username: profile.displayName[0]

                //now in the future searching on User.findOne({'facebook.id': profile.id } will match because of this next line

            });
            user.save(function(err) {
                if (err) console.log(err);
                return done(err, user);
            });
        } else {
            //found user. Return
            return done(err, user);
        }
    });}
));


app.get("/login",function(req,res){
  res.render("login",{})
});
app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});
app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/comment");
  });
app.post("/login",function(req,res){
  const user=new User({
    username:req.body.username,
    password:req.body.password
  });
  req.login(user,function(err){
    if(err){
      console.log(err);
      res.redirect("/login");
    }
    else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/comment");
      });

    }
  });

});
app.get("/signup",function(req,res){
  res.render("signup",{});
});
app.post("/signup",function(req,res){

  User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.redirect("/signup");
    }
    else{
      passport.authenticate("local")(req,response,function(){
        res.redirect("/login");
      });
    }


  });
  res.redirect("/login");

});

app.get('/auth/google',
passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/callback',
passport.authenticate('google', { failureRedirect: '/login' }),
function(req, res) {
  // Successful authentication, redirect home.
  res.redirect('/comment');
});
var array=[],arr=[];
let flag=true;
// parse application/json
app.use(bodyParser.json())
var Blog = mongoose.model("Blog", blogSchema);

app.get("/",function(req,res){
  if(!flag){
    flag=true;
  res.render("home",{array:array});
}
else{
  let url="https://newsapi.org/v2/everything?q=world news&from=2019-07-14&sortBy=publishedAt&apiKey=7367a97cc6c44b2e90daac4c3366e236";
  request(url, function (error, response, body) {
  console.log('error:', error); // Print the error if one occurred
  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
  console.log('body:',JSON.parse(body));
  res.render("home",{array:JSON.parse(body).articles}) // Print the HTML for the Google homepage.

});


}

});
var logout = function (req, res, next) {
  // Get rid of the session token. Then call `logout`; it does no harm.
  req.logout();
  req.session.destroy(function (err) {
    if (err) { return next(err); }
    // The response should indicate that the user is no longer authenticated.
    return res.send({ authenticated: req.isAuthenticated() });
  });
};
app.post("/",function(req,res){
  flag=false;
  let url="https://newsapi.org/v2/everything?q="+req.body.news+"&from=2019-06-27&sortBy=publishedAt&apiKey=7367a97cc6c44b2e90daac4c3366e236";
  console.log(url);
  request(url, function (error, response, body) {
  console.log('error:', error); // Print the error if one occurred
  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
  console.log('body:',JSON.parse(body).articles);
  array=JSON.parse(body).articles; // Print the HTML for the Google homepage.
  res.redirect("/");
});
  console.log(req.body);
});

app.get("/comment",function(req,res){
  if(arr.length!=0){
    res.render("blog",{array:arr,isAuth:true,user:req.user.username});
  }
else{
  if(req.isAuthenticated()){Blog.find({},function(err,doc){
    if(err){
      console.log(err);}
      else{

            res.render("blog",{array:doc,isAuth:true,user:req.user.username});
          }

  });}


else{
  Blog.find({},function(err,doc){
    if(err){
      console.log(err);}
      else{

            res.render("blog",{array:doc,isAuth:false});
          }

  });
}}

});
app.get("/compose/:user",function(req,res){
  arr=[];
  res.render("compose",{user:req.params.user});


});
app.post("/compose/:user",function(req,res){
  const blog=new Blog({
    username:req.params.user,
    blog:req.body.blog,
    link:req.body.link
  });
  blog.save(function(err){
    if(err)
    console.log(err);
    res.redirect("/comment");
  });
});





app.get("/delete/:id",function(req,res){
   Blog.findByIdAndDelete(req.params.id,function(err){
     if(err){
       console.log(err);

     }
     res.redirect("/comment");
   });

});

app.post("/search",function(req,res){
  console.log(req.body.search);
  Blog.find({link:req.body.search},function(err,docs){
    if(err)
    console.log(err);
    else{
      arr=docs;
    res.redirect("/comment");}
  });
});



































app.listen(3000,function(){
  console.log("Listening!!YAYYYY");
});
//7367a97cc6c44b2e90daac4c3366e236
