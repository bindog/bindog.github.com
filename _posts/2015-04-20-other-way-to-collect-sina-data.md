---
author: 宾狗
date: 2015-04-20 20:34+08:00
layout: post
title: "另类新浪微博基本数据采集方法"
description: ""
comments : true
categories:
- 工程
tags:
- 爬虫
---

* content
{:toc}

# 0x00 前言

有同学评论说之前[绕过新浪访客系统的方法](http://bindog.github.io/blog/2014/10/15/set-the-ua-to-bypass-sina-visitor-system)不能用了，我测试了一下，确实不能用了。原因很简单，新浪现在强制登录，没有cookie就是不行，即便是搜索引擎的爬虫也不行。








现在用谷歌搜索出来的结果是这个样子的

![google_searchweibo](http://ac-cf2bfs1v.clouddn.com/dEMKkjjsC8EblRJcVirVVTy3MqqYgDMC5ppCMLR2.PNG)

和之前的对比一下

![google weibo](http://ac-cf2bfs1v.clouddn.com/nwOvun2VS6nDBCXzG2BKWnqXQBfQMuwnhmHwwbGg.png)

百度同样也被ban了

![baidu_searchweibo](http://ac-cf2bfs1v.clouddn.com/IlT3vezrVSMOqWIVkiP7O7k2jPsp4u7K5a3Xse52.PNG)

快照里同样也是空的

那么这是不是意味着我们即使想采集一些简单的信息（网页标题、微博正文等等）也要使用**模拟登录**或者新浪**开放平台API**这样复杂的方法？

完全没必要！只要你仔细观察观察，方法其实非常简单~

# 0x01 从子域名入手

观察第一张图，可以发现下面几个结果里面是有内容的，而其中一个域名为`tw.weibo.com`，这说明新浪微博的其他子域名是没有什么限制策略的，那么这一来就很简单了，我们只要把`weibo.com`域名下的链接做一下转换，去访问对应`tw.weibo.com`下的页面即可拿到想要的数据。

这里我把新浪的一些子域名列出来供大家参考：

- [http://tw.weibo.com/](http://tw.weibo.com/)（微博台湾站）
- [http://hk.weibo.com/](http://hk.weibo.com/)（微博香港站）
- [http://us.weibo.com/gb](http://us.weibo.com/gb)（北美微博广场）
- [http://overseas.weibo.com/](http://overseas.weibo.com/)（微博国际）

那么如何把`weibo.com`域名下的链接转换成`tw.weibo.com`下的对应页面链接呢？简单在前面加一个`tw`是不行的，还需要对后面的一些参数进行转换。

# 0x02 参数转换

我们以`tw.weibo.com`为例进行说明。简单起见，这里只介绍新浪微博上的两种链接形式

## 用户主页链接

常见的用户主页链接就下面两种形式，后面一堆乱七八糟的参数可以省略……

- [http://weibo.com/rmrb](http://weibo.com/rmrb)
- [http://weibo.com/u/1758509357](http://weibo.com/u/1758509357)

对应的`tw.weibo.com`的链接为

- [http://tw.weibo.com/rmrb](http://tw.weibo.com/rmrb)
- [http://tw.weibo.com/u/1758509357](http://tw.weibo.com/u/1758509357)

用户主页的链接处理起来很简单，直接加上`tw`即可

## 某条微博链接

某条微博的链接如下，同样省略了后面的无关参数

- [http://weibo.com/2803301701/CeaOU15IT](http://weibo.com/2803301701/CeaOU15IT)

对应的`tw.weibo.com`的链接为

- [http://tw.weibo.com/2803301701/3833781880260331](http://tw.weibo.com/2803301701/3833781880260331)

如果对新浪开放平台的API不陌生的话，可知`2803301701`为用户的`uid`，`uid`是一个用户的唯一标识。

`CeaOU15IT`为这条微博的`mid`，与之相对应的还有一个`id`，`id`是一条微博的唯一标识，由于`id`比较长，为了缩短url对`id`进行了转换变成了`mid`。`CeaOU15IT`对应的`id`为`3833781880260331`

那么问题来了，这个`id`如何计算呢？如果是以前，可以直接调用新浪的API进行转换，但是现在新浪对这个简单的API也是强制授权，而且还有次数限制……

好在这个转换的原理并不复杂，就是一个62进制的转换，把下面的代码保存为`base62.py`，后面的过程要用到

{% highlight python %}

ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

def rsplit(s, count):
    f = lambda x: x > 0 and x or 0
    return [s[f(i - count):i] for i in range(len(s), 0, -count)]

def id2mid(id):
    result = ''
    for i in rsplit(id, 7):
        str62 = base62_encode(int(i))
        result = str62.zfill(4) + result
    return result.lstrip('0')

def mid2id(mid):
    result = ''
    for i in rsplit(mid, 4):
        str10 = str(base62_decode(i)).zfill(7)
        result = str10 + result
    return result.lstrip('0')

def base62_encode(num, alphabet=ALPHABET):
    """Encode a number in Base X
    `num`: The number to encode
    `alphabet`: The alphabet to use for encoding
    """
    if (num == 0):
        return alphabet[0]
    arr = []
    base = len(alphabet)
    while num:
        rem = num % base
        num = num // base
        arr.append(alphabet[rem])
    arr.reverse()
    return ''.join(arr)

def base62_decode(string, alphabet=ALPHABET):
    """Decode a Base X encoded string into the number
    Arguments:
    - `string`: The encoded string
    - `alphabet`: The alphabet to use for encoding
    """
    base = len(alphabet)
    strlen = len(string)
    num = 0

    idx = 0
    for char in string:
        power = (strlen - (idx + 1))
        num += alphabet.index(char) * (base ** power)
        idx += 1
    return num

if __name__ == '__main__':
    print mid2id('CeaOU15IT')
    print id2mid('3833781880260331')

{% endhighlight %}

# 0x03 繁简转换

由于我们访问的页面是微博台湾站，因此页面上的内容都是繁体中文的，因此需要做下转换，比较好的就是大名鼎鼎的`opencc`了，可以到[这里](https://pypi.python.org/pypi/opencc-python/)下载安装，使用起来也非常简单~

# 0x04 实战

废话不多说，直接看代码吧~

{% highlight python %}

# -*- coding: utf-8 -*-
import requests
from bs4 import BeautifulSoup
import re
import opencc
import base62

rawurl = "http://weibo.com/2803301701/CeaOU15IT"
cc = opencc.OpenCC("t2s")

p = re.compile(r"weibo\.com/(\d+)/(\w+)")
m = re.findall(p,rawurl)
if m:
    uid = m[0][0]
    mid = m[0][1]
    id = base62.mid2id(mid)
url = "http://tw.weibo.com/{0}/{1}".format(uid,id)
print u"微博台湾站链接:{0}".format(url)

user_agent = {'User-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'}
r = requests.get(url,headers=user_agent)
soup = BeautifulSoup(r.text)
name = soup.find("div","name")
t_name = name.h1.a.text
s_name = cc.convert(name.h1.a.text)
link = name.h1.a["href"]
weibotext = soup.find("p",id="original_text")
t_weibotext = weibotext.text.strip()
s_weibotext = cc.convert(weibotext.text.strip())

print u"繁体中文版-->\n用户:{0}\t用户主页:{1}\n微博内容:{2}".format(t_name,link,t_weibotext)
print u"简体中文版-->\n用户:{0}\t用户主页:{1}\n微博内容:{2}".format(s_name,link,s_weibotext)

# 输出
# 微博台湾站链接:http://tw.weibo.com/2803301701/3833781880260331
# 繁体中文版-->
# 用户:人民日報    用户主页:http://tw.weibo.com/rmrb
# 微博内容:【「最有情懷辭職信」當事人：辭職非衝動 會對未來負責】「世界那麼大，我想去看看。」10字辭職信當事人、河南省實驗中學女教師顧少強19日表示，辭職並非衝動之舉，而是經過理性考慮。「我會對未來的人生負責。」採訪中，顧少強不時強調「每個人都有選擇自己生活方式的權利」。http://t.cn/RAOeU6q
# 简体中文版-->
# 用户:人民日报    用户主页:http://tw.weibo.com/rmrb
# 微博内容:【「最有情怀辞职信」当事人：辞职非冲动 会对未来负责】「世界那么大，我想去看看。」10字辞职信当事人、河南省实验中学女教师顾少强19日表示，辞职并非冲动之举，而是经过理性考虑。「我会对未来的人生负责。」采访中，顾少强不时强调「每个人都有选择自己生活方式的权利」。http://t.cn/RAOeU6q

{% endhighlight %}

# 0x05 总结

又是子域名，在很多漏洞和入侵的过程中，子域名和旁站都扮演着非常重要的角色，这是不是也给我们敲响了警钟呢？在升级一些安全策略的时候，有没有覆盖到子域名上呢？

从另一角度来说，只要你善于挖掘，没有什么系统是坚不可摧的~