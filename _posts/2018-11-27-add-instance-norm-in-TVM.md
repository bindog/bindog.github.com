---
author: 宾狗
date: 2018-11-27 10:32+08:00
layout: post
title: "在TVM中实现Instance Normalization层"
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

TVM不用多解释了，深度学习领域的编译器，直接从其他框架训练好的模型编译到目标平台上的可执行代码，速度和显存的都有大幅优化，该项目目前由DMLC组维护，正在快速迭代中。

原先我组的模型线上部署都是采用Caffe2+ONNX的形式，近来想进一步控制成本，TVM无疑能够满足我们的需求。但是，由于我组最近使用的模型se_resnet_101_ibn_a中包含了一个`instance_norm`和`batch_norm`融合的特殊结构(IBN结构可参考该[论文](https://arxiv.org/abs/1807.09441))，而目前TVM暂不支持`instance_norm`，所以只能自己来进行实现了。






考虑到`instance_norm`和`batch_norm`比较类似，所以最初的计划是从`batch_norm`入手，找出TVM源码中所有`batch_norm`出现过的地方，然后模仿一下，应该就能很轻松的实现`instance_norm`(当然后面的事实证明这真是太天真了)

那么下面就大致按照从前端到后端，从表面到深层的顺序简单介绍我在TVM上实现`instance_norm`的过程

## 0x01 ONNX中两者参数和属性的区别

`instance_norm`和`batch_norm`虽然有很多相似之处，但是在ONNX中的属性和参数上仍有较大区别，参考pytorch代码中将pth模型转换为ONNX模型的代码片段，`https://github.com/pytorch/pytorch/blob/master/torch/ONNX/symbolic.py`

```python
# batch_norm
out = g.op("BatchNormalization", input, weight, bias, running_mean, running_var,
            epsilon_f=eps,
            momentum_f=1 - momentum,
            outputs=1 if not training else 5)

# instance_norm
return g.op("InstanceNormalization", input, weight, bias, epsilon_f=eps)
```

可以看到，`instance_norm`中是没有running_mean和running_var参数的(batch_size为1，统计这个值没有意义)，也没有momentum

参考`https://github.com/ONNX/ONNX/blob/88d178459973449bfab7346958281a0c06cdd661/ONNX/defs/nn/defs.cc`

```python
BatchNormalization
{
    "Attr": [spatial, epsilon, momentum] # spatial这个属性一般不用 还有is_test这个属性在早期的ONNX版本也会出现
    "Input": [X, scale, B, mean, var]
    "Output": [Y, mean, var, save_mean, save_var]  #  后4个可选
}
InstanceNormalization
{
    "Attr": [epsilon, ]
    "Input": [input, scale, B]
    "Output": [output, ]
}
```

ONNX当中还有`instance_norm`的numpy实现示例，如下

```python
class InstanceNormalization(Base):

    @staticmethod
    def export():  # type: () -> None
        def _instancenorm_test_mode(x, s, bias, epsilon=1e-5):  # type: ignore
            dims_x = len(x.shape)
            axis = tuple(range(2, dims_x))
            mean = np.mean(x, axis=axis, keepdims=True)
            var = np.var(x, axis=axis, keepdims=True)
            dim_ones = (1,) * (dims_x - 2)
            s = s.reshape(-1, *dim_ones)
            bias = bias.reshape(-1, *dim_ones)
            return s * (x - mean) / np.sqrt(var + epsilon) + bias
```

其他更多细节参考ONNX的文档

## 0x02 从前端到后端

本节涉及到修改文件`tvm/nnvm/python/nnvm/frontend/onnx.py`

所谓NNVM前端，其作用就是把五花八门的模型转换到NNVM内部中一个统一的表示，然后再编译，如下所示：

```python
sym, params = nnvm.frontend.from_ONNX(ONNX_model)
graph, lib, params = nnvm.compiler.build(sym, target, shape_dict, params=params, dtype={})

```

在前端的ONNX实现中`InstanceNormalization`是留空未实现的，仿照BatchNorm的格式将其实现，注意上一节我们提到的属性上的区别，有些东西`instance_norm`是没有的

```python
class BatchNorm(OnnxOpConverter):
    
    @classmethod
    def _impl_v1(cls, inputs, attr, params):
    # TODO(zhreshold): 'spatial' is not properly handled here.
        return AttrCvt(
            op_name='batch_norm',
            disables=['momentum'],
            ignores=['spatial', 'is_test', 'consumed_inputs'])(inputs, attr,
                                                                params)

class InstanceNorm(OnnxOpConverter):
    
    @classmethod
    def _impl_v1(cls, inputs, attr, params):
        # NOTE instance norm parameters is different from batch norm
        return AttrCvt(op_name='instance_norm')(inputs, attr, params)
```

当然现在后端是没有`instance_norm`这个OP的，我们需要在NNVM后端注册`instance_norm`

## 0x03 在NNVM中注册新OP流程

本节主要涉及到改动以下两个文件：

- `tvm/nnvm/include/nnvm/top/nn.h`
- `tvm/nnvm/src/top/nn/nn.cc`

关于怎么在NNVM中注册一个OP可以参考这个文章[MXNet 中新增 Operator](http://shuokay.com/2017/10/04/mxnet-add-op-in-backend/)，这里简单列出要点：

1. 头文件中的`Parameter Registration`，定义该OP中有哪些参数
2. `Attribute Inference`，包括shape和type的inference
3. `Forward & Backward Function`，这一部分在MXNet中应该是必需的，而在TVM中由于我们只需要inference，这里暂时先不讨论这个
4. `Operator Registration`，前面的事情完成后，最后一步就是OP的注册，这样才可以把我们定义的OP暴露给前端

其中`Operator Registration`中需要定义诸多信息，输入输出个数、名称、类型，FInferShape、FInferType、FCorrectLayout函数绑定。如果仔细观察
TVM源码会发现，有很多OP注册了`FTVMCompute`这个属性，但是也有一些OP并没有注册，这是实际上是非常重要的一个属性，通过它，NNVM才能知道这个OP该如何计算

## 0x04 从NNVM到TOPI

本节涉及到修改文件`tvm/nnvm/python/nnvm/top/nn.py`

刚才我们仅仅说了如何在NNVM中注册一个OP，在正式切入到TOPI的算法之前，我们需要让NNVM知道如何找到对应的TOPI算法，这里有以下几种实现的方式：

1. 直接在`FTVMCompute`属性中注册，映射到`topi::nn::xxx`
2. 在`tvm/nnvm/python/nnvm/top/nn.py`中进行注册，通过`@reg.register_compute(xxx)`，此外注意到还有`@reg.register_schedule(xxx)`，这是在注册Schedule(后面再详细讲)
3. 还有一种比较有技巧性的操作，直接在`tvm/nnvm/src/compiler/simplify_inference.cc`里处理，`batch_norm`就是这么做的(享受同等待遇的OP还有`dropout`)，直接把计算和fuse两步融为一步，算是优化到了比较极致的地步，这也直接导致模仿`batch_norm`实现`instance_norm`的计划破产……实际上相当于直接把`batch_norm`和`dropout`两个OP给替换掉了(只考虑inference的情况)，`dropout`直接忽略掉，而`batch_norm`则替换为了若干个元OP的组合(减moving_mean，除以moving_var，乘gamma，加beta，还有broadcast之类的，所以在后面graph fuse的过程中，我们会看到这样的一个op，`fuse___add_scalar___sqrt___rdiv_scalar___elemwise_mul`)

所以在NNVM的OP定义中，`batch_norm`是不用注册`FTVMCompute`的，因为它被替换掉了，那能不能仿照`batch_norm`直接在`simplify_inference.cc`中写`instance_norm`的处理代码？个人感觉不好操作，毕竟原理不同，`instance_norm`涉及到对输入内容全局求均值、方差等，不像`batch_norm`在inference阶段的操作比较好分解。

所以最后选择在`tvm/nnvm/python/nnvm/top/nn.py`中进行注册，这里可以仿照`lrn`或者`l2_normalize`的写法

```python
@reg.register_compute("instance_norm")
def compute_instance_norm(attrs, inputs, _):
    eps = attrs.get_float("epsilon")
    return topi.nn.instance_norm_inference(inputs[0], inputs[1], inputs[2], eps, False)

@reg.register_schedule("instance_norm")
def schedule_instance_norm(attrs, outs, target):
    with tvm.target.create(target):
        return topi.generic.schedule_instance_norm(outs)

reg.register_pattern("instance_norm", OpPattern.OPAQUE)
```

## 0x05 描述TOPI算法

本节涉及到修改的文件(Python和C++二选一即可)

- `tvm/topi/python/topi/nn/__init__.py`
- `tvm/topi/python/topi/nn/instance_norm.py`

- `tvm/topi/src/topi.cc`
- `tvm/topi/include/topi/nn/instance_norm.h`

TOPI的全称是`TVM Operator Inventory`，TVM很好的借鉴了Halide的思想，将算法(Algorithm)和计算过程(Schedule)分离，本小节先简单介绍如何用TVM描述算法，下一小节介绍Schedule

用TVM描述算法就是在理解OP计算过程的基础上，用TVM的表达式把算法写出来，以非常基础的Dense层(FC层)为例，其写法如下所示，要点我写到注释中了：

```python
def dense_default(data, weight, bias=None):
    assert len(data.shape) == 2 and len(weight.shape) == 2, \
        "only support 2-dim dense"
    if bias is not None:
        assert len(bias.shape) == 1
    batch, in_dim = data.shape
    out_dim, _ = weight.shape
    # 定义一个IterVar
    k = tvm.reduce_axis((0, in_dim), name='k')
    # 定义计算方式，tvm.compute的第一个参数为输出的形状，第二个参数为lambda表达式
    # lambda表达式中定义了输出中每个“坐标”处的值是如何计算的，其中有用到上面定义的IterVar
    matmul = tvm.compute((batch, out_dim), \
                         lambda i, j: tvm.sum(data[i, k] * weight[j, k], axis=k), \
                         tag='dense')
    if bias is not None:
        matmul = tvm.compute((batch, out_dim), \
                             lambda i, j: matmul[i, j] + bias[j], \
                             tag=tag.BROADCAST)
    return matmul
```

Dense算是比较简单的例子了，也有较为复杂的OP，例如目标检测中的`nms`，可以看下它的实现`https://github.com/dmlc/tvm/blob/master/topi/python/topi/vision/nms.py`

回到`instance_norm`，它与`batch_norm`最主要的区别在于inference时，`batch_norm`是减去moving_mean，然后除以moving_var的平方根，而`instance_norm`没有moving_mean和moving_var，减去的是自身每个通道的mean，除以相应的var平方根，剩下的gamma和beta操作是一样的，实现如下

```python
def instance_norm_inference(data, gamma, beta, eps, fix_gamma):
    assert len(data.shape) == 4, "only support 4-dim instance norm"
    batch, channel, height, width = data.shape
    rh = tvm.reduce_axis((0, height), name="rh")
    rw = tvm.reduce_axis((0, width), name="rw")
    # 当前batch, channel的均值
    s_mean = tvm.compute((batch, channel), \
            lambda b, c: tvm.sum(data[b, c, rh, rw] / (height * width), axis=[rh, rw]))
    # 再次使用相同的IterVar的时候需要重新定义一下，否则直接使用会报一个越界的错误
    rh = tvm.reduce_axis((0, height), name="rh")
    rw = tvm.reduce_axis((0, width), name="rw")
    s_mean_2 = tvm.compute((batch, channel), \
            lambda b, c: tvm.sum(tvm.intrin.power(data[b, c, rh, rw], 2) / (height * width), axis=[rh, rw]))
    # 当前batch, channel的方差
    s_var = tvm.compute((batch, channel), \
            lambda b, c: s_mean_2[b, c] - tvm.intrin.power(s_mean[b, c], 2))
    if fix_gamma:
        out = tvm.compute((batch, channel, height, width), \
            lambda b, c, h, w: (data[b, c, h, w] - s_mean[b, c]) / \
            tvm.intrin.sqrt(s_var[b, c] + eps) + beta[c])
    else:
        out = tvm.compute((batch, channel, height, width), \
            lambda b, c, h, w: (data[b, c, h, w] - s_mean[b, c]) / \
            tvm.intrin.sqrt(s_var[b, c] + eps) * gamma[c] + beta[c])
    return out
```

以上代码仅仅描述了算法，我们还需要在对应的target平台上注册相具体的计算方式Schedule

## 0x06 定义Schedule

本节涉及到修改的文件(Python和C++二选一)

- `tvm/topi/python/topi/generic/nn.py`
- `tvm/topi/python/topi/cuda/nn.py`

- `tvm/topi/include/topi/cuda/instance_norm.h`

写完了Algorithm，接下来是Schedule，Schedule描述了TOPI的计算方式，这个在不同平台显然是有区别的，为了得到最优性能，我们需要自己来定义计算方式。以CUDA为例，我们需要定义`blockIdx.x`和`threadIdx.x`等等，这个有点涉及到CUDA底层编程的知识了

Schedule总的入口文件在`topi/python/topi/generic/nn.py`，而对接到不同的target平台，其Schedule代码在对应的文件夹下，例如CUDA平台的Schedule代码都在`tvm/topi/python/topi/cuda`文件夹下，arm-cpu平台的Schedule代码在`tvm/topi/python/topi/arm_cpu`下

定义`instance_norm`在CUDA平台的Schedule时，可以直接在`topi/python/topi/cuda/nn.py`里写，代码如下，要点写在注释中了：

```python
@generic.schedule_instance_norm.register(["cuda"])
def schedule_instance_norm(outs):
    # 从刚才的TOPI算法的最后返回tensor中，取出涉及到tvm.compute的几个tensor
    fin = outs[0].op.input_tensors
    mean = fin[1]
    var = fin[2]
    mean_2 = var.op.input_tensors[0]
    # instance_norm的计算过程中涉及到4个tvm.compute
    # 每个tvm.compute都需要Schedule
    ts = [mean, mean_2, var, outs[0]]

    s = tvm.create_schedule([x.op for x in ts])

    # 这里采用比较简单粗暴的方式，即每个tvm.compute都采用相同的Schedule方式
    # 事实上深入思考计算过程，还有进一步优化的可能，我也在做进一步的探索和尝试
    def _schedule(Out):  # the type of Out is tensor
        num_thread = 8
        block_x = tvm.thread_axis("blockIdx.x")
        block_y = tvm.thread_axis("blockIdx.y")
        thread_x = tvm.thread_axis((0, num_thread), "threadIdx.x")
        thread_y = tvm.thread_axis((0, num_thread), "threadIdx.y")

        by, ty = s[Out].split(s[Out].op.axis[0], factor=num_thread)
        bx, tx = s[Out].split(s[Out].op.axis[1], factor=num_thread)
        s[Out].reorder(by, bx, ty, tx)
        s[Out].bind(ty, thread_y)
        s[Out].bind(tx, thread_x)
        s[Out].bind(by, block_y)
        s[Out].bind(bx, block_x)

    for x in ts:
        _schedule(x)

    return s
```

这个版本的Schedule实现是比较初级的，有很多优化并没有做到位，肯定还存在进一步优化的可能。

到这一步，`instance_norm`这个OP就加入到了TVM当中，当然目前只支持CUDA和LLVM两个target平台

# 7 Graph Fuse中出现的问题

完成了以上修改后，发现了一个非常奇怪的Bug，se_resnet_101_ibn_a模型在opt_level=0的时候正常(相当于没有做优化，速度和效率会略低)，而在opt_level=3的时候会报错(做了大量优化，包括合并所有可以合并的元OP)，报错信息提示在`fuse_matmul_relu`这个op上存在host到device内存的直接访问，查了大量资料发现，这个问题是由于Graph Fuse规则不合理或者对应平台Schedule未定义导致的。

但是很神奇的是se_resnet_101模型并没有这个问题，所以我一直在查找是不是`instance_norm`出了问题。但是经过排查后发现问题竟然出在SE模块上，而且是一个意想不到的地方……原因在具体的实现上，se_resnet_101_ibn_a里面的SE模块中的两个FC层是无bias的，所以在从pytorch转换到ONNX的时候，得到的图是由matmul, transpose, relu所组成的。而普通的se_resnet_101模型，默认SE模块中的FC层是有bias的，所以能够很优雅的转换为GEMM，而GEMM在Graph Fuse时是不会报错的，两者结构差异如下所示：

se_resnet_101的ONNX模型中SE结构

![](http://lc-cf2bfs1v.cn-n1.lcfile.com/e627d78f1836e8bea23e.png)

se_resnet_101_ibn_a的ONNX模型中SE结构

![](http://lc-cf2bfs1v.cn-n1.lcfile.com/8175bb741fb62401397e.png)

所以，解决的思路有两种

- 直接解决TVM中的Graph Fuse规则存在的问题，但是由于我还没有研究深入到Graph Fuse那个层次(捂脸)，也不太清楚底层合并的逻辑(未来准备研究研究)，所以很难直接进行修复
- 既然GEMM是能够直接被TVM优化的而不出问题的，那么直接把matmul换成GEMM不就行了？只需要把bias置为0即可。涉及到的部分在pytorch模型转换到ONNX的过程中，需要改动pytorch源码下的`torch/ONNX/symbolic.py`，作如下修改即可，实际结果是等价的

```python
def matmul(g, self, other):
    # return g.op("MatMul", self, other)
    # 上一行为原代码，下面为改动后的实现，其中C就是全0的bias
    ty = self.type().scalarType().lower()
    C = g.constant(0, [other.type().sizes()[1]], ty)
    # 这里稍微解释下GEMM的计算方式，假设输入有三个矩阵A,B,C，计算公式如下(这里没考虑有转置属性的情况)
    # alpha * AB + beta * C
    return g.op("Gemm", self, other, C, beta_f=0.0, alpha_f=1.0, broadcast_i=True)
```

实测使用TVM后的显存占用和速度(batch_size=8)如下所示：

- TVM 显存429MB, 速度~37ms
- ONNX 显存2145MB，速度~50ms

最后推荐一个模型结构可视化工具[Netron](https://github.com/lutzroeder/netron)，手动查看模型结构参数必备神器

仓促行文，研究的也不算深入，难免存在错误和问题，欢迎大佬们一起讨论交流~我的邮箱bindog###outlook.com

如果觉得本文对您有帮助，欢迎打赏我一杯咖啡钱~

![](http://lc-cf2bfs1v.cn-n1.lcfile.com/bf93ca21e51fb4b0e7ca.png)