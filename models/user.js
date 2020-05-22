const mongoose               =  require('mongoose'),
      passportLocalMongoose  =  require('passport-local-mongoose');


var userSchema = new mongoose.Schema({
    username: String,

    portfolio: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Security"
        }
    ]
});


userSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User", userSchema);