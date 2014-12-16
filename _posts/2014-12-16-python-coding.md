---
author: 宾狗
date: 2014-12-16 16:42+08:00
layout: post
title: "一个例子搞懂编码问题"
description: ""
categories:
- 工程
tags:
- python
- 编码
---

#0x00 前言
相信中文字符编码问题每个程序员都或多或少遇到过，文件读写、网页抓取、数据库等等，凡是有中文的地方总会出现各种的编码问题，但是很少有人愿意花时间去彻底弄清这个问题(至少我以前是这样)，每次出现乱码问题的时候上网一搜，不能解决的一愁莫展，能够解决的也不知其所以然。

最近在学习`Python`的过程中再次遇到了这个问题，决定认认真真把编码问题搞清楚，同时也把经验和心得分享给大家。如有谬误，欢迎大家批评指正~

#0x01 基础知识
首先声明，本文不是科普，如果你对`Unicode`、`utf-8`、`gb2312`、`gbk`这样的概念非常陌生的话，强烈建议你先看下[字符编码的奥秘utf-8, Unicode](http://blog.csdn.net/hherima/article/details/8655200)和[速解UTF-8中文字符，方法和原理](http://jsfox.cn/blog/others/quick-translate-chinese-utf8-by-unicode.html)这两篇文章，图文并茂~


有几点这里还是要再次强调一下：

 - 字符的编码与字符在计算机中的存储是并非完全一样
 - `Unicode`只是一个符号集，它只规定了符号的二进制代码，却没有规定这个二进制代码应该如何存储
 - `utf-8`是`Unicode`的一种实现，其他还有`utf-16`和`utf-32`，只不过用的很少罢了
 - 虽然都支持中文，但是`utf-8`和`gb`系列的编码是**完全不兼容的**，要想互相转换必须要通过`Unicode`作为媒介


#0x02 一个关于联通的经典笑话
新建一个`txt`文件，输入“移动”两个字(不带引号)然后保存，再用记事本打开，显示正常。新建一个`txt`文件，输入“联通”两个字(不带引号)然后保存，再用记事本打开，出现乱码。因此有人说联通不如移动强是有原因的……也有人说是联通得罪了微软……

笑话归笑话，不过这的确是一个很经典的字符编码问题

我们先来看看“联通”这两个字的编码

{% highlight python %}
# -*- coding: utf-8 -*-
teststr = u'联通'
print repr(teststr)
print repr(teststr.encode("utf-8"))
print repr(teststr.encode("gbk"))
# 输出
# u'\u8054\u901a'
# '\xe8\x81\x94\xe9\x80\x9a'
# '\xc1\xaa\xcd\xa8'
{% endhighlight %}
然后再来看看记事本是怎么存储这两个字的，`Windows`下记事本支持4种编码方式，如图
![4-coding](http://7rfbbn.com1.z0.glb.clouddn.com/python-coding/notepad-coding.png)
其中默认的是`ANSI`，我们分别用这4种方式保存“联通”两个字并用`010Editor`打开查看

以`ANSI`编码保存(中文字符其实就是用`GBK`编码)
![ansi-coding](http://7rfbbn.com1.z0.glb.clouddn.com/python-coding/ansi-coding.png)
以`Unicode`编码保存
![unicode-coding](http://7rfbbn.com1.z0.glb.clouddn.com/python-coding/unicode-coding.png)
以`Unicode big endian`编码保存
![unicode-big-endian-coding](http://7rfbbn.com1.z0.glb.clouddn.com/python-coding/unicode-big-endian-coding.png)
以`utf-8`编码保存
![utf8-coding](http://7rfbbn.com1.z0.glb.clouddn.com/python-coding/utf8-coding.PNG)

你看，字符在计算机中的存储形式的确与它们的编码表示略有不同，这里不再赘述，看完第一部分中推荐的文章你自然就明白了。

这里再啰嗦一句，最后一张图中开始的三个字节`EF BB BF`就是`BOM`了，全称Byte Order Mark，这玩意也是很多乱码问题的来源，`Linux`下很多程序就不认`BOM`。因此，强烈不建议使用`BOM`，使用`Notepad++`之类的软件保存文本时，尽量选择“以UTF-8无BOM格式编码”。我们在`010Editor`中手动把这前三个字节删掉后保存，然后再次用记事本打开，依然可以正常显示“联通”两个字，也就是说记事本是**可以识别UTF-8无BOM编码的。**

我们继续回到这个问题，为什么再次打开以`ANSI`形式保存的“联通”两个字会出现乱码呢？这里就涉及到`Windows`记事本的处理策略了，当你打开一个文本文件时，记事本并不知道这个文件采用的是什么编码。此时可以采用两种策略，一种是询问用户以什么编码打开，当然这种方式是以降低用户体验为代价的，另一种方式就是猜了，也就是记事本所采用的方式。

如果你看过了第一部分的基础知识，那么就应该清楚`utf-8`的编码规则
![utf-8](http://7rfbbn.com1.z0.glb.clouddn.com/python-coding/utf-8.jpg)

可以看出来还是有一定规律的，我们可以写的一个正则表达式来匹配这种种模式

{% highlight python %}
[\x01-\x7f]|[\xc0-\xdf][\x80-\xbf]|[\xe0-\xef][\x80-\xbf]{2}|[\xf0-\xf7][\x80-\xbf]{3}|[\xf8-\xfb][\x80-\xbf]{4}|[\xfc-\xfd][\x80-\xbf]{5}
{% endhighlight %}

相信你已经看晕了，没关系，我们用一个[正则表达式可视化工具](http://www.regexper.com/)来解析一下

![regexper](http://7rfbbn.com1.z0.glb.clouddn.com/python-coding/regexper.png)

根据这个图，再结合上面那张表，是不是一目了然呢？

当记事本遇到一个未知编码的文件，如果发现其字节流符合`utf-8`的编码标准，就认为这个文件是以`utf-8`编码的。我们来看“联通”这两个字的`gbk`编码，联`C1 AA`，通` CD A8`，与上面的正则表达式对比后就可以发现，这两个字的`gbk`编码恰好是符合`utf-8`编码规范的(落在`[\xC0-\xDF][\x80-\xBF]`这个范围中)，所以记事本就猜这个文件是以`utf-8`编码的，自然会出现乱码。

那么，还有哪些中文字符存在这些问题呢？我们用一个程序把它们全找出来

{% highlight python %}
col = "     "
for i in range(0,16):
    col = col + "+" + hex(i)[2:].upper() + " "
print col
newline = True
for i in range(192,224):
    line = u""
    linenum1 = hex(i)[2:].upper()
    count = 0
    for j in range(128,192):
        if newline:
            linenum2 = hex(j - j % 16)[2:].upper()
            line = linenum1 + linenum2 + " "
            newline = False
        c = chr(i) + chr(j)
        line = line + c.decode("gbk") + " "
        count = count + 1
        if count % 16 == 0:
            print line.strip()
            count = 0
            newline = True
{% endhighlight %}

{% highlight python %}
# 输出
     +0 +1 +2 +3 +4 +5 +6 +7 +8 +9 +A +B +C +D +E +F 
C080 纮 纴 纻 纼 绖 绤 绬 绹 缊 缐 缞 缷 缹 缻 缼 缽
C090 缾 缿 罀 罁 罃 罆 罇 罈 罉 罊 罋 罌 罍 罎 罏 罒
C0A0 罓 馈 愧 溃 坤 昆 捆 困 括 扩 廓 阔 垃 拉 喇 蜡
C0B0 腊 辣 啦 莱 来 赖 蓝 婪 栏 拦 篮 阑 兰 澜 谰 揽
C180 羳 羴 羵 羶 羷 羺 羻 羾 翀 翂 翃 翄 翆 翇 翈 翉
C190 翋 翍 翏 翐 翑 習 翓 翖 翗 翙 翚 翛 翜 翝 翞 翢
C1A0 翣 痢 立 粒 沥 隶 力 璃 哩 俩 联 莲 连 镰 廉 怜
C1B0 涟 帘 敛 脸 链 恋 炼 练 粮 凉 梁 粱 良 两 辆 量
C280 聙 聛 聜 聝 聞 聟 聠 聡 聢 聣 聤 聥 聦 聧 聨 聫
C290 聬 聭 聮 聯 聰 聲 聳 聴 聵 聶 職 聸 聹 聺 聻 聼
C2A0 聽 隆 垄 拢 陇 楼 娄 搂 篓 漏 陋 芦 卢 颅 庐 炉
C2B0 掳 卤 虏 鲁 麓 碌 露 路 赂 鹿 潞 禄 录 陆 戮 驴
C380 脌 脕 脗 脙 脛 脜 脝 脟 脠 脡 脢 脣 脤 脥 脦 脧
C390 脨 脩 脪 脫 脭 脮 脰 脳 脴 脵 脷 脹 脺 脻 脼 脽
C3A0 脿 谩 芒 茫 盲 氓 忙 莽 猫 茅 锚 毛 矛 铆 卯 茂
C3B0 冒 帽 貌 贸 么 玫 枚 梅 酶 霉 煤 没 眉 媒 镁 每
C480 膧 膩 膫 膬 膭 膮 膯 膰 膱 膲 膴 膵 膶 膷 膸 膹
C490 膼 膽 膾 膿 臄 臅 臇 臈 臉 臋 臍 臎 臏 臐 臑 臒
C4A0 臓 摹 蘑 模 膜 磨 摩 魔 抹 末 莫 墨 默 沫 漠 寞
C4B0 陌 谋 牟 某 拇 牡 亩 姆 母 墓 暮 幕 募 慕 木 目
C580 艀 艁 艂 艃 艅 艆 艈 艊 艌 艍 艎 艐 艑 艒 艓 艔
C590 艕 艖 艗 艙 艛 艜 艝 艞 艠 艡 艢 艣 艤 艥 艦 艧
C5A0 艩 拧 泞 牛 扭 钮 纽 脓 浓 农 弄 奴 努 怒 女 暖
C5B0 虐 疟 挪 懦 糯 诺 哦 欧 鸥 殴 藕 呕 偶 沤 啪 趴
C680 苺 苼 苽 苾 苿 茀 茊 茋 茍 茐 茒 茓 茖 茘 茙 茝
C690 茞 茟 茠 茡 茢 茣 茤 茥 茦 茩 茪 茮 茰 茲 茷 茻
C6A0 茽 啤 脾 疲 皮 匹 痞 僻 屁 譬 篇 偏 片 骗 飘 漂
C6B0 瓢 票 撇 瞥 拼 频 贫 品 聘 乒 坪 苹 萍 平 凭 瓶
C780 莯 莵 莻 莾 莿 菂 菃 菄 菆 菈 菉 菋 菍 菎 菐 菑
C790 菒 菓 菕 菗 菙 菚 菛 菞 菢 菣 菤 菦 菧 菨 菫 菬
C7A0 菭 恰 洽 牵 扦 钎 铅 千 迁 签 仟 谦 乾 黔 钱 钳
C7B0 前 潜 遣 浅 谴 堑 嵌 欠 歉 枪 呛 腔 羌 墙 蔷 强
C880 葊 葋 葌 葍 葎 葏 葐 葒 葓 葔 葕 葖 葘 葝 葞 葟
C890 葠 葢 葤 葥 葦 葧 葨 葪 葮 葯 葰 葲 葴 葷 葹 葻
C8A0 葼 取 娶 龋 趣 去 圈 颧 权 醛 泉 全 痊 拳 犬 券
C8B0 劝 缺 炔 瘸 却 鹊 榷 确 雀 裙 群 然 燃 冉 染 瓤
C980 蓘 蓙 蓚 蓛 蓜 蓞 蓡 蓢 蓤 蓧 蓨 蓩 蓪 蓫 蓭 蓮
C990 蓯 蓱 蓲 蓳 蓴 蓵 蓶 蓷 蓸 蓹 蓺 蓻 蓽 蓾 蔀 蔁
C9A0 蔂 伞 散 桑 嗓 丧 搔 骚 扫 嫂 瑟 色 涩 森 僧 莎
C9B0 砂 杀 刹 沙 纱 傻 啥 煞 筛 晒 珊 苫 杉 山 删 煽
CA80 蕗 蕘 蕚 蕛 蕜 蕝 蕟 蕠 蕡 蕢 蕣 蕥 蕦 蕧 蕩 蕪
CA90 蕫 蕬 蕭 蕮 蕯 蕰 蕱 蕳 蕵 蕶 蕷 蕸 蕼 蕽 蕿 薀
CAA0 薁 省 盛 剩 胜 圣 师 失 狮 施 湿 诗 尸 虱 十 石
CAB0 拾 时 什 食 蚀 实 识 史 矢 使 屎 驶 始 式 示 士
CB80 藔 藖 藗 藘 藙 藚 藛 藝 藞 藟 藠 藡 藢 藣 藥 藦
CB90 藧 藨 藪 藫 藬 藭 藮 藯 藰 藱 藲 藳 藴 藵 藶 藷
CBA0 藸 恕 刷 耍 摔 衰 甩 帅 栓 拴 霜 双 爽 谁 水 睡
CBB0 税 吮 瞬 顺 舜 说 硕 朔 烁 斯 撕 嘶 思 私 司 丝
CC80 虁 虂 虃 虄 虅 虆 虇 虈 虉 虊 虋 虌 虒 虓 處 虖
CC90 虗 虘 虙 虛 虜 虝 號 虠 虡 虣 虤 虥 虦 虧 虨 虩
CCA0 虪 獭 挞 蹋 踏 胎 苔 抬 台 泰 酞 太 态 汰 坍 摊
CCB0 贪 瘫 滩 坛 檀 痰 潭 谭 谈 坦 毯 袒 碳 探 叹 炭
CD80 蛝 蛠 蛡 蛢 蛣 蛥 蛦 蛧 蛨 蛪 蛫 蛬 蛯 蛵 蛶 蛷
CD90 蛺 蛻 蛼 蛽 蛿 蜁 蜄 蜅 蜆 蜋 蜌 蜎 蜏 蜐 蜑 蜔
CDA0 蜖 汀 廷 停 亭 庭 挺 艇 通 桐 酮 瞳 同 铜 彤 童
CDB0 桶 捅 筒 统 痛 偷 投 头 透 凸 秃 突 图 徒 途 涂
CE80 蝷 蝸 蝹 蝺 蝿 螀 螁 螄 螆 螇 螉 螊 螌 螎 螏 螐
CE90 螑 螒 螔 螕 螖 螘 螙 螚 螛 螜 螝 螞 螠 螡 螢 螣
CEA0 螤 巍 微 危 韦 违 桅 围 唯 惟 为 潍 维 苇 萎 委
CEB0 伟 伪 尾 纬 未 蔚 味 畏 胃 喂 魏 位 渭 谓 尉 慰
CF80 蟺 蟻 蟼 蟽 蟿 蠀 蠁 蠂 蠄 蠅 蠆 蠇 蠈 蠉 蠋 蠌
CF90 蠍 蠎 蠏 蠐 蠑 蠒 蠔 蠗 蠘 蠙 蠚 蠜 蠝 蠞 蠟 蠠
CFA0 蠣 稀 息 希 悉 膝 夕 惜 熄 烯 溪 汐 犀 檄 袭 席
CFB0 习 媳 喜 铣 洗 系 隙 戏 细 瞎 虾 匣 霞 辖 暇 峡
D080 衻 衼 袀 袃 袆 袇 袉 袊 袌 袎 袏 袐 袑 袓 袔 袕
D090 袗 袘 袙 袚 袛 袝 袞 袟 袠 袡 袣 袥 袦 袧 袨 袩
D0A0 袪 小 孝 校 肖 啸 笑 效 楔 些 歇 蝎 鞋 协 挟 携
D0B0 邪 斜 胁 谐 写 械 卸 蟹 懈 泄 泻 谢 屑 薪 芯 锌
D180 褉 褋 褌 褍 褎 褏 褑 褔 褕 褖 褗 褘 褜 褝 褞 褟
D190 褠 褢 褣 褤 褦 褧 褨 褩 褬 褭 褮 褯 褱 褲 褳 褵
D1A0 褷 选 癣 眩 绚 靴 薛 学 穴 雪 血 勋 熏 循 旬 询
D1B0 寻 驯 巡 殉 汛 训 讯 逊 迅 压 押 鸦 鸭 呀 丫 芽
D280 襽 襾 覀 覂 覄 覅 覇 覈 覉 覊 見 覌 覍 覎 規 覐
D290 覑 覒 覓 覔 覕 視 覗 覘 覙 覚 覛 覜 覝 覞 覟 覠
D2A0 覡 摇 尧 遥 窑 谣 姚 咬 舀 药 要 耀 椰 噎 耶 爷
D2B0 野 冶 也 页 掖 业 叶 曳 腋 夜 液 一 壹 医 揖 铱
D380 觻 觼 觽 觾 觿 訁 訂 訃 訄 訅 訆 計 訉 訊 訋 訌
D390 訍 討 訏 訐 訑 訒 訓 訔 訕 訖 託 記 訙 訚 訛 訜
D3A0 訝 印 英 樱 婴 鹰 应 缨 莹 萤 营 荧 蝇 迎 赢 盈
D3B0 影 颖 硬 映 哟 拥 佣 臃 痈 庸 雍 踊 蛹 咏 泳 涌
D480 詟 詠 詡 詢 詣 詤 詥 試 詧 詨 詩 詪 詫 詬 詭 詮
D490 詯 詰 話 該 詳 詴 詵 詶 詷 詸 詺 詻 詼 詽 詾 詿
D4A0 誀 浴 寓 裕 预 豫 驭 鸳 渊 冤 元 垣 袁 原 援 辕
D4B0 园 员 圆 猿 源 缘 远 苑 愿 怨 院 曰 约 越 跃 钥
D580 諃 諄 諅 諆 談 諈 諉 諊 請 諌 諍 諎 諏 諐 諑 諒
D590 諓 諔 諕 論 諗 諘 諙 諚 諛 諜 諝 諞 諟 諠 諡 諢
D5A0 諣 铡 闸 眨 栅 榨 咋 乍 炸 诈 摘 斋 宅 窄 债 寨
D5B0 瞻 毡 詹 粘 沾 盏 斩 辗 崭 展 蘸 栈 占 战 站 湛
D680 謤 謥 謧 謨 謩 謪 謫 謬 謭 謮 謯 謰 謱 謲 謳 謴
D690 謵 謶 謷 謸 謹 謺 謻 謼 謽 謾 謿 譀 譁 譂 譃 譄
D6A0 譅 帧 症 郑 证 芝 枝 支 吱 蜘 知 肢 脂 汁 之 织
D6B0 职 直 植 殖 执 值 侄 址 指 止 趾 只 旨 纸 志 挚
D780 讇 讈 讉 變 讋 讌 讍 讎 讏 讐 讑 讒 讓 讔 讕 讖
D790 讗 讘 讙 讚 讛 讜 讝 讞 讟 讬 讱 讻 诇 诐 诪 谉
D7A0 谞 住 注 祝 驻 抓 爪 拽 专 砖 转 撰 赚 篆 桩 庄
D7B0 装 妆 撞 壮 状 椎 锥 追 赘 坠 缀 谆 准 捉 拙 卓
D880 貈 貋 貍 貎 貏 貐 貑 貒 貓 貕 貖 貗 貙 貚 貛 貜
D890 貝 貞 貟 負 財 貢 貣 貤 貥 貦 貧 貨 販 貪 貫 責
D8A0 貭 亍 丌 兀 丐 廿 卅 丕 亘 丞 鬲 孬 噩 丨 禺 丿
D8B0 匕 乇 夭 爻 卮 氐 囟 胤 馗 毓 睾 鼗 丶 亟 鼐 乜
D980 賭 賮 賯 賰 賱 賲 賳 賴 賵 賶 賷 賸 賹 賺 賻 購
D990 賽 賾 賿 贀 贁 贂 贃 贄 贅 贆 贇 贈 贉 贊 贋 贌
D9A0 贍 佟 佗 伲 伽 佶 佴 侑 侉 侃 侏 佾 佻 侪 佼 侬
D9B0 侔 俦 俨 俪 俅 俚 俣 俜 俑 俟 俸 倩 偌 俳 倬 倏
DA80 趢 趤 趥 趦 趧 趨 趩 趪 趫 趬 趭 趮 趯 趰 趲 趶
DA90 趷 趹 趻 趽 跀 跁 跂 跅 跇 跈 跉 跊 跍 跐 跒 跓
DAA0 跔 凇 冖 冢 冥 讠 讦 讧 讪 讴 讵 讷 诂 诃 诋 诏
DAB0 诎 诒 诓 诔 诖 诘 诙 诜 诟 诠 诤 诨 诩 诮 诰 诳
DB80 踿 蹃 蹅 蹆 蹌 蹍 蹎 蹏 蹐 蹓 蹔 蹕 蹖 蹗 蹘 蹚
DB90 蹛 蹜 蹝 蹞 蹟 蹠 蹡 蹢 蹣 蹤 蹥 蹧 蹨 蹪 蹫 蹮
DBA0 蹱 邸 邰 郏 郅 邾 郐 郄 郇 郓 郦 郢 郜 郗 郛 郫
DBB0 郯 郾 鄄 鄢 鄞 鄣 鄱 鄯 鄹 酃 酆 刍 奂 劢 劬 劭
DC80 軃 軄 軅 軆 軇 軈 軉 車 軋 軌 軍 軏 軐 軑 軒 軓
DC90 軔 軕 軖 軗 軘 軙 軚 軛 軜 軝 軞 軟 軠 軡 転 軣
DCA0 軤 堋 堍 埽 埭 堀 堞 堙 塄 堠 塥 塬 墁 墉 墚 墀
DCB0 馨 鼙 懿 艹 艽 艿 芏 芊 芨 芄 芎 芑 芗 芙 芫 芸
DD80 輤 輥 輦 輧 輨 輩 輪 輫 輬 輭 輮 輯 輰 輱 輲 輳
DD90 輴 輵 輶 輷 輸 輹 輺 輻 輼 輽 輾 輿 轀 轁 轂 轃
DDA0 轄 荨 茛 荩 荬 荪 荭 荮 莰 荸 莳 莴 莠 莪 莓 莜
DDB0 莅 荼 莶 莩 荽 莸 荻 莘 莞 莨 莺 莼 菁 萁 菥 菘
DE80 迉 迊 迋 迌 迍 迏 迒 迖 迗 迚 迠 迡 迣 迧 迬 迯
DE90 迱 迲 迴 迵 迶 迺 迻 迼 迾 迿 逇 逈 逌 逎 逓 逕
DEA0 逘 蕖 蔻 蓿 蓼 蕙 蕈 蕨 蕤 蕞 蕺 瞢 蕃 蕲 蕻 薤
DEB0 薨 薇 薏 蕹 薮 薜 薅 薹 薷 薰 藓 藁 藜 藿 蘧 蘅
DF80 還 邅 邆 邇 邉 邊 邌 邍 邎 邏 邐 邒 邔 邖 邘 邚
DF90 邜 邞 邟 邠 邤 邥 邧 邨 邩 邫 邭 邲 邷 邼 邽 邿
DFA0 郀 摺 撷 撸 撙 撺 擀 擐 擗 擤 擢 攉 攥 攮 弋 忒
DFB0 甙 弑 卟 叱 叽 叩 叨 叻 吒 吖 吆 呋 呒 呓 呔 呖
{% endhighlight %}

凡是**仅由**这张表里面的字构成的文本输入到记事本里用`ANSI`保存后，再次打开都会变成乱码

如果你能看明白这个例子，相信你对字符串编码会有一个更加深入的认识。

#0x03 Python中乱码处理的一般方法
(这里所说的方法适用`Python 2.X`，在`Python 3`中字符串已经不是老大难的问题了)

`Python`中乱码处理的关键在于理解`str`和`unicode`的关系，它们都是`basestring`的子类，用下面一张图可以很好表示它们的关系
![python-str-unicode](http://7rfbbn.com1.z0.glb.clouddn.com/python-coding/python-str-unicode.png)

一般情况下，如果你得到的数据在没有被加密或者压缩的情况下出现了乱码，那多半是没有被正确的编码解析罢了，剩下的事无非就是编码转换的问题了。

比如，我抓取的一个网页是用`utf-8`编码的，而我的数据库的编码是`gbk`，直接存肯定是不行的，怎么办呢，很简单

{% highlight python %}
unicodestr = webstr.decode("utf-8")
databasestr = unicodestr.encode("gbk")
# 然后把databasestr写进数据库就可以了
{% endhighlight %}

在某些情况下，不知道数据来源的编码是什么，那该怎么办呢？`Python`下有一个`chardet`能非常方便的解决这个问题

{% highlight python %}
import chardet
f = open("unknown.txt","r")
fstr = f.read()
print chardet.detect(fstr)
# 输出
# {'confidence': XXX, 'encoding': 'XXX'}
{% endhighlight %}

输出有两个值，后一个是`chardet`认为可能的编码，前一个表示可能性的大小。只要我们提供的字符串没有什么问题，一般`chardet`都可以给出一个比较准确的答案。在知道目标采用了什么编码后，就可以使用前面的方法进行编码转换了。



要注意的一点是，当你使用`print`显示乱码时并不一定真的是乱码。比如下面这段程序

{% highlight python %}
# -*- coding: utf-8 -*-
teststr = u'测试'
utf8str = teststr.encode("utf-8")
gbkstr = teststr.encode("gbk")
print teststr
print utf8str
print gbkstr

utf8f = open("utf8str.txt","w")
utf8f.write(utf8str)
utf8f.close()

gbkf = open("gbkstr.txt","w")
gbkf.write(gbkstr)
gbkf.close()
{% endhighlight %}

分别在`Eclipse`和`Windows`命令行中执行，发现`Eclipse`中`print gbkstr`出现了乱码，而在`Windows`命令行中`print utf8str`出现了乱码，但却并不影响两个文件的正常显示(编码不同罢了，记事本都可以识别)。这与`Python`中`print`的实现有关，`print`直接把字符串传递给当前运行环境，只有当该字符串**与运行环境默认的编码一致**时才能正常显示。

最后，再总结几点`Python 2.X`中常见的字符串问题

 - `Python`默认脚本文件都是ASCII编码的，当文件中有非ASCII编码范围内的字符的时候就要使用“编码指示”来修正，也就是在文件第一行或第二行指定编码声明：`# -*- coding=utf-8 -*-`或者`#coding=utf-8`
 - 在`Python`中str和unicode在编码和解码过程中，如果将一个str直接编码成另一种编码，或者把str与一个unicode相加，会先把str解码成unicode，采用的编码为默认编码，一般默认编码是`ascii`，我们可以使用下面的代码来改变`Python`默认编码

 {% highlight python %}
# -*- coding=utf-8 -*-
import sys
reload(sys)
sys.setdefaultencoding('utf-8')
s = '测试'
s.encode('gb2312')
{% endhighlight %}

 - 有些时候字符串中大部分字符编码都是正确的，但是偶尔出现了一两个非法字符，这时候使用`decode`会抛出异常而无法正常解码，不过我们可以使用`decode`的第二个参数来解决这个问题，如`s.decode('gbk', 'ignore')`，因为`decode`的函数原型是`decode([encoding], [errors='strict'])`，可以用第二个参数控制错误处理的策略，默认的参数就是`strict`，代表遇到非法字符时抛出异常，如果设置为`ignore`，则会忽略非法字符，如果设置为`replace`，则会用`?`取代非法字符；

#0x04 建议
先看看下面的代码

 {% highlight python %}
# -*- coding: utf-8 -*-
teststr = u'测试'
utf8str = teststr.encode("utf-8")
gbkstr = teststr.encode("gbk")
print len(teststr)
print len(utf8str)
print len(gbkstr)
# 输出
# 2
# 6
# 4
{% endhighlight %}

注意，`Python`中对`str`进行`len()`操作，计算的可是字节的长度，而且非常我们逻辑上的一个字。所以下面提一些建议供大家参考~

- 使用字符编码声明，并且同一工程中的所有源代码文件使用相同的字符编码声明。
- 工程开发中尽量使用`utf-8`编码，如果为了节省流量或者空间`gbk`编码也是可以的。
- 字符在`Python`内部处理时尽量使用`unicode`，输入时进行`decode`，输出时再进行`encode`，就像第三部分的第一张图那样，这样就避免了刚才的那个问题。

#0x05 体会

> 冯·诺伊曼结构（英语：von Neumann architecture），也称冯·诺伊曼模型（Von Neumann model）或普林斯顿结构（Princeton architecture），是一种将程序指令存储器和数据存储器合并在一起的电脑设计概念结构。

这是维基百科中对冯·诺伊曼结构的定义，做逆向的人应该深有体会，经过加壳或者改过入口点的二进制文件扔到OD中之后，哪些是数据哪些是指令真是傻傻分不清楚。

在编码问题上也有相似之处，之所以有乱码那就是因为同一个字节流在不同的编码中都有相应的码点对应(当然也有一些没有对应的)。

但是一旦我们找到了程序真正的入口点(找到了正确的编码方式)，所有的问题自然迎刃而解~