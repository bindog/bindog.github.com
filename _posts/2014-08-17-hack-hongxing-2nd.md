---
author: 宾狗
date: 2014-08-17 17:09+08:00
layout: post
title: "红杏插件破解第二弹"
description: ""
categories:
- 工程
tags:
- 逆向
- 破解
---

#0x00 前言

其实本人已经不用红杏插件了，但是周围的小伙伴还有不少在用的，前一阵子听说红杏免费版的无法使用了，所以有几个小伙伴买了VIP，其中还有包年的！（忽然感觉周围有这样的土豪朋友好幸福呢~）不过也有几个小伙伴买不起VIP（我也买不起）而一愁莫展，然后又反映我之前写的那一篇博文废话太多，而且红杏的版本更新了……

<!--more-->

所以呢，我把原理分析什么的都去掉了，然后就有了这一篇文章。不过呢，我还是建议大家使用`GoAgent`或`ShadowSocks`配合`Chrome`的扩展`SwichySharp`科学上网，具体方法自行`Google`（你可以先用本文的方法上谷歌）

好了，在正式开始之前，我先申明几点~

1. 本文只分析破解过程，不提供下载，伸手党请`Ctrl+W`，我把作案手法和工具都给你了，剩下的就看你的了~
2. 本文还有一些问题没有解决，希望能得到大牛们的帮助，可以在下面留言或者Email~
3. 如果想了解红杏插件的更多细节，请戳[科学上网之红杏插件的原理与破解](http://bindog.github.io/%E5%B7%A5%E7%A8%8B/2014/07/03/analysis-and-hack-of-hongxin/)（因为版本更新的问题导致目录结构和某些文件名不一致，但是改动不多）

另外还有一点，首先……你得有一个……VIP账号……或者……有VIP账号的土豪朋友

#0x01 获取PAC脚本

PS:如果你想了解什么是PAC脚本的话请先戳[科学上网之红杏插件的原理与破解](http://bindog.github.io/%E5%B7%A5%E7%A8%8B/2014/07/03/analysis-and-hack-of-hongxin/)中的`0x02`部分或者问`Google`，不懂也没关系，不影响阅读

动笔写这篇文章的时候红杏的最新版本是`2.4.7`，我上传了一份在[百度网盘](http://pan.baidu.com/s/1sjJM8w9)，密码`cf8u`，这个版本比较好分析~（PS:上传这篇文章的时候发现红杏又更新了，到`2.4.10`了，这次`js`代码加了混淆，不容易看懂，但是可以对照以前的版本来看，本文就不作分析了，有兴趣的朋友自己分析一下吧，我也上传到[百度网盘](http://pan.baidu.com/s/1mgvAi2c)了，密码是`b2av`）


下载好了之后我们就得到了一个`hongxing.crx`文件，我们把后缀改成`zip`，然后解压之后的目录结构大概是这个样子

![红杏主目录](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-08-17_105953_zps52bf4dfe.png)

我们把`_metadata`这个文件夹删掉，否则一会儿加载进`Chrome`时会报错。

红杏核心的代码都在`js`这个文件夹里面，目录结构如下

<script src="https://gist.github.com/bindog/466aa8db7287896c93ac.js"> </script>

需要重点关注的几个`js`文件在注释中标了出来，首先我们打开`proxyManager.js`，完全没法看！没关系，把内容复制一下，用这个[在线工具](http://tool.lu/js/)解密一下，这里为了节省空间和美观我截取了部分代码，并调整了一下格式，你可在代码中搜索下面这部分

<script src="https://gist.github.com/bindog/929f5510318610c3c4bd.js"> </script>

只要在倒数第二行加一句`localStorage.setItem("pac", source)`就行了~

好了，把我们修改的部分保存一下，然后按照这个步骤把红杏插件加载进`Chrome`

![加载开发中的红杏](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-07-04_082317_zps00f82502.png)

剩下的过程就是用一个**VIP账号**登陆红杏，然后进入这个页面守株待兔~

![红杏主界面](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-08-17_165600_zps936acf51.png)

按`F12`打开开发人员工具，不出意外的话你应该能看到下面这个字段（看不到可以等一会或者刷新页面），正是刚才我们放到`Local Storage`里面的`pac`

![Loacl Storage](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-08-17_120718_zpsc27e1681.png)

把`pac`的值复制出来，保存到一个文件里面，比如`vip.pac`

![pac文件](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-08-17_121137_zps80ae91bb.png)

打码的部分是红杏在海外搭的代理服务器地址

然后我们用另一款`Chrome`下的拓展`SwichySharp`加载`vip.pac`（如果打不开谷歌扩展商店可以从[百度网盘](http://pan.baidu.com/s/1o6Dhdai)下载，密码`ccae`），可以看到能够科学上网了

![google](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-08-17_121543_zpsf287197b.png)

但是当我访问非`HTTPS`的网站时就不行了，这也是我没有解决的问题，希望有大牛可以帮忙

![scholar](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-08-17_121728_zps7ce16163.png)

#0x02 把自己改成VIP

如果上面的那个问题解决了就没有这个章节了，但是我是个菜（-\_-），始终没搞清楚怎么回事

这里我们还是在红杏的基础上搞破坏吧，还是`proxyManager.js`文件，我们加一行代码

<script src="https://gist.github.com/bindog/263ef943cf50bd845a3b.js"> </script>

代理服务器的地址大家按照上一个章节自行获取吧~

接下来是`userManager.js`文件，同样我截取了部分代码，也是加一行代码就行了

<script src="https://gist.github.com/bindog/b0ad984d04345ea9ecb3.js"> </script>

把所有修改保存一下，然后我们**重新加载**`DIY`的插件，这个时候就可以用**非VIP账号**登陆了，然后就是见证奇迹的时刻~Enjoy!

![twitter](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-08-17_165745_zps86ae1121.png)

![scholar](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-08-17_165759_zpsf28450d2.png)

如果你想把`DIY`之后的插件打包，请参考[科学上网之红杏插件的原理与破解](http://bindog.github.io/%E5%B7%A5%E7%A8%8B/2014/07/03/analysis-and-hack-of-hongxin/)中的`0x04`部分

#0x03 没有解决的问题

1. 获取`PAC`脚本后，用`SwichySharp`加载之后只能上`HTTPS`的网站，无法访问需要科学上网的`HTTP`网站
2. `IE`和火狐也支持`PAC`脚本，但是这个`PAC`脚本无法在这两种浏览器上使用
3. 最新版的红杏（`2.4.10`）修改了部分代码并加了混淆，不过本文`0x01`部分依然有效~但是本文`0x02`就无效了（-\_-）

#0x04 结语

之所以不提供破解版下载是希望读到这篇文章的人能自己动手去实践一下，从中学到一些东西（即使本文没有什么技术含量），本人比较菜，不过在分析这个插件的过程中也学到了不少东西，也希望大家能够进一步的去发现和解决一些问题

如果看到这篇文章的朋友知道如何解决上面的几个问题或者发现新的问题，欢迎在下面留言，分享永远是一种快乐~
