const mongoose =  require('mongoose');



let securitySchema = new mongoose.Schema({
    ticker: String,
    company: String,
    description: String,
    industry: String,
    investors: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ]
});

module.exports = mongoose.model("Security", securitySchema);