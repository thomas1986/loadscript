
//log("--------a init--------");

var s = "";
for (var i = 0; i < 300; i++) {
    s += "//定义a 模块//定义a 模块//定义a 模块//定义a 模块//定义a 模块//定义a 模块";
}
log("-require--a--")
//setTimeout(function() {
//定义a 模块
t.add(["../AnsycLoad/b.js", "../AnsycLoad/c.js"], function(require, exports) {
    log("-add--a------");
    exports.aval = "aval";
    exports.ado = function() {
        log("ado");
    };
});
//}, 1000);



var s = "";
for (var i = 0; i < 300; i++) {
    s += "//定义a 模块//定义a 模块//定义a 模块//定义a 模块//定义a 模块//定义a 模块";
}
//log(s);
/*

log("--------a init--------");
log("--------a init--------");
log("--------a init--------");
log("--------a init--------");
log("--------a init--------");
log("--------a init--------");
log("--------a init--------");
log("--------a init--------");
log("--------a init--------");
log("--------a init--------");
log("--------a init--------");
log("--------a init--------");
log("--------a init--------");
*/