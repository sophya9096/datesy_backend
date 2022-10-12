const moment = require("moment");

var d = new Date();
var localTime = d.getTime();
var localOffset = d.getTimezoneOffset() * 60000;
var utc = localTime + localOffset;
var offset = 2; //UTC of Israel is +02.00
var dubai = utc + 3600000 * offset;
var nd = new Date(dubai);
console.log("Israel time is " + nd.toLocaleString());

function formatMessage(from, message, to, room) {
    return {
        from,
        message,
        to,
        room,
        time: moment().format("h:mm a"),
    };
}

module.exports = formatMessage;
