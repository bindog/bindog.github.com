---
author: 宾狗
date: 2018-02-10 22:56+08:00
layout: post
title: "凭什么相信你，我的CNN模型？（篇一：CAM和Grad-CAM)"
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

在当前深度学习的领域，有一个非常不好的风气：一切以经验论，好用就行，不问为什么，很少深究问题背后的深层次原因。从长远来看，这样做就埋下了隐患。举个例子，在1980年左右的时候，美国五角大楼启动了一个项目：用神经网络模型来识别坦克(当时还没有深度学习的概念)，他们采集了100张隐藏在树丛中的坦克照片，以及另100张仅有树丛的照片。一组顶尖的研究人员训练了一个神经网络模型来识别这两种不同的场景，这个神经网络模型效果拔群，在测试集上的准确率竟然达到了100%！于是这帮研究人员很高兴的把他们的研究成果带到了某个学术会议上，会议上有个哥们提出了质疑：你们的训练数据是怎么采集的？后来进一步调查发现，原来那100张有坦克的照片都是在阴天拍摄的，而另100张没有坦克的照片是在晴天拍摄的……也就是说，五角大楼花了那么多的经费，最后就得到了一个用来区分阴天和晴天的分类模型。





当然这个故事应该是虚构的，不过它很形象的说明了什么叫“数据泄露”，这在以前的Kaggle比赛中也曾经出现过。大家不妨思考下，假如我们手里现在有一家医院所有医生和护士的照片，我们希望训练出一个图片分类模型，能够准确的区分出医生和护士。当模型训练完成之后，准确率达到了99%，你认为这个模型可靠不可靠呢？大家可以自己考虑下这个问题。

好在学术界的一直有人关注着这个问题，并引申出一个很重要的分支，就是模型的可解释性问题。那么本文从就从近几年来的研究成果出发，谈谈如何让看似黑盒的CNN模型“说话”，对它的分类结果给出一个解释。注意，本文所说的“解释”，与我们日常说的“解释”内涵不一样：例如我们给孩子一张猫的图片，让他解释为什么这是一只猫，孩子会说因为它有尖耳朵、胡须等。而我们让CNN模型解释为什么将这张图片的分类结果为猫，只是让它标出是通过图片的哪些像素作出判断的。（严格来说，这样不能说明模型是否真正学到了我们人类所理解的“特征”，因为模型所学习到的特征本来就和人类的认知有很大区别。何况，即使只标注出是通过哪些像素作出判断就已经有很高价值了，如果标注出的像素集中在地面上，而模型的分类结果是猫，显然这个模型是有问题的）



## 0x01 反卷积和导向反向传播

关于CNN模型的可解释问题，很早就有人开始研究了，姑且称之为CNN可视化吧。比较经典的有两个方法，反卷积(Deconvolution)和导向反向传播(Guided-backpropagation)，通过它们，我们能够一定程度上“看到”CNN模型中较深的卷积层所学习到的一些特征。当然这两个方法也衍生出了其他很多用途，以反卷积为例，它在图像语义分割中有着非常重要的作用。从本质上说，反卷积和导向反向传播的基础都是反向传播，其实说白了就是对输入进行求导，三者唯一的区别在于反向传播过程中经过ReLU层时对梯度的不同处理策略。在这篇[论文](https://arxiv.org/pdf/1412.6806.pdf)中有着非常详细的说明，如下图所示：

![diff](https://github.com/bindog/bindog.github.com/assets/8023481/d9233483-66bd-4e85-9308-8df44b2fb468)

虽然过程上的区别看起来没有非常微小，但是在最终的效果上却有很大差别。如下图所示：

![compare_effect](https://github.com/bindog/bindog.github.com/assets/8023481/8bfa9e66-270b-4380-a201-46531ca63acc)

使用普通的反向传播得到的图像噪声较多，基本看不出模型的学到了什么东西。使用反卷积可以大概看清楚猫和狗的轮廓，但是有大量噪声在物体以外的位置上。导向反向传播基本上没有噪声，特征很明显的集中猫和狗的身体部位上。

虽然借助反卷积和导向反向传播我们“看到”了CNN模型神秘的内部，但是却并不能拿来解释分类的结果，因为它们对类别并不敏感，直接把所有能提取的特征都展示出来了。在刚才的图片中，模型给出的分类结果是猫，但是通过反卷积和导向反向传播展示出来的结果却同时包括了狗的轮廓。换句话说，我们并不知道模型到底是通过哪块区域判断出当前图片是一只猫的。要解决这个问题，我们必须考虑其他办法。

（ps：目前网上有一些关于反卷积的文章，我感觉没有说的特别到位的，当然也有可能是大家理解的角度不同，但是另外一些解读那就是完全错误的了，包括某乎。不得不说，真正要深入理解反卷积还是要去啃论文，很多人嫌麻烦总是看些二手的资料，得到的认识自然是有问题的。当然这些都是题外话，我也有写一篇关于反卷积的文章的计划。看以后的时间安排）

## 0x02 CAM

大家在电视上应该都看过热成像仪生成的图像，就像下面这张图片。

![热成像仪](https://github.com/bindog/bindog.github.com/assets/8023481/9e0e2977-d22e-4bec-9851-32f31e414552)

图像中动物或人因为散发出热量，所以能够清楚的被看到。接下来要介绍的CAM(Class Activation Mapping)产生的CAM图与之类似，当我们需要模型解释其分类的原因时，它以热力图（Saliency Map，我不知道怎么翻译最适合，叫热力图比较直观一点）的形式展示它的决策依据，如同在黑夜中告诉我们哪有发热的物体。

对一个深层的卷积神经网络而言，通过多次卷积和池化以后，它的最后一层卷积层包含了最丰富的空间和语义信息，再往下就是全连接层和softmax层了，其中所包含的信息都是人类难以理解的，很难以可视化的方式展示出来。所以说，要让卷积神经网络的对其分类结果给出一个合理解释，必须要充分利用好最后一个卷积层。

![CNN](https://github.com/bindog/bindog.github.com/assets/8023481/1625a3c2-9c82-4025-bd74-d4dcb3d24c03)


CAM借鉴了很著名的论文*[Network in Network](https://arxiv.org/abs/1312.4400)*中的思路，利用GAP(Global Average Pooling)替换掉了全连接层。可以把GAP视为一个特殊的average pool层，只不过其pool size和整个特征图一样大，其实说白了就是求每张特征图所有像素的均值。

![CNN_GAP](https://github.com/bindog/bindog.github.com/assets/8023481/65ac48a2-f798-4b9e-aacf-c9ace7c5cf4a)

GAP的优点在NIN的论文中说的很明确了：由于没有了全连接层，输入就不用固定大小了，因此可支持任意大小的输入；此外，引入GAP更充分的利用了空间信息，且没有了全连接层的各种参数，鲁棒性强，也不容易产生过拟合；还有很重要的一点是，在最后的 mlpconv层(也就是最后一层卷积层)强制生成了和目标类别数量一致的特征图，经过GAP以后再通过softmax层得到结果，这样做就给每个特征图赋予了很明确的意义，也就是categories confidence maps。如果你当时不理解这个categories confidence maps是个什么东西，结合CAM应该就能很快理解。

我们重点看下经过GAP之后与输出层的连接关系(暂不考虑softmax层)，实质上也是就是个全连接层，只不过没有了偏置项，如图所示：

![GAP_output](https://github.com/bindog/bindog.github.com/assets/8023481/57274c68-cc38-47ad-a713-423246180b0d)


从图中可以看到，经过GAP之后，我们得到了最后一个卷积层每个特征图的均值，通过加权和得到输出(实际中是softmax层的输入)。需要注意的是，对每一个类别C，每个特征图$k$的均值都有一个对应的$w$，记为$w_k^c$。CAM的基本结构就是这样了，下面就是和普通的CNN模型一样训练就可以了。训练完成后才是重头戏：我们如何得到一个用于解释分类结果的热力图呢？其实非常简单，比如说我们要解释为什么分类的结果是羊驼，我们把羊驼这个类别对应的所有$w_k^c$取出来，求出它们与自己对应的特征图的加权和即可。由于这个结果的大小和特征图是一致的，我们需要对它进行上采样，叠加到原图上去，如下所示。

![heatmap_sum](https://github.com/bindog/bindog.github.com/assets/8023481/c6739cce-847c-4d67-9cbc-7bb52b2011f9)


这样，CAM以热力图的形式告诉了我们，模型是重点通过哪些像素确定这个图片是羊驼了。

## 0x03 Grad-CAM方法

前面看到CAM的解释效果已经很不错了，但是它有一个致使伤，就是它要求修改原模型的结构，导致需要重新训练该模型，这大大限制了它的使用场景。如果模型已经上线了，或着训练的成本非常高，我们几乎是不可能为了它重新训练的。于是乎，Grad-CAM横空出世，解决了这个问题。

Grad-CAM的基本思路和CAM是一致的，也是通过得到每对特征图对应的权重，最后求一个加权和。但是它与CAM的主要区别在于求权重$w_k^c$的过程。CAM通过替换全连接层为GAP层，重新训练得到权重，而Grad-CAM另辟蹊径，用梯度的全局平均来计算权重。事实上，经过严格的数学推导，Grad-CAM与CAM计算出来的权重是等价的。为了和CAM的权重做区分，定义Grad-CAM中第$k$个特征图对类别$c$的权重为$\alpha_k^c$，可通过下面的公式计算：

$$\alpha_k^c=\frac{1}{Z}\sum\limits_{i}\sum\limits_{j}\frac{\partial y^c}{\partial A_{ij}^k}$$

其中，$Z$为特征图的像素个数，$y^c$是对应类别$c$的分数（在代码中一般用logits表示，是输入softmax层之前的值），$A_{ij}^k$表示第$k$个特征图中，$(i,j)$位置处的像素值。求得类别对所有特征图的权重后，求其加权和就可以得到热力图。

$$L_{Grad-CAM}^c=ReLU(\sum\limits_k\alpha_k^cA^k)$$

Grad-CAM的整体结构如下图所示：

![Grad-CAM结构](https://github.com/bindog/bindog.github.com/assets/8023481/e7d15a74-fc4a-42b7-938b-6bb38f0059b3)


注意这里和CAM的另一个区别是，Grad-CAM对最终的加权和加了一个ReLU，加这么一层ReLU的原因在于我们只关心**对类别$c$有正影响的那些像素点**，如果不加ReLU层，最终可能会带入一些属于其它类别的像素，从而影响解释的效果。使用Grad-CAM对分类结果进行解释的效果如下图所示：

![effect1](https://github.com/bindog/bindog.github.com/assets/8023481/c084a98c-4fe2-44d1-8d0d-e093a89e0ef7)


除了直接生成热力图对分类结果进行解释，Grad-CAM还可以与其他经典的模型解释方法如导向反向传播相结合，得到更细致的解释。

![effect2](https://github.com/bindog/bindog.github.com/assets/8023481/459497ba-e0f3-451f-8df1-006bbc93dc0c)

这样就很好的解决了反卷积和导向反向传播对类别不敏感的问题。当然，Grad-CAM的神奇之处还不仅仅局限在对图片分类的解释上，任何与图像相关的深度学习任务，只要用到了CNN，就可以用Grad-CAM进行解释，如图像描述(Image Captioning)，视觉问答(Visual Question Answering)等，所需要做的只不过是把$y^c$换为对应模型中的那个值即可。限于篇幅，本文就不展开了，更多细节，强烈建议大家去读读[论文](https://arxiv.org/abs/1610.02391)，包括Grad-CAM与CAM权重等价的证明也在论文中。如果你只是想在自己的模型中使用Grad-CAM，可以参考这个[链接](https://github.com/Ankush96/grad-cam.tensorflow)，熟悉tensorflow的话实现起来真的非常简单，一看就明白。

## 0x04 扩展

其实无论是CAM还是Grad-CAM，除了用来对模型的预测结果作解释外，还有一个非常重要的功能：就是用于物体检测。大家都知道现在物体检测是一个非常热门的方向，它要求在一张图片中准确的识别出多个物体，同时用方框将其框起来。物体检测对训练数据量的要求是非常高的，目前常被大家使用的有 PASCAL、COCO，如果需要更多数据，或者想要识别的物体在这些数据库中没有话，那就只能人工来进行标注了，工作量可想而知。

仔细想想我们不难发现，Grad-CAM在给出解释的同时，不正好完成了标注物体位置的工作吗？虽然其标注的位置不一定非常精确，也不一定完整覆盖到物体的每一个像素。但只要有这样一个大致的信息，我们就可以得到物体的位置，更具有诱惑力的是，我们不需要人工标注的方框就可以做到了。

顺便吐槽下当前比较火的几个物体检测模型如Faster-RCNN、SSD等，无一例外都有一个Region Proposal阶段，相当于“胡乱”在图片中画各种大小的方框，然后再来判断方框中是否有物体存在。虽然效果很好，但是根本就是违背人类直觉的。相比之下，Grad-CAM这种定位方式似乎更符合人类的直觉。当然这些纯属我个人的瞎扯，业务场景中SSD还是非常好用的，肯定要比Grad-CAM这种弱监督条件下的定位要强的多。



## 0x05 小结

试想如果当时五角大楼的研究人员知道本文介绍的这些方法，并对他们的分类结果用热力图进行解释，相信他们能很快发现热力图的红色区域主要集中在天空上，显然说明模型并没有真正学到如何判别一辆坦克，最后也就不至于闹笑话了。

回顾本文所介绍的这些方法，它们都有一个共同前提：即模型对我们来说是白盒，我们清楚的知道模型内部的所有细节，能够获取任何想要的数据，甚至可以修改它的结构。但如果我们面对的是一个黑盒，对其内部一无所知，只能提供一个输入并得到相应的输出值（比如别人的某个模型部署在线上，我们只有使用它的权利），在这种情况下，我们如何判断这个模型是否靠谱？能不能像Grad-CAM那样对分类结果给出一个解释呢？欢迎关注下一篇文章，[凭什么相信你，我的CNN模型？（篇二：万金油LIME)](http://bindog.github.io/blog/2018/02/11/model-explanation-2/)。

如果你觉得本文对你有帮助，欢迎打赏我一杯咖啡钱，支持我写出更多好文章~

![](/assets/images/qrcode.png)

## 参考资料

- Deconvolution [Visualizing and Understanding Convolutional Networks](https://arxiv.org/abs/1311.2901)
- Guided-backpropagation [Striving for Simplicity: The All Convolutional Net](https://arxiv.org/abs/1412.6806)
- CAM [Learning Deep Features for Discriminative Localization](https://arxiv.org/abs/1512.04150)
- [Grad-CAM: Visual Explanations from Deep Networks via Gradient-based Localization](https://arxiv.org/abs/1610.02391)
- [Yes, Deep Networks are great, but are they Trustworthy?](https://ramprs.github.io/2017/01/21/Grad-CAM-Making-Off-the-Shelf-Deep-Models-Transparent-through-Visual-Explanations.html)
- [CAM的tensorflow实现](https://github.com/philipperemy/tensorflow-class-activation-mapping)
- [Grad-CAM的tensorflow实现](https://github.com/insikk/Grad-CAM-tensorflow)


<!--代码参考  -->
<!--
    guided_relu https://gist.github.com/oarriaga/fb432335deed27ba3f667895ccc85140
    guided_relu https://github.com/conan7882/CNN-Visualization
    global_average_pool https://github.com/conan7882/DeepVision-tensorflow
    反卷积？ https://zhuanlan.zhihu.com/p/22245268 
-->
    


