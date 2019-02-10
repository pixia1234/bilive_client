# bilive_client

这是一个次分支，感谢所有对[主分支](https://github.com/lzghzr/bilive_client)做出贡献的人及其他同类开源软件的开发者

* 感谢大佬的推荐！趴 _(:3」∠)_

## 自行编译
1. 安装[Node.js](https://nodejs.org/)
2. 安装[git](https://git-scm.com/downloads)
3. 选定一个目标安装路径，打开cmd或powershell或各类终端
4. `git clone https://github.com/Vector000/bilive_client.git` (第一次使用先clone，或直接使用GitHub的Download ZIP)
5. `cd bilive_client`
6. `git pull` (获取项目更新，第一次使用可跳过)
7. `npm install`
8. `npm run clean` (编译前清理，第一次使用可跳过)
9. `npm run build`
10. `npm start`

[点此进行设置](http://github.halaal.win/bilive_client/)\
[国内设置地址](http://lzoczr.gitee.io/bilive_client_view/)\
可使用`/doc/index.html`进行本地设置，推荐\

## 使用releases
不存在的，不存在的，永远也不会发release的

## 关于git pull的那些事
由于本人强迫症发作，我将我的所有commit全部整理了一遍，并且加上了gpg签名，所以童鞋们遇到`git pull`时各种`Auto merge fail`的话，请尝试：
1. `git reset --hard HEAD~25`
2. `git pull`
3. 按一般步骤进行编译运行

不便之处，深感抱歉，可以打我XD

## 关于验证码错误
由于辣鸡B站登录似乎会产生验证码识别，我又没那个精力去搞云端识别，所以提供一个解决方法
(更换了v3 oauth，好像不报验证码了？有待观察)

### 桌面环境(win/linux GUI)
可以使用`/doc/index.html`设置页面进行设置，会自动将验证码传到浏览器

### 命令行环境
针对这种使用环境，我专门加了一个验证码serverChan推送功能\
结合我的这个项目[bilive_client_connecter](https://github.com/Vector000/bilive_client_connecter)可以在命令行环境完成验证码的输入

## Features
* 定时查询挂机效益和用户各类信息，支持统计信息sc微信推送
* 支持根据佩戴勋章的每日亲密度自动赠送礼物
* 添加entry_action以部分规避封禁（玄学）
* 多分区监听，每个分区默认监听3个房间以减少漏抽(默认使用lzghzr监听服务器，如需本地监听可删除serverURL)
* 检测到用户被封禁后发送MSG通知并停抽(每天检测两次，检测到可抽奖时发送解禁通知)
* ~~可通过查询服务器来获取提督、舰长信息并领取亲密度奖励~~(已废弃，即时性不好且容易403，感谢 @Dawnnnnnn 项目中的上船监控代码)
* 增添主站任务，适合我这种懒得手动投币的
* 利用[bilive_server](https://github.com/lzghzr/bilive_server)可实现上船和节奏风暴的实时获取，此为默认接口
* 自定义监听，在无有效监听服务器填入时使用本地监听
* 用户礼物、上船亲密度统计，已与用户信息合并为全局统计，并可查看当日挂机成果
* 分用户控制四类礼物的领取，可自主设置优先级
* 节奏风暴多次发包以提高中奖率(设置过高风险自负)

## TO-DO

* 设置界面优化
* 各类抽奖延迟、丢弃概率分类
* 用户优先级分类
* 抽奖方法切换(web/app双端切换)
* 咕咕咕咕咕咕咕
