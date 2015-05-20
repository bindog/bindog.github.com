---
author: 宾狗
date: 2015-05-20 10:20+08:00
layout: post
title: "花式生成正态分布"
description: ""
categories:
- 学术
tags:
- 数学
---

#0x00 前言

>“So much of life, it seems to me, is determined by pure randomness.” – Sidney Poitier

在之前的博客中，或多或少都提到过一些随机、伪随机、随机数等等，但基本上只是直接使用，没有探寻背后的一些原理，刚好最近偶然看到`python`标准库中如何生成服从正态分布随机数的源码，所以本文就简单聊聊如何生成正态分布

<!--more-->

#0x01 均匀分布

均匀分布是生成其他分布的基础，基本上只要是个编程语言，其标准函数库里面肯定有一个随机生成$[0,1)$之间浮点数的函数，原理很简单，使用的是**线性同余法（linear congruential generator, LCG）**，依据下面这个递推公式

$$X_{n+1} = (aX_n + c ) \pmod{m}$$

其中$X$就是伪随机数序列，$X_n$是序列中第$N$个数，$a,c,m$是常数，$a$是乘数，$c$是增量，$m$是模，我们熟悉的随机种子`seed`是$X_0$

LCG的周期最大为$m$，但大部分情况都会小于$m$。要令LCG达到最大周期，应符合以下条件：

- $c,m$互素
- $m$的所有质因数都能整除$a-1$
- 若$m$是4的倍数，$a-1$也是
- $a,c,x_0$都比$m$小
- $a,c$是正整数

不过这些约束怎么来的本文就暂不讨论了

我们以`Java`中`Random`的实现为例，为了便于理解，这里对代码进行了部分调整，只截取了相关的片段

{% highlight java %}

//这两个东西在本文后面讲正态分布的时候会涉及到
private double nextNextGaussian;
private boolean haveNextNextGaussian = false;

//随机数序列生成器种子
private final AtomicLong seed;

//线性同余发生器乘数a
private final static long multiplier = 0x5DEECE66DL;

//线性同余发生器加数c
private final static long addend = 0xBL;

//线性同余发生器模数m
private final static long mask = (1L << 48) - 1;

public Random(long seed) {
    this.seed = new AtomicLong(0L);
    setSeed(seed);
}

synchronized public void setSeed(long seed) {
    //实现线性同余算法
    seed = (seed ^ multiplier) & mask;
    //atomic set具有写入（分配）volatile 变量的内存效果（即具有内存可见性）
    this.seed.set(seed);
    //暂且忽略。。
    haveNextNextGaussian = false;
}

protected int next(int bits) {
    long oldseed, nextseed;
    AtomicLong seed = this.seed;
    //ompareAndSet 如果当前值==预期值，则以原子方式将该值设置为给定的更新值（利用了CPU的硬件原语CAS指令）
    do {
    //atomic get具有读取volatile 变量的内存效果
    oldseed = seed.get();
    //实现线性同余算法
    nextseed = (oldseed * multiplier + addend) & mask;
    } while (!seed.compareAndSet(oldseed, nextseed));
    //截取bits位整型
    return (int)(nextseed >>> (48 - bits));
}

{% endhighlight %}

有人可能会有疑惑，这个代码中的实现`nextseed = (oldseed * multiplier + addend) & mask`好像和递推公式不一样啊？那个模运算为什么变成了与运算？

注意，`x&[(1L << 48)–1]`与`x(mod 2^48)`是**等价**的。为什么呢？从二进制的角度来考虑这个问题就很清楚了。

一个数`x`除以`2^n`，在二进制中相当于将`x`右移`n`位，商和余数分别在小数点左侧和右侧。

如`23/8=2`，`23%8=7`，`23`的二进制表示为`10111`，除以`2^3=8`相当于右移3位，得到`10.111`，左侧为商`10`也就是2，右侧为余数`111`也就是7

也就是说如果一个数对`2^n`取余，那么只需要得到该数的低`n`位即可，很自然的想到如果能得到这样$0\cdots0\underbrace{1 \cdots 1}_n$一个二进制数，与原来的数做与运算即可，而`2^n-1`恰好可以得到这样的一个二进制数。如`2^3-1=7`→`111`，`2^7-1=127`→`1111111`。

现在回头看看`nextseed = (oldseed * multiplier + addend) & mask`这行代码可以理解了吧？

关于均匀分布的更多细节可以参考[JDK源码分析——从java.util.Random源码分析线性同余算法](http://www.yangyong.me/jdk%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90-%E4%BB%8Ejava-util-random%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90%E7%BA%BF%E6%80%A7%E5%90%8C%E4%BD%99%E7%AE%97%E6%B3%95/)





