var s = "";
for (var i = 0; i < 300; i++) {
    s += "//定义a 模块//定义a 模块//定义a 模块//定义a 模块//定义a 模块//定义a 模块";
}
log("--require--b---")
//定义b 模块
t.add(function(require, exports) {
    log("-add--b------");
    exports.bdo = function() {
        log("bdo");
    };
});
var s = "";
for (var i = 0; i < 300; i++) {
    s += "//定义a 模块//定义a 模块//定义a 模块//定义a 模块//定义a 模块//定义a 模块";
}
//log(s);