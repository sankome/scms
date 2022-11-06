//trace function if TRACE is set
module.exports = function(message) {
	if (!process.env.TRACE) return;
	console.log("*scms*", message);
};