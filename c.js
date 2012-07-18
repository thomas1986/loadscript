//c as base
log("------c----------");
t.add(function(require, exports) {
    log("-add---c----");
    // var a = require('./a');
    //c.add();//插件机制  plugin-base
    exports.cdo = function() {
        log("c do...as base for a do to use");
    };
    exports.cval = "c value";
});