---
author: 宾狗
date: 2014-07-04 00:02+08:00
layout: post
title: "科学上网之红杏插件的原理与破解"
description: ""
categories:
- 工程
tags:
- 逆向
- 破解
---

#0x00 前言
众所周知，最近谷歌被封堵的很厉害，什么Gmail啊、谷歌地图啊全都无法使用。当然对我们在校的学生来说，这些用不了我也就忍了，但是谷歌学术用不了你让我怎么搞科(chao)研(xi)，I cannot endure!
<!--more-->

![大酒神从零Rap之我不能忍](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/vlcsnap-2014-07-05-00h44m17s24_zps95c39cba.png)

好在办法总是有的，代理、VPN、GoAgent（最近好像也用不了了），这些东西小伙伴们应该都非常熟悉。但是俗话说的好，“天下没有免费的午餐”，如果你用的是免费的代理或者VPN，那速度简直无法直视，相信这点小伙伴们也深有体会。那么有没有一种配置简单、速度流畅的方法呢，当然有了，这就是今天被拿来开刀的主角——[红杏](http://honx.in/i/U7PWaIKo11ScYOMI)，这货居然还是邀请机制，前面那个链接是我的邀请链接，大家如果付费的话就便宜我了哦(^_^)

#0x01 初识红杏
其实在我看来，“科学上网”并不是什么很复杂的事情，代理、VPN的配置方法对一个爱折腾的人来说应该是非常简单的事情，所谓配置复杂不过是懒人的借口罢了。红杏其实也没有官方宣传的那么神奇的，只不过是赚一些懒人的钱罢了。相信看完这篇文章之后你也能有这种感觉~

不过这里不得不说红杏的宣传主页做的还是非常炫的，是基于`CSS`的一个网页幻灯片，如果感觉兴趣的话可以谷歌搜索`reveal.js`。好了我们言归正传，红杏其实就是Chrome的一个插件，如果你从刚才选择了下载离线安装包的话，就得到了一个`crx`格式的文件，安装方法也很简单，在`Chrome`的地址栏输入`chrome://extensions/`，然后将`crx`文件拖动到这个页面上就可以了，之后注册一个账号，登录成功之后就可以看到下面这个页面了

![红杏主界面](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/06ce278a-acab-432a-b6a7-01a8f4ab66db_zpsaead6d66.png)

红杏的具体使用方法官网已经讲得很详细了，由于我是非VIP用户，因此不能添加自己的科学上网列表，不过谷歌学术已经可以正常访问了~

![熟悉的谷歌学术又回来了](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-07-02_185542_zps9346a1c0.png)

#0x02 红杏的原理

那么红杏到底是怎么工作的呢，它的原理是什么呢？下面我们先通过`Wireshark`一探红杏背后的秘密。启动`Wireshark`进行抓包，然后用`Chrome`访问Google，在`Wireshark`中得到如下结果

![Wireshark抓包结果](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-07-07_074429_zps58f92b06.png)

熟悉`openSSL`的同学一定对这些数据包不陌生，虽然说`Wireshark`支持对`SSL`协议进行解密，但是前提是你得有服务器的私钥啊，只恨当初openSSL爆出漏洞时没有行动(>_<)

既然没有私钥，显然用Wireshark抓包的方法是行不通了，那么我们换个思路，从`Chrome`浏览器入手，利用`Chrome`自带的开发人员工具进行尝试
##**登录过程**
由于最近对登录过程比较感兴趣，因此先从登录过程入手了。先进入红杏的登录界面，从登录界面可以看出它是先验证用户名是否有效

![红杏的登录界面](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-07-04_073845_zps65c0b292.png)

然后按F12打开开发人员工具，切换到Network选项卡，输入用户名之后点击登录，得到如下结果

![验证用户名的数据包](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-07-04_074335_zpsef706919.png)

响应非常简单`{"exists": true}`，表示该用户存在
接着输入密码，注意勾选`Preserve log`，否则页面跳转之后就无法看到数据包了，登录成功之后得到如下数据包

![验证用户名和密码的数据包](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-07-04_074816_zps0415e7db.png)

采用的是`HTTPS`协议，因此明文密码也就无所谓了(-_-)，响应如下

{% highlight js %}
{
	"name": "test@test.com",
	"level": null,
	"no_password": false,
	"anonymous": null,
	"sid": "DA1D666B-20140627-xxxxxx-xxxxxx-xxxxxx",
	"inviter": "someone@test.com",
	"until": null
}
{% endhighlight %}

大部分的`value`看`key`的名字就知道是什么含义，这里解释一下`level`是红杏用来标识用户VIP等级的一个字段，免费用户、包月、包年用户的值是不一样的，后面分析红杏的原理时还会涉及到这个`level`。`sid`是红杏为每一个用户生成的ID号，其中还可以看到注册日期
##**代理过程**
好了，分析完登录过程下面来看看红杏是如何实现代理的，打开一个新的标签页和开发人员工具，进入谷歌首页，可是却发现开发人员工具的`Network`选项卡中只有`google.com`数据包，没有和代理相关的线索

![没有代理的数据包](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-07-07_074243_zps3d43c5aa.png)

其实也没有什么好惊讶的，开发人员工具毕竟不是万能的，主要是供前端工程师使用的，代理的过程对它来说是透明的，我们自然就看不到代理的过程

那么怎么办呢，`Wireshark`和开发人员工具都无能为力，只能用“逆向”的手段了，之所以打上引号是因为并非真正的逆向。说起逆向，小伙伴们是不是立刻想起了神器`Ollydbg`和`IDA`？不过`crx`文件的逆向可没有那么复杂，因为这货就是个特殊的`zip`文件，把之前下载的`hongxin.crx`改成`hongxin.zip`并解压就得到了下面的这些文件

![解压后的一些文件](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-07-04_080440_zpsc0f6853c.png)

其中文件夹的名称已经告诉了我们里面文件的作用，这里也就不再啰嗦了。红杏插件的主要逻辑代码都在js文件夹中，里面全是一些javascript文件，一开始我还以为这些js文件经过了混淆（就是把里面的函数名和变量名替换成“火星文”），后来发现只是做了简单的`eval`编码(严格来说不能算加密)和压缩，用一个[Javascript在线工具](http://tool.lu/js/)，点击解密即可把代码还原

还原完代码后，我们怎样从这么多js文件中找到与代理过程相关的那个文件呢？一般来说，文件名很大程度上反映了它的功能（程序员都这么干，除非你跟自己过不去或者和团队的人过不去）,所以我们直接搜`proxy`，在`js\services\`目录下找到了一个`proxyManager.js`，直觉告诉我们就是它了！代码有大概400多行，这里我贴几段比较重要的代码段

<script src="https://gist.github.com/bindog/8523971ed42eba49364c.js"> </script>

其实看到`chrome.proxy.settings.set`就知道这肯定和代理设置相关了，在谷歌上一搜就找到一篇关于[开发Chrome代理扩展程序](http://lmk123.duapp.com/chrome/extensions/proxy.html)的文档，里面说的非常详细。注意后面的`generatePacScript`函数，其生成了一段`pac`脚本（关于`pac`脚本的知识刚才的那篇文档里也有涉及），其实就是一段简单的程序，告诉浏览器访问哪些网址的时候用什么代理。这段`pac`脚本就是红杏的“秘密”，如下

<script src="https://gist.github.com/bindog/3d34bb38d48f59550a96.js"> </script>

事实上我们把这段脚本保存下来，使用另一款`Chrome`扩展`SwitchySharp`，并将这段脚本导入到`SwitchySharp`中同样可以实现代理功能！不过在访问一些没有使用`HTTPS`协议的网址如`http://scholar.google.com`时会出问题（暂时还不清楚原因-_-），但是像`https://www.google.com`或者`https://twitter.com`这样的网址是没有问题的~

##**获取代理服务地址过程**
刚才那段`pac`脚本中最重要的内容当然是代理服务器的地址了，那么好奇的小伙伴们一定想知道红杏插件是从哪里获取这个地址的呢？如果是固化在代码里面的话岂不是可以知道红杏插件所有代理服务器的地址（包括传说中VIP用户专享的代理服务器），当然这只不过是我们一厢情愿的YY，除非程序员的脑子进水了，不然怎么可能把这么重要的秘密写在程序里，而且万一哪天服务器宕机或者换地址了，岂不是要重写程序？所以可以肯定代理服务器的地址一定是动态获取的。通过**反复的阅读代码和调试**，终于找到了这个关键代码段，下面简述一下过程

首先，在`js\app.js`中发现了这样两行代码

{% highlight js %}
SERVER = 'ddparis.com';
API_URL = "wss://" + SERVER + ":443/red/extension";
{% endhighlight %}

猜测`API_URL`可能和获取一些参数有关。注意`wss://`，这个应该称之为安全的`WebSocket`协议,与之相对应的是`ws://`（类似`http://`和`https://`的关系），关于`WebSocket`的知识可以参考[维基百科的解释](http://zh.wikipedia.org/wiki/WebSocket)，简单来说就是一种客户端和服务器快速交互数据的方式。`WebSocket`一旦建立连接，服务器便可直接向客户端发送消息，与传统的`HTTP`请求/响应式的协议是不一样的

接着，我在`js\services\server.js`中发现了这样一行代码

{% highlight js %}
client = RedSockClient.create(API_URL);
{% endhighlight %}

这行代码以`API_URL`作为参数并将线索指向了`js\services\RedSockClient.js`这个文件，从名字能大概能猜出是和服务器通信相关的，其中有如下代码段

<script src="https://gist.github.com/bindog/c2536c3109d9b124d93d.js"> </script>

这里我采用了一个笨方法`alert()`进行调试，得到如下结果

![动态获取到代理服务器地址](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-07-03_150309_zpsf27df604.png)

因为代理服务器的地址是由`ddparis.com`这个服务器发到红杏上的，所以除非通过欺骗`ddparis.com`的方式，否则很难拿到VIP用户专享代理服务器的地址，但是具体怎么欺骗还需要分析它们之间的通信过程，这个以后可以进一步分析

#0x03 红杏的破解
人总是在追求完美的路上不断成长的，看着刺眼的非VIP心里还是有那么一点不舒坦的，事实上通过前一个部分对红杏原理的分析，可以有N种方法破解红杏，当然也只是针对其功能限制的破解，想要拿到VIP服务器的地址可以掏10块钱买一个月的VIP，然后按照前面的方法就可以获取到了(-_-)

限于篇幅，这里提供一种最简单的办法。在前一个部分的`js\services\RedSockClient.js`中，有`name=_ref[2]`，刚才我们说了`_ref[2]`为`proxies`的情况。当`_ref[2]`的值为`profile`时，`data`的字符串形式如下

![data图片](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-07-04_092819_zps08522c28.png)

是不是又看到了前文提到的`level`？再看`js\services\userManager.js`中的如下代码段

<script src="https://gist.github.com/bindog/f759d4e3fc47595ae4fb.js"> </script>

结合代码和`data`的格式我们可以知道红杏是如何判定用户身份的，破解也非常容易，在`return`语句前加一句`$rootScope.user.role = ROLES.VIP`就行了。重新加载插件后你就可以发现讨厌的非VIP用户已经没有了，也可以开启“一直模式”和编辑科学上网列表了

![破解成功图](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-07-04_081232_zps2245a040.png)

#0x04 其他细节
##**Chrome插件调试**
好吧，发现说了这么久一直没有讲怎么调试`Chrome`插件，其实非常简单，把`crx`文件改成`zip`后缀并解压到一个文件夹中(注意该文件夹以及其父目录最好都不要有中文)，在`Chrome`的地址栏输入`chrome://extensions/`，然后勾选开发人员模式，点击加载正在开发的扩展程序，选择刚才解压的那个文件夹即可。对代码修改之后，重新加载一下插件或者重启Chrome都可以，然后就可以观察修改的效果了

![过程图](http://i1378.photobucket.com/albums/ah103/bind0g/hackhongxin/2014-07-04_082317_zps00f82502.png)

##**Chrome插件打包**
修改完成之后，打包也非常简单，还是刚才那个页面，点击打包扩展程序，选择扩展程序所在根目录，点击打包扩展程序即可，最后会生成一个`crx`文件和一个`pem`文件（私钥文件）
##**将自己DIY的插件添加到白名单**
`Chrome`从33开始，就不在再支持安装第三方插件，不过我们可以直接拖拽刚才生成的`crx`文件到 `chrome://extensions/`来突破安装，但是很快发现`google play`可以通过检测，发现我们修改过的扩展程序不是在应用商店下载的而直接把插件停用，且无法启用，表现为灰色，只能删除。具体解决方案可以点击[这里](http://www.vip5k.com/3000.html)，其中用到了一个`chrome.adm`文件，可以点击[这里下载](http://dl.vmall.com/c0qh2eahsu)

#0x05 总结
看到这里，你是不是也觉得红杏插件没什么神秘的呢？下面我们回顾一下关键点
1.  SSL是一个非常安(fan)全(ren)的协议(-_-)
2. CRX文件→解压→源代码(-_-)，Javascript代码能混淆还是混淆一下吧
3. PAC脚本可以用于配置浏览器的代理，IE和火狐也支持哦~

其他一些东西，像`HTML5`、`Local Storage`、`WebSocket`还是很有意思的，小伙伴们有兴趣可以多关注一下~

#0XFF 扩展阅读
下面是与本文相关的一些文章，值得一读

* [HTTP代理与SPDY协议](http://blog.jobbole.com/42763/)
* [PAC脚本的编写](http://www.360doc.com/content/12/0618/16/2633_219014023.shtml)
* [JS脚本混淆、加密专题讨论](http://bbs.blueidea.com/forum.php?mod=viewthread&tid=2440360)
* [分析HTML5中WebSocket的原理](http://www.qixing318.com/article/643129914.html)
* [HTML5 LocalStorage 本地存储](http://www.cnblogs.com/xiaowei0705/archive/2011/04/19/2021372.html)