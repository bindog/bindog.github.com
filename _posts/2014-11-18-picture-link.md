---
author: 宾狗
date: 2014-11-18 12:35+08:00
layout: post
title: "Referer字段那些事"
description: ""
categories:
- 工程
tags:
- 网络
- 爬虫
---
#0x00 测试

test

<script>
var ReferrerKiller=(function(){var URL_REDIRECTION="https://www.google.com/url?q=",PUB={},IE_GT_8=(function(){var trident,match=navigator.userAgent.match(/Trident\/(\d)+/);if(null===match){return false;}
trident=parseInt(match[1],10);if(isNaN(trident)){return false;}
return trident>4;})();function escapeDoubleQuotes(str){return str.split('"').join('\\"');}
function htmlToNode(html){var container=document.createElement('div');container.innerHTML=html;return container.firstChild;}
function objectToHtmlAttributes(obj){var attributes=[],value;for(var name in obj){value=obj[name];attributes.push(name+'="'+escapeDoubleQuotes(value)+'"');}
return attributes.join(' ');}
function htmlString(html,iframeAttributes){var iframeAttributes=iframeAttributes||{},defaultStyles='border:none; overflow:hidden; ',id;if('style'in iframeAttributes){iframeAttributes.style=defaultStyles+iframeAttributes.style;}else{iframeAttributes.style=defaultStyles;}
id='__referrer_killer_'+(new Date).getTime()+Math.floor(Math.random()*9999);return'<iframe \
    style="border 1px solid #ff0000" \
    scrolling="no" \
    frameborder="no" \
    allowtransparency="true" '+
objectToHtmlAttributes(iframeAttributes)+'id="'+id+'" '+' src="javascript:\'\
   <!doctype html>\
   <html>\
   <head>\
   <meta charset=\\\'utf-8\\\'>\
   <style>*{margin:0;padding:0;border:0;}</style>\
   </head>'+'<script>\
     function resizeWindow() {\
     var elems  = document.getElementsByTagName(\\\'*\\\'),\
      width  = 0,\
      height = 0,\
      first  = document.body.firstChild,\
      elem;\
     if (first.offsetHeight && first.offsetWidth) {\
      width = first.offsetWidth;\
      height = first.offsetHeight;\
     } else {\
      for (var i in elems) {\
           elem = elems[i];\
           if (!elem.offsetWidth) {\
            continue;\
           }\
           width  = Math.max(elem.offsetWidth, width);\
           height = Math.max(elem.offsetHeight, height);\
      }\
     }\
     var ifr = parent.document.getElementById(\\\''+id+'\\\');\
     ifr.height = height;\
     ifr.width  = width;\
    }\
   </script>'+'<body onload=\\\'resizeWindow()\\\'>\' + decodeURIComponent(\''+
encodeURIComponent(html)+'\') +\'</body></html>\'"></iframe>';}
function linkHtml(url,innerHTML,anchorParams,iframeAttributes){var html,urlRedirection='';innerHTML=innerHTML||false;if(!innerHTML){innerHTML=url;}
anchorParams=anchorParams||{};if(!('target'in anchorParams)||'_self'===anchorParams.target){anchorParams.target='_top';}
if(IE_GT_8){urlRedirection=URL_REDIRECTION;}
html='<a rel="noreferrer" href="'+urlRedirection+escapeDoubleQuotes(url)+'" '+objectToHtmlAttributes(anchorParams)+'>'+innerHTML+'</a>';return htmlString(html,iframeAttributes);}
PUB.linkHtml=linkHtml;function linkNode(url,innerHTML,anchorParams,iframeAttributes){return htmlToNode(linkHtml(url,innerHTML,anchorParams,iframeAttributes));}
PUB.linkNode=linkNode;function imageHtml(url,imgAttributesParam){var imgAttributes=imgAttributesParam||{},defaultStyles='border:none; margin: 0; padding: 0';if('style'in imgAttributes){imgAttributes.style=defaultStyles+imgAttributes.style;}else{imgAttributes.style=defaultStyles;}
return htmlString('<img src="'+escapeDoubleQuotes(url)+'" '+objectToHtmlAttributes(imgAttributes)+'/>');}
PUB.imageHtml=imageHtml;function imageNode(url,imgParams){return htmlToNode(imageHtml(url,imgParams));}
PUB.imageNode=imageNode;return PUB;})();
</script>

这是一个测试

![测试1](http://a.hiphotos.bdimg.com/wisegame/pic/item/9e1f4134970a304edd48ccfdd2c8a786c9175c4b.jpg)


这是另一个测试

<div id="noreferer">
</div>

<script>
document.getElementById('noreferer').innerHTML = ReferrerKiller.imageHtml('http://a.hiphotos.bdimg.com/wisegame/pic/item/9e1f4134970a304edd48ccfdd2c8a786c9175c4b.jpg');
</script>
