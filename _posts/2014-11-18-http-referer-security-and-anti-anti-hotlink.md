---
author: 宾狗
date: 2014-11-18 12:35+08:00
layout: post
title: "HTTP Referer安全与反反盗链"
description: ""
categories:
- 工程
tags:
- 网络
---

#0x00 前言

最近用`Python`非常多，确实感受到了`Python`的强大与便利。但同时我并没有相见恨晚的感觉，相反我很庆幸自己没有太早接触到`Python`，而是基本按着`C`→`C++`→`Java`→`Python`这条路学习下来的，因为过早使用太便利的方法有可能使你对底层细节一无所知。

现在我对HTTP协议的了解完全要归功于当初用`Java`写爬虫时遇到的各种问题，如果我很早就开始使用`Python`的`urllib2`或者`requests`，那么我现在对HTTP协议的认识可能依然非常肤浅。

<!--more-->

好了，如果你对HTTP协议不太熟悉的话，强烈建议你先去看看相关知识，也可以看看[《图解HTTP》](http://book.douban.com/subject/25863515/)，会有一个更全面的了解。

#0x01 Referer简介

简单来说，Referer是HTTP协议中的一个请求报头，用于告知服务器用户的来源页面。比如说你从Google搜索结果中点击进入了某个页面，那么该次HTTP请求中的Referer就是Google搜索结果页面的地址。如果你的某篇博客中引用了其他地方的一张图片，那么对该图片的HTTP请求中的Referer就是你那篇博客的地址。

一般Referer主要用于统计，像CNZZ、百度统计等可以通过Referer统计访问流量的来源和搜索的关键词（包含在URL中）等等，方便站长们有针性对的进行推广和SEO什么的~

当然Referer另一个用处就是防盗链了，主要是图片和网盘服务器使用的较多。盗链的危害不言而喻，侵犯了版权不说，增加了服务器的负荷，却没有给真正的服务提供者带来实际利益（广告点击什么的）

另外要注意的是，Referer是由浏览器自动为我们加上的，以下情况是不带Referer的

* 直接输入网址或通过浏览器书签访问
* 使用`JavaScript`的`Location.href`或者是`Location.replace()`
* HTTPS等加密协议

当然你可以通过在Chrome或者Firefox浏览器中安装一些插件去除Referer甚至进行Referer欺骗。如果是自己写爬虫的话，Referer是完全受我们掌控的，想怎么改就怎么改~

#0x02 Referer的安全问题

严格来说Referer并非一些安全问题的根源，只不过充当了一个帮凶。咱们以新浪微博曾经的一个漏洞（[新浪微博gsid劫持](http://www.wooyun.org/bugs/wooyun-2012-014221)）为例说明吧~

什么是gsid呢？

>gsid是一些网站移动版的认证方式，移动互联网之前较老的手机浏览器不支持cookie，为了能够识别用户身份（实现类似cookie的作用），就在用户的请求中加入了一个类似“sessionid”的字符串，通过GET方式传递，带有这个id的请求，就代表你的帐号发起的操作。后来又因用户多次认证体验不好，gsid的失效期是很长甚至永久有效的（即使改了密码也无用哦，这个问题在很多成熟的web产品上仍在发生）。也就是说，一旦攻击者获取到了这个gsid，就等同于长期拥有了你的身份权限，对你的帐号做任意操作。

相信看到这里你已经能猜到这个漏洞的基本原理了，gsid这个非常重要的参数竟然就在URL里，只要攻击者在微博上给你发一个链接（指向攻击者的服务器），你通过手机点击进入之后，手机当前页面的URL就通过Referer主动送到了攻击者的服务器上，攻击者自然就可以轻松拿到你的gsid进而控制你的账号。

当然防范这种攻击的方法很多，了解更多请戳[新浪微博gsid劫持](http://www.wooyun.org/bugs/wooyun-2012-014221)

#0x03 反反盗链

反盗链的方法这里就不多说了，网上一搜一箩筐，不同平台有不同的实现方法。

加入反盗链机制后，从其他非服务提供者指定的来源的HTTP请求就得不到正常结果了，比如百度的反盗链机制~

![盗链提示](http://c.hiphotos.baidu.com/ting/pic/item/b151f8198618367a05c961a62d738bd4b31ce50d.jpg)

注意，上面的不是截图，就是盗链，你可以用审查元素进行查看。

当然，访问用户可以通过给浏览器安装一些插件去除Referer来正常显示，但是并非每一个用户都那个爱折腾。有没有一个简单粗暴跨平台跨浏览器的服务器端解决方案呢？也就是说访问用户什么都不用做就可以正常显示。

当然有，看下面这张图片，你同样可以用审查元素进行查看（这里为了防止缓存我使用的是不一样的图片）

<script src="/assets/js/ReferrerKiller.js"></script>

<span id="noreferer">
</span>

<script>
document.getElementById('noreferer').innerHTML = ReferrerKiller.imageHtml('http://a.hiphotos.baidu.com/ting/pic/item/3bf33a87e950352aa210e8635043fbf2b2118b6c.jpg');
</script>

同样是百度域名下面的图片，为什么一张可以正常显示，另一张就显示盗链呢？我们来抓包看看

显示盗链的图片

[显示盗链的图片抓包]()

正常显示的图片

[正常显示的图片抓包]()

看到了吗？正常显示的那张图片的HTTP请求中没有Referer，所以我们得到了正常的结果

那么问题来了——Referer是怎么去除的呢？

这里我用到了[referrer-killer](https://github.com/jpgerek/referrer-killer)，里面还有一个Demo，具体用法可以查看本篇博客的网页源码，或者那个Demo的网页源码。

粗看referrer-killer的原理并不复杂，动态生成了一个iframe，并在这个iframe里面加入img标签来进行显示

等等，如果仅仅是这样的话Referer依然会存在，要么是iframe父页面的地址，要么是iframe属性中src的地址，详情请戳[What is the HTTP Referer if the link is clicked in an \<iframe\>?](http://stackoverflow.com/questions/8468335/what-is-the-http-referer-if-the-link-is-clicked-in-an-iframe)

再仔细看代码，发现iframe中src的值为`javascript:"<!doctype html>......"`，原来是把iframe中的HTML代码全部放到了src中，使用这种方法就可以去掉Referer。其实乌云早有大神给出了方法，只不过没有工具化罢了，详情请戳[json hijack如何丢掉referer](http://zone.wooyun.org/content/744)，注意看[@Sogili](http://zone.wooyun.org/user/Sogili)和[@gainover](http://zone.wooyun.org/user/gainover)同学的回复。

#0x04 总结

本篇博客中的Referer和上一篇博客中涉及到的User-Agent都与HTTP协议有关。当遇到一些与底层协议相关的问题时，如果对其不了解，往往只能束手无策或者要浪费很多时间。

因此，即便`Python`提供了非常强大的功能，花时间去了解HTTP协议依然是十分必要的。