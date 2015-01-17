---
author: 宾狗
date: 2014-09-07 00:21+08:00
layout: post
title: "ShadowSocks免费账号获取&测试工具"
description: ""
categories:
- 工程
tags:
- 工具
- Python
---

#0x00 前言
PS:本文获取的账号全部来自[ShadowSocks公益组织](https://www.shadowsocks.net/)，套用他们官网的话，再次感谢那些无私奉献ShadowSocks帐号的人！

对实现细节不感兴趣的朋友可以直接拖到最后，有下载链接~

<!--more-->

关于ShadowSocks这里不再多说了，用途很多，比如科学上网=。=如果你没有用过的话，推荐你看看[ShadowSocks—科学上网之瑞士军刀](http://www.jianshu.com/p/08ba65d1f91a)，里面说的非常详细。当然，说来说去账号是关键，要么是你自己搭一个服务器，自己设定端口、密码和加密方式等等，要么就使用一些别人共享的免费账号，比如可以去[ShadowSocks公益组织](https://www.shadowsocks.net/)这个网站上去找一些账号。

无奈的是，由于各种各样的原因，其中很大一部分账号是不能用的，而且网站上给出参考的可用率也不太靠谱，所以最稳妥的办法是自己一个一个试。但是！这些账号信息不是直接写在网页上的，有两种获取方式。一种是通过二维码获得，解码出来是`Base64`，还要进行一次解码，这种方式主要是方便手机用户使用ShadowSocks的APP。另一种方式是填上你的邮箱和一个验证码，系统会自动给你的邮箱发一封邮件，里面包含了配置信息。

一句话概括，获取一个账号很麻烦，还要不停的复制粘贴，最后发现这个账号是不能用的……我常常花上半个小时还找不着一个可用的账号=。=

于是乎，我写了这么一个小工具，一开始写了个`Java`版的，主要使用了`HTTPClient`，也遇到了许多问题（如`HTTPClient`怎样使用`SOCKS`代理、`HTTPS`忽略证书等等），如果大家感兴趣的话，可以在底下留言~

由于最近正在学习`Python`，所以后来又写了一个`Python`版的，果然`Python`是挺方便的，代码量可能还不到`Java`版的十分之一。不过由于我也是初学者，代码也写的比较渣，大神请无视

好了，废话不多说了，我们来看看怎么来写这么一个小工具

#0x01 步骤
整体思路其实很简单~

1. 获取网站上所有的二维码
2. 解析二维码获得账号信息
3. 配置账号信息并测试延迟
4. 把可用的账号输出到文件

##获取网站上所有的二维码

<script src="http://gist.stutostu.com/bindog/2b24e2c11e2fe37b4de8.js"> </script>

这个没什么好说的，就是正则表达式匹配

##解析二维码获得账号信息

<script src="http://gist.stutostu.com/bindog/8e0536716fe7e8b5f7b9.js"> </script>

这里我将所有二维码下载到`qrcode`这个文件夹中，`Python`中有许多二维码生成的库，但是二维码解析的库很少而且安装起来都比较麻烦。所以有两种偷懒的办法，一种是使用在线的`API`服务，国外有一个叫QR code API，国内有草料API，不过我都没用过=。=另一种办法就是我这里用的了，使用现成的命令行工具~

值得注意的是`Python`中`subprocess`的用法，具体来说就是怎么获取控制台输出，这些在代码中都有，也不多说了

随后的过程就是`Base64`解码以及转换成`JSON`了，至于为什么要转换成`JSON`往下看就知道了

##配置账号信息并测试延迟
账号什么的都有了，下面就差测试延迟了

<script src="http://gist.stutostu.com/bindog/83b66002ca62ba83d8bf.js"> </script>

这里我测试的是平均延迟，这样结果可靠一点，测试的是`Google`和`Twitter`，都是被墙的=。=

ShadowsSocks的客户端程序多种多样，毕竟人家是开源的嘛~程序中用到的是比较简单的一种，就是一个控制台程序`shadowsocks-local.exe`，会自动寻找当前目录下的`config.json`文件(知道为啥要转换成`JSON`了吧)，也可以通过`-c`参数指定配置文件

最后，输出到文件就不列代码了，具体可以参考完整代码

#0x02 urllib2使用socks代理
刚才说了说整体流程，但是还有一个很重要的环节没有涉及到，那就是程序中如何使用`socks`代理，这可不是启动了`shadowsocks-local.exe`就行了，毕竟不是`VPN`=。=

Google了一下发现了如下解决方案，使用[SocksiPy](http://sourceforge.net/projects/socksipy/)这个模块就可以了~

{% highlight python %}

import socks
import socket
socks.setdefaultproxy(socks.PROXY_TYPE_SOCKS5, "127.0.0.1", 1080)
socket.socket = socks.socksocket
import urllib2
print urllib2.urlopen('http://www.test.com').read()

{% endhighlight %}

可是后来我发现，访问`Twitter`和`Fackbook`这样的网站时程序依然会报错(即使是使用经测试可用的账号)，同时访问国内的网站是没有问题的，显然矛头又指向了可爱的`GFW`

后来在`Stack Overflow`上找到了答案，`httplib.HTTPConnection`会使用`socket`模块中的`create_connection`函数来建立`socket`连接。但是在建立`socket`连接之前，这个函数是通过普通的`getaddrinfo`来进行`DNS`查询的……

好吧，果然是我们可爱的`GFW`，它有一个非常IMBA的技能叫作**DNS污染**，也就是说如果你不使用特殊渠道进行`DNS`解析的话，它会把`Twitter`和`Fackebook`的IP地址解析到火星上去，程序不报错才怪呢=。=

怎么办呢，也很简单，我们自己实现一个`create_connection`函数，然后PATCH到`socket`模块里面就可以了

{% highlight python %}

import socks
import socket
def create_connection(address, timeout=None, source_address=None):
    sock = socks.socksocket()
    sock.connect(address)
    return sock
socks.setdefaultproxy(socks.PROXY_TYPE_SOCKS5, "127.0.0.1", 1080)
socket.socket = socks.socksocket
socket.create_connection = create_connection

{% endhighlight %}

其实也没有多复杂啦，只不过把原来的`sock`替换为我们导入的模块中的`socks.socksocket()`，让它来接管`DNS`查询、连接等后续操作，最后返回可用的`socket`就可以了

#0x03 资源下载
最后就是发福利了~

##说明

1. 源码中运行`SSAccount.py`即可，此外我用`PyInstaller`将程序打包成了一个`exe`工具，方便没有安装`Python`的小伙伴
2. `zbar`和`shadowsocks`文件夹中存放的是文中提到的两个命令行工具
3. 程序执行完成后会生成一个`available.txt`，里面有可用账号和延迟信息
4. 你可以把可用账号信息复制到`config.json`中，运行`shadowsocks-local.exe`来上网，当然也可以使用`Shadowsocks GUI`这种带界面的客户端
5. 具体怎么配置浏览器使用ShadowSocks上网请参考[ShadowSocks—科学上网之瑞士军刀](http://www.jianshu.com/p/08ba65d1f91a)

##下载地址
* [源码](http://pan.baidu.com/s/1mgr6XPu)，密码是`2i9y`
* [EXE工具](http://pan.baidu.com/s/1qWCx2MC)，密码是`apef`
* [SwitchySharp.crx](http://pan.baidu.com/s/1o6Dhdai)，密码是`ccae`

