const mongoose =  require('mongoose');



let securitySchema = new mongoose.Schema({
    symbol: String,
    companyName: String,
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