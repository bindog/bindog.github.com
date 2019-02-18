---
author: 宾狗
date: 2017-02-02 22:12+08:00
layout: post
title: "与前端工程师的较量——Chrome调试工具进阶技巧"
description: ""
mathjax: true
categories:
- 工程
tags:
- 安全
---

* content
{:toc}

> 窥探我的内心是非常危险的事情
——卫庄 《秦时明月之万里长城》

## 0x00 前言

无论代码写的好与坏，相信没有哪个程序员愿意主动让别人"欣赏"自己的代码。对于做后端开发的同学这完全不是问题，用户（或者不怀好意的人）很难直接接触到他们所写的代码。而对于搞前端开发的同学来说，这却是一个几乎无解的难题，因为他们所写的JavaScript代码是要在用户浏览器上执行的，总不能把这些代码也藏在服务器上吧？

所以，某些“邪恶”的前端工程师想到，既然一定要把代码给别人看，何不干脆把代码搞的恶心一点，增加别人阅读和分析代码的难度。

于是乎，就有了这样的一篇文章，本文介绍了几种我在实际中用到的Chrome调试技巧，适用于那些想“窥探”前端工程师内心的人，当然也适用于做爬虫的同学们。默认读者已经熟知JavaScript的各种语法和灵活的用法，并且会使用Chrome开发人员工具。






<!--CTF中的复杂js调试
对象下载
断点
cookie变化(Linux版Chrome有效 Version 59.0.3071.115 (Official Build) (64-bit))
-->


## 0x01 将JavaScript中的对象保存到本地

在某些场景中，一些JavaScript的对象非常复杂，虽然可以使用Chrome开发人员工具进行查看，但在这个小小的界面中查看还是有诸多不便。如果能够将这个对象保存到本地，直接使用文本编辑查看就非常方便了。

另一种场景是，当我们使用JavaScript编程时，希望将一些运算结果导出，虽然现在`HTML5`中提供了`localStorage`这样的特性，但有的时候依然不够方便。记得在制作某一期课程时，使用JavaScript实现了一个强化学习算法，最后一直苦于无法将训练好的Q矩阵导出到文件中，最后无奈只得先保存到`localStorage`中，再一点点`Ctrl+C`复制出来。

说了这么多，遗憾的是，Chrome调试器并没有这样的一个功能。

还好，已经有可爱的外国网友实现了这样的一个功能，在Chrome的`console`中输入如下代码：

```js
(function(console){

    console.save = function(data, filename){

        if(!data) {
            console.error('Console.save: No data')
            return;
        }

        if(!filename) filename = 'console.json'

        if(typeof data === "object"){
            data = JSON.stringify(data, undefined, 4)
        }

        var blob = new Blob([data], {type: 'text/json'}),
            e    = document.createEvent('MouseEvents'),
            a    = document.createElement('a')

        a.download = filename
        a.href = window.URL.createObjectURL(blob)
        a.dataset.downloadurl =  ['text/json', a.download, a.href].join(':')
        e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
        a.dispatchEvent(e)
    }
})(console)
```

当我们调试到某一行，希望将某个对象保存到本地时，直接在`console`中输入` console.save(ObjName, FileName)`即可，该对象即以`json`文本的形式存储到默认的下载目录中了。

## 0x02 前端调试时断点设置技巧

对爬虫工程师来说，网页中的静态内容都比较好获取，直接读取网页源码即可。而在动态网页中，一些内容是动态加载的，需要分析其数据来源并找到相应的Javascript代码。而在前端加载的js文件较多时，代码量非常庞大，逐行阅读既不现实也不必要，在这种情况下，如何快速定位到关键代码，断点的设置技巧就显得尤为重要。

简单的断点设置方法就不多说了，在`Sources`页面打开想调试的Javascript文件，在行号上点击一下就设置好了断点。这里主要介绍两种我常用的方法。

### 标签断点

先举一个简单的例子，假设查看网页源码时有这样一段代码

```html
<div id="anchorpoint" class="xxx"></div>
```

而在页面渲染完成后，通过右键审查元素时发现代码变成如下形式

```html
<div id="anchorpoint" class="xxx">
<div>keyinformation</div>
</div>
```

其中keyinformation是我们需要采集的内容，这时即可采用标签断点的方式快速定位到相应的Javascript代码段，方法非常简单，在审查元素的选项卡最下方有一个断点选项，如图所示

![标签断点三个选项](http://lc-cf2bfs1v.cn-n1.lcfile.com/e6d02624018934dae6d7.png)

根据实际情况选择相应的断点，对刚才我们所举的例子，选择第一项即可。然后在网页上进行操作，当有Javascript代码尝试修改该标签及其子孙结点时就会断下，这样我们就定位到关键代码了。

### 事件断点

事件断点的类型就非常丰富了，基本你能想到的断点都包含在内，如下图所示。做前端开发的同学应该会比较熟悉这些功能。

![事件断点截图](http://lc-cf2bfs1v.cn-n1.lcfile.com/d21580918c63f3ae9950.png)

对于爬虫工程师而言，主要关注`Script`和`XHR`这两个选项下的事件就行了。`XHR`不用多说，即`XMLHttpRequest`，大家一般也比较关注它，很多关键数据都是通过它拿到的，与`XHR`相关的操作这里基本都囊括了。

重点看下`Script`选项下的事件，有一个断点叫`Script First Statement`，即在脚本第一次申明的时候断下来，通俗来说就是遇到`<script>`标签就会断下来。在实践过程中非常有用，我经常拿它与标签断点配合起来使用。

因为有时候标签断点存在一些局限性，当设下断点时页面已经渲染完成，而有的标签在页面渲染过程中就已经发生了变化，此时下断点就是白费功夫。那能不能在页面渲染完成之前设置断点呢？或者说能不能在页面渲染过程中暂停，给我们留出时间下标签断点？这就需要`Script First Statement`进行配合了，激活这个断点后刷新页面，跳过前面若干个Javascript脚本(具体数量与该网页加载的脚本个数相关)，此时可以在`Elements`选项卡和`Sources`选项卡之间来回切换，注意观察`Elements`中的内容，直到我们关注的标签在`Elements`选项卡中出现(此时应该是未被修改过的)，然后下标签断点，并取消`Script First Statement`断点，最后恢复脚本的执行，再次断下时就定位到修改该标签的代码位置了。

## 0x03 捕获cookie变化

刚才介绍的两种方法已经可以解决大多数问题了，但是还有一些情况比较棘手，比如Javascript修改了cookie，但是在哪里修改的很难通过刚才的方法快速定位出来，不过又有可爱的外国网友通过辅助脚本解决了这个问题。项目地址：https://github.com/paulirish/break-on-access

```js
function breakOn(obj, propertyName, mode, func) {
    // this is directly from https://github.com/paulmillr/es6-shim
    function getPropertyDescriptor(obj, name) {
        var property = Object.getOwnPropertyDescriptor(obj, name);
        var proto = Object.getPrototypeOf(obj);
        while (property === undefined && proto !== null) {
            property = Object.getOwnPropertyDescriptor(proto, name);
            proto = Object.getPrototypeOf(proto);
        }
        return property;
    }

    function verifyNotWritable() {
        if (mode !== 'read')
            throw "This property is not writable, so only possible mode is 'read'.";
    }

    var enabled = true;
    var originalProperty = getPropertyDescriptor(obj, propertyName);
    var newProperty = { enumerable: originalProperty.enumerable };

    // write
    if (originalProperty.set) {// accessor property
        newProperty.set = function(val) {
            if(enabled && (!func || func && func(val)))
                debugger;
            
            originalProperty.set.call(this, val);
        }
    } else if (originalProperty.writable) {// value property
        newProperty.set = function(val) {
            if(enabled && (!func || func && func(val)))
                debugger;

            originalProperty.value = val;
        }
    } else  {
        verifyNotWritable();
    }

    // read
    newProperty.get = function(val) {
          if(enabled && mode === 'read' && (!func || func && func(val)))
            debugger;

        return originalProperty.get ? originalProperty.get.call(this, val) : originalProperty.value;
    }

    Object.defineProperty(obj, propertyName, newProperty);

    return {
      disable: function() {
        enabled = false;
      },

      enable: function() {
        enabled = true;
      }
    };
};
```
使用方法也很简单，利用`Script First Statement`在页面渲染之前断下之后，在`console`中输入上面的代码并回车，此时若想监控cookie的变化情况，输入`breakOn(document, 'cookie');`，然后取消`Script First Statement`断点，恢复脚本执行，再次断下时通过右侧的`Call Stack`即可找到修改cookie的Javascript代码

<!--(Chrome版本问题？)-->

## 0x04 小结

本文介绍了若干Chrome进阶调试技巧(很多基本的调试功能如 `Step in` `Step over`不再赘述)，能够帮助大家在调试过程中节省时间，少走弯路。但是具体在调试过程中如何去阅读分析代码就要靠自身的经验和积累了，不过只要Javascript的基础打牢，多去调试分析，自然会熟悉。

还有的同学想知道这么多神奇的小脚本上哪里去找，这就要经常去Google或者Github上淘金了，我再提供一个收集了很多有用小脚本的网站：[DevTools Snippets](http://bgrins.github.io/devtools-snippets/)，里面包含了一些诸如以表格形式显示当面页面HTTP请求头或者cookie等功能的小脚本，有兴趣的同学可以收藏起来。

如果你觉得本文对你有帮助，欢迎打赏我一杯咖啡钱，支持我写出更多好文章~

![](/assets/images/qrcode.png)

## 参考资料

- [How to save the output of a console.log(object) to a file?](https://codedump.io/share/P4GmEDAp7wX3/1/how-to-save-the-output-of-a-consolelogobject-to-a-file)
- [https://github.com/paulirish/break-on-access](https://github.com/paulirish/break-on-access)

