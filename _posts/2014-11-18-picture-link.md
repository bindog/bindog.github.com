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
- 爬虫
---

#0x00 前言



<script src="/assets/js/ReferrerKiller.js"></script>

这是一个测试

<span id="noreferer">
</span>

<script>
document.getElementById('noreferer').innerHTML = ReferrerKiller.imageHtml('http://a.hiphotos.baidu.com/ting/pic/item/3bf33a87e950352aa210e8635043fbf2b2118b6c.jpg');
</script>


这是另一个测试

![盗链提示](http://a.hiphotos.baidu.com/ting/pic/item/cdbf6c81800a19d8f33dea0031fa828ba61e46fc.jpg)


