# bilive_client

此分支是一个次分支，特别感谢[主分支](https://github.com/lzghzr/bilive_client)所有参与者的基础奠定

## 使用releases
不存在的，不存在的，永远也不会发release的

## 自行编译
1. 安装[git](https://git-scm.com/downloads)
2. 安装[Node.js](https://nodejs.org/)
3. `git clone https://github.com/Vector000/bilive_client.git` (第一次使用先clone，或直接使用GitHub的Download ZIP)
4. `cd bilive_client`
5. `git pull` (获取项目更新)
6. `npm install`
7. `npm run build`
8. `npm start`

[点此进行设置](http://github.halaal.win/bilive_client/)\
[国内设置地址](http://lzoczr.gitee.io/bilive_client_view/)\
可使用`/doc/index.html`进行本地设置，推荐\

* 感谢大佬的推荐！趴 _(:3」∠)_

## 增添功能
* 每4h查询挂机用户个人/勋章/包裹信息（默认开启，可自定义，更新后可serverChan推送）
* 领取总督开通奖励
* 根据亲密度赠送礼物
* ~~硬币兑换银瓜子~~ （已删除，目测破站已经关闭此接口）
* 添加entry_action以部分规避封禁
* ~~利用entry_action回显来部分规避钓鱼房间~~（已删除，目测接口已失效）
* 多分区监听，每个分区默认监听3个房间以减少漏抽
* 检测到用户被封禁后发送MSG通知并停抽(采用12h判别)
* ~~可通过查询服务器来获取提督、舰长信息并领取亲密度奖励~~(已废弃，即时性不好且容易403，感谢 @Dawnnnnnn 项目中的上船监控代码)
* 增添主站任务，适合我这种懒得手动投币的
* 利用[bilive_server](https://github.com/lzghzr/bilive_server)可实现上船和节奏风暴的实时获取
* 无聊写了个自定义监听方法，有意关闭本地房间监听/关闭远程房间监听的可以试试

## TO-DO

~~咕咕咕，咕咕咕，咕咕咕咕~~\
统计功能

## 吐槽
* ~~(2018.11.11) 又死了，不开心~~
* (2018.11.26)又活了，巨开心
