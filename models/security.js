const mongoose   =  require('mongoose');

var securitySchema = new mongoose.Schema({
    ticker: String,
    price: Number,
    payoutRatio: Number,
    dividendYield: Number,
    PERatio : Number
    


});