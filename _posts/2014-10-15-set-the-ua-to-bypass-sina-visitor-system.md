---
author: 宾狗
date: 2014-10-15 11:40+08:00
layout: post
title: "小技巧绕过Sina Visitor System(新浪访客系统)"
description: ""
categories:
- 工程
tags:
- 网络
- 爬虫
---


#0x00 前言
一直以来，爬虫与反爬虫技术都时刻进行着博弈，而新浪微博作为一个数据大户更是在反爬虫上不遗余力。常规手段如验证码、封IP等等相信很多人都见识过……

当然确实有需要的话可以通过新浪开放平台提供的API进行数据采集，但是普通开发者的权限比较低，限制也比较多。所以如果只是做一些简单的功能还是爬虫比较方便~

应该是今年的早些时候，新浪引入了一个Sina Visitor System(新浪访客系统)，也不知道是为了提高用户体验还是为了反爬虫，或许是兼而有之。实际结果就是，爬虫取回来的页面全部变成Sina Visitor System了

<!--more-->

怎么办呢，我们先来看看这个Sina Visitor System是怎么回事

#0x01 分析

也许有人没有见过这个页面，那说明你的浏览器里存有新浪微博的`cookie`，你可以打开浏览器的隐身模式，然后进入新浪微博首页，就可以看到下面这个样子

![sina visitor system](http://bindog.qiniudn.com/sina-visitor/sina-visitor-system.png)

大概过上几秒钟才能进入正常的页面，访问其他`weibo.com`下的页面如某个用户的主页也是同样的情况

我们可以通过Sina Visitor System的网页源码来看看它到底做了什么

<script src="https://gist.github.com/bindog/3aaf8a67da2b8ab48cfa.js"> </script>

代码不是很多，而且还有中文注释，新浪还真是照顾我们……

根据中文注释就可以知道，它先是判断用户请求中是否携带`cookie`，如果有就直接进入正常页面，否则就要走访客流程了。

对用户来讲，除非你是第一次进入`weibo.com`，否则一定会有`cookie`，自然不会卡在这个页面。而一般的爬虫是不携带`cookie`的，除非进行了模拟登录或者把已有的`cookie`放入爬虫的请求中去，否则取回的结果就是Sina Visitor System了

#0x02 换个思路
如果从正常角度来想这个问题，肯定是顺着它的代码逻辑来，既然它要检测`cookie`，那么我们就用爬虫模拟登陆一下或者在`HTTP`请求中带上已有的`cookie`不就得了？没错，这样是可行的，但是要注意，模拟登录可能会遇到验证码，而`cookie`也有一定的有效期，更重要的是这两种方法都需要一个账号，因此这些方法都不是长久之计。

说来也巧，刚好在知乎上看到这样的页面

![zhihu](http://bindog.qiniudn.com/sina-visitor/zhihu-weibo.png)

知乎会自动把用户发的链接转换成对应页面的标题，可以看到这里显示的也是Sina Visitor System，说明知乎的爬虫似乎也遇到问题了

但是如果你有注意搜索引擎中新浪微博的结果，就会发现完全不是这样

![google-weibo](http://bindog.qiniudn.com/sina-visitor/google-weibo.png)

这说明了什么？说明新浪微博为了让自己的结果呈现在搜索引擎中，对来自搜索引擎的爬虫是“来者不拒”

那么，我们就来试验一下。我用`Python`写了一个小程序，从一个微博用户的主页中取出该用户的昵称

<script src="https://gist.github.com/bindog/aaaeb76d4b9b81cff63d.js"> </script>

设置一下User-Agent，把自己伪装成搜索引擎爬虫，具体用什么随意啦~谷歌、必应都可以，或者仅仅用`spider`也行！

<script src="https://gist.github.com/bindog/04ce03860d2c18b3eeb6.js"> </script>

#0x03 总结

这个有意思的技巧再一次说明了大道至简~这里我没有进一步进行试验了，如果你有兴趣的话可以试试在设置User-Agent为`spider`的情况下新浪是否会采取那些反爬虫策略(^_^)