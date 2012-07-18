/** 
* 判断页面dom是否加载完成
*/
var domReady = (function() {
    var dom = [],
        rtrim = /^(\s|\u00A0)+|(\s|\u00A0)+$/g,
        DOC = document;
    //为了别名
    dom["@name"] = "dom";
    //供保存数据的公共变量
    dom._data = {};
    dom.$ = function(id) { return typeof id == 'object' ? id : DOC.getElementById(id); };
    dom.p = function(html, after, container) {
        var p = DOC.createElement('p');
        p.innerHTML = html; //DOC.readyState;                
        (dom.$(container) || DOC.body).insertBefore(p, dom.$(after));
    }
    dom.isReady = false;
    //外部调用 dom.ready(fn);
    dom.ready = function(fn) {
        if (dom.isReady) {
            fn();
        } else {
            dom.push(fn);
        }
        return this; //是否异步有问题
    };
    dom.run = function() {
        if (!dom.isReady) {
            if (!DOC.body) {
                return setTimeout(arguments.callee, 16);
            }
            dom.isReady = 1;
            if (dom.length) {
                for (var i = 0, fn; (fn = dom[i]); i++) {
                    fn();
                }
            }
        }
    };
    //bind            
    if (DOC.readyState == 'complete') {
        dom.run();
    } else if (document.addEventListener) {
        //DOMContentLoaded 页面加载完成后添加注册不会执行绑定的事件
        DOC.addEventListener("DOMContentLoaded", function() {
            DOC.removeEventListener("DOMContentLoaded", arguments.callee, false);
            dom.run();
        }, false)
    } else {
        //ie                
        DOC.attachEvent("onreadystatechange", function() {
            if (DOC.readyState == 'complete') {
                DOC.detachEvent("onreadystatechange", arguments.callee);
                dom.run();
            }
        });
        //image video  未加载完时，dom已经构建好了              
        (function() {
            if (!dom.isReady) {
                // If IE is used, use the trick by Diego Perini
                // http://javascript.nwbox.com/IEContentLoaded/
                try {
                    document.documentElement.doScroll("left");
                } catch (e) {
                    setTimeout(arguments.callee, 1);
                    return;
                }
                dom.run();
                /**
                //使用img则vs会智能提示更新出错?
                var img = new Image;
                try {
                img.doScroll();
                img = null;
                } catch (e) {
                setTimeout(arguments.callee, 32);
                return;
                }
                */
            }
        })();
    }
    return dom.ready;
})();

/*** 
**前置条件
* loadScript.js必须在页面首部同步加入，确保dom.ready注册成功
* log.js=>log方法=>t.js
* 
** 请求script文件
* 相对路径的url是相对于当前html页面的路径
* use(uris,fn,bool),add(key,deps,fn(require,exports))
*/
(function(WIN, DOC, NAMESPACE, UNDEFINED) {
	//常量
	var toString = Object.prototype.toString,
        HEAD = "head",
        UTF8 = "utf-8",
        EMPTY = "",
        SPACE = " ",
        STRING = "string",
        OBJECT = "object",
        KEY = "key",
        DEPS = "deps",
        ADDCALLBACK = "addCallback",
        STATE = "state",
        EXPORTS = "exports",
        UNDEFINED_CHARS = "undefined";
	//组件变量 config
	var scriptTimeoutDelay = 5000,
        checkScriptTimeout = true, //是否检查超时
        scriptCharset = UTF8;
	//组件公用
	var head = document.getElementsByTagName(HEAD)[0];
	//组件属性
	var _t = WIN.t,
        t = {
        	data: {
        		callbackHash: {
        			key: "",
        			deps: [],
        			addCallback: null,
        			state: 0, //0表示未完成加载；1表示加载执行完成;
        			exports: {}
        		},
        		//chrome用来标记当前add的script,浏览器会自动维护确保顺序准确性配套use==>add==>onload
        		currentMod: {
        			key: "",
        			deps: [],
        			addCallback: null
        		}
        	},
        	guid: 1
        };
	//构造空对象,在其他引用页面没有智能提示
	//    t.EmptyAnsycLoadScriptConfig = function() {
	//        this.checkScriptTimeout = true;
	//        this.scriptTimeoutDelay = 5000;
	//        this.scriptCharset = UTF8;
	//    };
	//引用对象实例会被修改
	//    t.emptyAnsycLoadScriptConfig = {
	//        checkScriptTimeout: true,
	//        scriptTimeoutDelay: 5000,
	//        scriptCharset: UTF8
	//    };
	//设置运行参数
	t.setAnsycLoadScriptConfig = function(config) {
		//set config
		if (config) {
			checkScriptTimeout = config.checkScriptTimeout || true;
			scriptTimeoutDelay = config.scriptTimeoutDelay || 5000;
			scriptCharset = config.scriptCharset || UTF8;
		}
	}
	//异常、错误处理 arg1,arg2,...argN-1,e
	t.error = function() {
		var args = [].slice.call(arguments),
            e = args.pop();
		if (typeof e == "object") {
			(typeof log != UNDEFINED_CHARS) && log(args.join(SPACE));
			throw e;
		} else {
			args.push(e);
			(typeof log != UNDEFINED_CHARS) && log(args.join(SPACE));
		}
	}
	/** use
	* uris {string|Array} 请求的路径(相对、绝对路径均可)只要保证请求到数据
	* fn(exports) {function} 请求回调,exports,...为对应uris执行后传入对象
	* everLoadFlag {boolean} 是否请求过了，还一定保持请求，默认为false不再请求已经保存有键值的js文件
	** 待完善
	* 是否建立同步下载的js列表，也不请求?
	*/
	t.use = function(uris, fn, everLoadFlag) {
		if (!uris) return fn();
		var _exports = []; //_uris = uris.toString().split(','); 
		//array
		if (isArray(uris)) {
			_exports = [];
			//uris必须全部正确加载才能执行fn
			_useByOrder(uris);
			return;
		}
		//string
		if (typeof uris == STRING && !everLoadFlag && (_exports = _isUriLoaded(t.data.callbackHash, uris))) {
			fn(_exports);
			return;
		} else {
			insertScript(uris, fn);
		}
		//是否是加载完成过的uri
		function _isUriLoaded(_callbackHash, uri) {
			var _mod = {},
                _apUri = rp2apUri(uri);
			if (_callbackHash && (_mod = _callbackHash[_apUri]) && _mod[STATE] && _mod[STATE] == 1) {
				return _mod[EXPORTS];
			}
			return null;
		}
		//按顺序执行数组uris
		function _useByOrder(inneruris) {
			var inneruri = inneruris.shift(),
                _innerExport;
			if (!everLoadFlag && (_innerExport = _isUriLoaded(t.data.callbackHash, inneruri))) {
				_useByOrderNext(_innerExport, inneruris);
			} else {
				insertScript(inneruri, function(_inner) {
					//onerror可能进入不了这里,中间就加载断层了???
					_useByOrderNext(_inner, inneruris);
				});
			}
		}
		//_useByOrder内部递归重用函数
		function _useByOrderNext(_inner, inneruris) {
			_exports.push(_inner);
			if (inneruris.length > 0) {
				_useByOrder(inneruris);
			} else {
				//uris必须全部正确加载才能执行fn
				return fn && fn.apply(null, _exports); //end
			}
		}
	};
	/** seajs/define
	* 供引用也调用，添加新模块进主体，相当于define
	* http://groups.google.com/group/seajs/browse_thread/thread/92cf62aeae1594da
	* http://www.nodejser.com/?p=146344
	* ie中js文件代码不一定在onload之前执行完成
	* key {string} 自定义模块的键值
	* deps{Array} 依赖项key键值数组,认定必须为数组
	* fn(require,exports,module)  {function} 添加模块的属性构造函数 
	* key暂时保持无效不使用?
	*/
	t.add = function(key, deps, fn) {
		var args = [].slice.call(arguments, 0),
            len = args.length,
            _key, _deps, _fn, _argi, _src,
            _add = function() {
            	var current = getCurrentScript();
            	//需要处理内部的依赖关系?
            	if (current) {
            		_src = getScriptAbsoluteSrc(current);
            		t.data.currentMod[KEY] = _src;
            		t.data.callbackHash[_src][ADDCALLBACK] = _fn;
            	} else {
            		//insert之前就存了key
            		t.data.currentMod[ADDCALLBACK] = _fn;
            	}
            };
		//参数对照
		for (var i = 0; i < len; i++) {
			_argi = args[i];
			if (typeof _argi == STRING) {
				_key = _argi;
			} else if (isArray(_argi)) {
				_deps = _argi;
			} else if (typeof _argi == "function") {
				_fn = _argi;
			}
		}
		var current = getCurrentScript();
		//需要处理内部的依赖关系 deps
		//内部去请求的时候回调函数Onload后面会继续执行下去，，所以addcallback为空，应该是把回调函数放进依赖的执行项
		//加载了js文件并不会立即执行_deps还是要在回调里最后去执行，判断依赖项
		if (current) {
			//ie
			_src = getScriptAbsoluteSrc(current);
			t.data.currentMod[KEY] = _src; //?对ie设置t.data.currentMod是否多余
			t.data.currentMod[DEPS] = _deps;
			t.data.callbackHash[_src][DEPS] = _deps;
			t.data.callbackHash[_src][ADDCALLBACK] = _fn;
		} else {
			//chrome 取消使用insert之前就存了的key
			t.data.currentMod[DEPS] = _deps;
			t.data.currentMod[ADDCALLBACK] = _fn;
		}
	};
	/**  动态创建script
	* http: //www.cnblogs.com/zhujl/archive/2011/12/25/2283550.html
	*/
	function insertScript(uri, useCallback, timeoutCallback) {
		var _script = document.createElement("script");
		_script.type = "text/javascript";
		//添加与否创建script标签请求都是异步的
		_script.async = true;
		_script.charset = scriptCharset;
		//ie在创建scrip结点并给src赋值时就开始有http下载了，这与其它浏览器完全不同（其它浏览器是要把script结点加到DOM中才会有http下载的）
		_script.src = uri;

		var timeoutstate = 1; //0,已经获取数据或执行了onload;1,初始状态;不影响执行下面步骤;2,超时状态,不再执行下面步骤;

		//插入script之前
		var _currentScriptSrc = getScriptAbsoluteSrc(_script);
		//赋入当前url的key
		t.data.callbackHash[_currentScriptSrc] = {
			key: _currentScriptSrc,
			deps: [],
			addCallback: null,
			exports: {}, //add中exports返回到回调函数参数中的值
			state: 0//0表示未完成加载
		};
		var _onloadwrapCallback = function() {
			onloadCallback(_currentScriptSrc, useCallback);
		};
		//判断是否已经执行了自定义的超时操作，如果已经执行，即使获取了数据也认定为超时,不做进一步数据处理
		var isTimeout = function() {
			if (timeoutstate == 2) return true;
			timeoutstate = 0;
			return false;
		};
		_script.onerror = function(e) { t.error("script", _currentScriptSrc, "加载失败"); };
		//可以确保src中js执行完成了才出发onload/onreadystatechange=>readyState=loaded
		if (hasPropertyOnload(_script)) {
			_script.onload = function(e) {
				if (isTimeout()) return;
				run(_script, _currentScriptSrc, _onloadwrapCallback);
			};
		} else {
			//ie6注册事件最好使用attachEvent,避免跨页内存泄露
			_script.attachEvent("onreadystatechange", function(e) {
				//opera的script也存在readyState,但如果请求地址不存在,是不会进入onload回调的
				//http://www.cnblogs.com/_franky/archive/2010/06/20/1761370.html#1875070
				//http://www.cn-cuckoo.com/2007/07/16/the-details-for-five-states-of-readystate-9.html(Ajax中的这5中状态)
				if (/(msie)/i.test(navigator.userAgent) && /loaded|complete/i.test(_script.readyState)) {
					if (isTimeout()) return;
					//(typeof log != UNDEFINED_CHARS) && log(_currentScriptSrc + "----" + timeoutstate + "--" + _script.readyState);
					//ie会执行2次
					//本地js文件不存在时，也会进入本分支，readystate为loaded,网络上不存在的文件也是loaded进入，但超时时间很长
					run(_script, _currentScriptSrc, _onloadwrapCallback);
				}
			});
		}
		//使用insertBefore防止后面js依赖项需要方法在后面加载       
		// For some cache cases in IE 6-9, the script executes IMMEDIATELY after//?seajs
		// the end of the insertBefore execution, so use `currentlyAddingScript`
		// to hold current node, for deriving url in `define`.
		var currentlyAddingScript = _script;
		head.insertBefore(_script, head.firstChild);
		currentlyAddingScript = null;
		/**超时判断?
		* 立即返回无此数据；可能服务端无返回等待超时；可能有数据但是返回时间超长；
		*/
		//添加认证确保可以依靠 超时判断 进行自动脚本处理
		if (checkScriptTimeout) {
			setTimeout(function() {
				if (timeoutstate) {
					t.error(_currentScriptSrc + "; check by timeoutstate => timeout");
					removeScript(_script);
					_onloadwrapCallback = null;
					timeoutstate = 2;
					//外部回调函数，主动判断超时后触发
					timeoutCallback && timeoutCallback();
				}
			}, scriptTimeoutDelay);
		}
	}
	//script加载后
	function run(_script, url, _onloadwrapCallback) {
		_script.onload = _script.onreadystatechange = _script.onerror = null;
		removeScript(_script);
		//chrome
		if (t.data.currentMod[ADDCALLBACK]) {
			//[url]对象在insert之前就定义了,chrome中t.data.currentMod.key暂时固定为空
			t.data.callbackHash[url][KEY] = url;
			t.data.callbackHash[url][DEPS] = t.data.currentMod[DEPS];
			t.data.callbackHash[url][ADDCALLBACK] = t.data.currentMod[ADDCALLBACK];
			//reset
			t.data.currentMod = { key: EMPTY, deps: [], addCallback: null };
		}
		_onloadwrapCallback();
	}
	//构建onload后的回调fn "关键函数" 传入当前要执行的uri
	function onloadCallback(uri, _useCallback) {
		try {
			//inner可能混乱对象
			var inner = {},
                _deps = t.data.callbackHash[uri][DEPS],
                _completeLoad = function() {
                	var _tDataCallbackHash = t.data.callbackHash,
                        _tDataCbAddCb = _tDataCallbackHash[uri][ADDCALLBACK];
                	//t.add页面不一定有t.add方法也能工作?
                	_tDataCbAddCb && _tDataCbAddCb("require", inner);
                	_useCallback && _useCallback(inner);
                	_tDataCallbackHash[uri][STATE] = 1; //1表示已经加载完成
                	_tDataCallbackHash[uri][EXPORTS] = inner;
                },
                _depsFiltered = [],
                innerUri = EMPTY;
			/** 依赖项 
			* 处理add中的请求依赖项
			* 过滤获得未加载完成状态的_deps。。。。需要绝对路径的_deps...
			* 依赖项加载时，只加载没有加载过的key 
			*/
			if (_deps && _deps.length) {
				for (var i = 0, len = _deps.length; i < len; i++) {
					innerUri = rp2apUri(_deps[i]);
					if (!t.data.callbackHash[innerUri] || t.data.callbackHash[innerUri][STATE] != 1) {
						_depsFiltered.push(innerUri);
					}
				}
			}
			//执行之前要先判断依赖项是否加载完成,不重复加载
			if (_depsFiltered.length > 0) {
				t.use(_depsFiltered, function() {
					_completeLoad();
				});
			} else {
				_completeLoad();
			}
		} catch (e) {
			t.error("script", uri, "加载执行失败", e.name, e.message, e);
		}
	}
	//###公共方法
	function isArray(arr) {
		return toString.call(arr) == "[object Array]";
	}
	//移除script节点
	function removeScript(node) {
		node.parentNode.removeChild(node);
		node = null;
		window.CollectGarbage && CollectGarbage();
	}
	//script是否具有onload属性
	function hasPropertyOnload(script) {
		script = script || document.createElement('script');
		if ('onload' in script) return true;
		script.setAttribute('onload', EMPTY);
		return typeof script.onload == 'function'; // ff true ie false .
	}

	var currentlyAddingScript;
	var interactiveScript;
	//获取当前正在执行代码=>t.add的外部加载script
	function getCurrentScript() {
		if (currentlyAddingScript) {
			return currentlyAddingScript;
		}
		// For IE6-9 browsers, the script onload event may not fire right
		// after the the script is evaluated. Kris Zyp found that it
		// could query the script nodes and the one that is in "interactive"
		// mode indicates the current script.
		// Ref: http://goo.gl/JHfFW
		if (interactiveScript &&
        interactiveScript.readyState === 'interactive') {
			return interactiveScript;
		}
		var scripts = document.getElementsByTagName('script');
		for (var i = 0; i < scripts.length; i++) {
			var script = scripts[i];
			if (script.readyState === 'interactive') {
				interactiveScript = script;
				return script;
			}
		}
	};
	//获取script节点的src绝对路径
	function getScriptAbsoluteSrc(node) {
		return node.hasAttribute ? // non-IE6/7
        node.src :
		// see http://msdn.microsoft.com/en-us/library/ms536429(VS.85).aspx
        node.getAttribute('src', 4);
	};
	/**seajs:util-path.js
	* 简易版网络相对路径转为绝对路径 relativ path=>absolute path
	* ../AnsycLoad/c.js=>http://localhost:4222/Js_Object/Topic/AnsycLoad/a.js
	* baseURI:http://localhost:4222/Js_Object/Topic/SysMethod/js_method.html
	*/
	function rp2apUri(rpath) {
		//绝对路径直接返回
		if (/^http:[\/]*/.test(rpath)) {
			return rpath;
		}
		var apath = window.location.href,
            apaths = apath.split('\/'), //aps.pop();
            apathsLen = apaths.length,
            rpaths = rpath.split('/'),
            rpathsLen;
		(rpaths[0] == '.') && rpaths.shift();
		rpathsLen = rpaths.length;
		for (var i = 1; rpathsLen--; i++) {
			if (rpaths[rpathsLen] != '..') {
				apaths[apathsLen - i] = rpaths[rpathsLen];
			}
		}
		return apaths.join("/");
	}


	//根据string: 如a.b.c获得当前全局执行环境相应命名空间对象
	//只返回到倒数第2个对象
	function setNamespace(_namespace, context) {
		context = context || WIN;
		if (!_namespace) return context;
		//去掉window开头的部分
		_namespace = _namespace.replace(/^window\.?/, '');
		var arr = _namespace.split('.'),
				len = arr.length,
				i = 0, p;
		for (; i < len - 1; i++) {
			p = arr[i];
			if (p in context) {
				context = context[p];
			} else {
				context = context[p] = {}; //需要更新context[p]->context
			}
		}
		return context;
	}
	var context = setNamespace(NAMESPACE),
        lastName = NAMESPACE.split('.').pop();
	//赋值到全局t内
	var __self__ = context[lastName]; //WIN[NAMESPACE];
	//特殊性重名t，不提供改名方法
	if (__self__) {
		//此时一定有mix方法,t.js需要构造t.mix()
		(__self__.mix || mix)(__self__, t);
	} else if (WIN.t) {
		//此时一定有mix方法,t.js需要构造t
		(WIN.t.mix || mix)(WIN.t, t);
	} else {
		//WIN.t = t;
		context[lastName] = t;
	}
	//不可以传入未定义的变量
})(this, this.document, "t");       //this.t);
/** problem
* 可能会导致方法未定义...文件并行加载时先后顺序错乱：依赖
* 路径获取方法有问题，如果http://xxx/lckey/a/a.js 使用a/a.js会产生 http://xxx/a/a.js路径...在页面中可以运行，但是在js中的话就不行了
*/
/** 已完成
1，t级别存储，函数级别存储
2，获取页面url当key存储值
3，多个js文件按顺序加载,必须全部加载成功才执行回调函数
4，超时判断
5，添加对js文件内的依赖进行处理
6，已经加载过的js在依赖请求中再次请求时，不再次请求
7，添加已经请求过的文件再次主动请求时，是否主动过滤
8，需要记录已经加载过的uri的返回值exports到rp2apUri=>key，并取消再次请求...
9，加载对应js返回对象作为参数传入回调函数
10，调整结构，使可以与全局唯一外露变量t连接上,并把属性赋值到t上【可以单独使用、或者有t全局对象时，基于t使用】
11，修复use首相为数组，第2项无fn值为undefined时，执行报错
*/
/**
add(fn)=>fn的第一个参数require未添加效果
超时仅作为调试参考及显示，利用超时来做可能的处理暂未进行
本地的错误uri立即onload...目前只能在使用exports的属性报错时，才会发现问题
调整 t.setConfig使组件参数更好的在外部配置
目前只能监控记录使用loadScript.js本身加载的js文件是否加载
use([],fn)如果[]中任意一项失败，则，都会无声无息了。。。? 改变实现方式?每一个加载完成以后，判断队列中是否其他都已经完成，这样，劲量使更多js可以加载
*/
/**知识
DOMContentLoaded事件必须在document loaded 之前注册才有效
初始化dom ready方法最好不使用异步加载

ie6事件内存泄露：使用attachEvent 请记得 对于ie6 任何非 attachEvent方式注册的事件 （除硬编码写到html中的） 都会引起ie6 无法挽回的 跨页内存泄露.
至于多少 就看回调函数 所在闭包  中的数据量了. 作用域链 越深 受影响的东西 就越多
 
动态script标签，完全可以确保即使缓存下，script内的代码会在readyState=loaded/complete或者onload之前执行完成...
*/