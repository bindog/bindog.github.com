---
author: 宾狗
date: 2018-02-11 09:20+08:00
layout: post
title: "凭什么相信你，我的CNN模型？（篇二：万金油LIME)"
description: ""
mathjax: true
categories:
- 学术
tags:
- 深度学习
---

* content
{:toc}


## 0x00 背景

在上一篇[文章](http://bindog.github.io/blog/2018/02/10/model-explanation/)中，我们介绍了多种解释CNN模型的分类结果的方法，也提到了他们共同的局限性：当模型对我们来说完全为一个黑盒时就无能为力了。针对这个问题，本文介绍另一套办法，即使我们对模型一无所知也能够对它的行为作出解释。






## 0x01 LIME

[LIME](http://www.kdd.org/kdd2016/papers/files/rfp0573-ribeiroA.pdf)是KDD 2016上一篇非常漂亮的论文，思路简洁明了，适用性广，理论上可以解释任何分类器给出的结果。其核心思想是：对一个复杂的分类模型(黑盒)，在**局部**拟合出一个简单的可解释模型，例如线性模型、决策树等等。这样说比较笼统，我们从论文中的一张示例图来解释：

![LIME](https://github.com/bindog/bindog.github.com/assets/8023481/92612fb0-aa6e-43ff-93e0-80339a193069)


如图所示，红色和蓝色区域表示一个复杂的分类模型（黑盒），图中加粗的红色十字表示需要解释的样本，显然，我们很难从全局用一个可解释的模型（例如线性模型）去逼近拟合它。但是，当我们把关注点从全局放到局部时，可以看到在某些局部是可以用线性模型去拟合的。具体来说，我们从加粗的红色十字样本周围采样，所谓采样就是对原始样本的特征做一些扰动，将采样出的样本用分类模型分类并得到结果（红十字和蓝色点），同时根据采样样本与加粗红十字的距离赋予权重（权重以标志的大小表示）。虚线表示通过这些采样样本学到的局部可解释模型，在这个例子中就是一个简单的线性分类器。在此基础上，我们就可以依据这个局部的可解释模型对这个分类结果进行解释了。

一个看似复杂的模型通过我们巧妙的转换，就能够从局部上得到一个让人类理解的解释模型，光这样说还是显得有些空洞，具体来看看LIME在图像识别上的应用。我们希望LIME最好能生成和Grad-CAM一样的热力图解释。但是由于LIME不介入模型的内部，需要不断的扰动样本特征，这里所谓的样本特征就是指图片中一个一个的像素了。仔细一想就知道存在一个问题，LIME采样的特征空间太大的话，效率会非常低，而一张普通图片的像素少说也有上万个。若直接把每个像素视为一个特征，采样的空间过于庞大，严重影响效率；如果少采样一些，最终效果又会比较差。

所以针对图像任务使用LIME时还需要一些特别的技巧，也就是考虑图像的空间相关和连续的特性。不考虑一些极小特例的情况下，图片中的物体一般都是由一个或几个连续的像素块构成，所谓像素块是指具有相似纹理、颜色、亮度等特征的相邻像素构成的有一定视觉意义的不规则像素块，我们称之为**超像素**。相应的，将图片分割成一个个超像素的算法称为**超像素分割算法**，比较典型的有SLIC超像素分割算法还有quickshit等，这些算法在`scikit-image`库中都已经实现好了，quickshit分割后如图所示：

![mm](https://github.com/bindog/bindog.github.com/assets/8023481/8ab822e3-c73c-4bc2-9039-b7367956b2ef)

从特征的角度考虑，实际上就不再以单个像素为特征，而是以超像素为特征，整个图片的特征空间就小了很多，采样的过程也变的简单了许多。更具体的说，图像上的采样过程就是随机保留一部分超像素，隐藏另一部分超像素，如下所示：

![light](https://github.com/bindog/bindog.github.com/assets/8023481/336a4cbf-9790-4bca-90b6-883078dd05ae)

从图中可以很直观的看出这么做的意义：找出对分类结果影响最大的几个超像素，也就是说模型仅通过这几个像素块就已经能够自信的做出预测。这里还涉及到一个特征选择的问题，毕竟我们不可能穷举特征空间所有可能的样本，所以需要在有限个样本中找出那些关键的超像素块。虽然这部分没有在论文中过多提及，但在LIME的[代码实现](https://github.com/marcotcr/lime)中是一个重要部分，实现了前向搜索（forward selection）、Lasso和岭回归（ridge regression）等特征选择方式，默认当特征数小于等于6时采用前向搜索，其他情况采用岭回归。

整体流程如图所示：

![flow](https://github.com/bindog/bindog.github.com/assets/8023481/961dcaed-0545-4920-ab56-7cd755a413ec)

和Grad-CAM一样，LIME同样可以对其他可能的分类结果进行解释。

![effect](https://github.com/bindog/bindog.github.com/assets/8023481/a4485d01-3e76-4f62-90aa-3501ab1e96e7)


LIME除了能够对图像的分类结果进行解释外，还可以应用到自然语言处理的相关任务中，如主题分类、词性标注等。因为LIME本身的出发点就是模型无关的，具有广泛的适用性。

虽然LIME方法虽然有着很强的通用性，效果也挺好，但是在速度上却远远不如Grad-CAM那些方法来的快。当然这也是可以理解的，毕竟LIME在采样完成后，每张采样出来的图片都要通过原模型预测一次结果。

说来也巧，在写这篇文章的时候，AAAI 2018的论文放出来了，其中有LIME作者的最新研究成果[Anchors](http://sameersingh.org/files/papers/anchors-aaai18.pdf)，顺道去了解了一下。Anchors指的是复杂模型在局部所呈现出来的很强的规则性的规律，注意和LIME的区别，LIME是在局部建立一个可理解的线性可分模型，而Anchors的目的是建立一套更精细的规则系统。不过看过论文以后感觉更多是在和文本相关的任务上有不错的表现，在图像相关的任务上并没有什么特别另人耳目一新的东西，只是说明了在Anchor（图像中指若干个超像素）固定的情况下，其他像素无论替换为什么，现有的模型都会罔顾人类常识，自信的做出错误判断。这部分内容由于前几年看多了Adversarial Samples，已经见怪不怪了。

## 0x02 小结

实际上在模型可解释性这块还有其他很多相关研究，包括最近的AAAI 2018上也有几篇这方面的文章，如[Beyond Sparsity: Tree Regularization of Deep Models for Interpretability](https://arxiv.org/abs/1711.06178)，这都在一定程度上说明，业内还是重视这个方向的。尤其在涉及到医疗、自动驾驶等人命关天的应用场合，可解释性显得尤为重要，最后也希望更多感兴趣的同学加入到这个行列来~

如果你觉得本文对你有帮助，欢迎打赏我一杯咖啡钱，支持我写出更多好文章~

![](/assets/images/qrcode.png)


## 参考资料

- ["Why Should I Trust You?": Explaining the Predictions of Any Classifier](https://arxiv.org/abs/1602.04938)
- [Introduction to Local Interpretable Model-Agnostic Explanations (LIME)](https://www.oreilly.com/learning/introduction-to-local-interpretable-model-agnostic-explanations-lime)

