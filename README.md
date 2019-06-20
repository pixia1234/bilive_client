# bilive_client

[![Node.js](https://img.shields.io/badge/Node.js-v10.0%2B-green.svg)](https://nodejs.org)
[![Commitizen friendly](https://img.shields.io/badge/Commitizen-Friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
![GitHub repo size](https://img.shields.io/github/repo-size/Vector000/bilive_client.svg)
[![MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/Vector000/bilive_client/blob/2.1.0-beta/LICENSE)

* 这是一个次分支，感谢所有对[主分支](https://github.com/lzghzr/bilive_client)做出贡献的人及其他同类开源软件的开发者
* 有兴趣支持原作者的，请朝这里打钱=>[给lzghzr打钱](https://github.com/lzghzr/bilive_client/wiki)
* 有兴趣向我投喂的，请朝这里打钱=>[请给我钱](https://github.com/Vector000/Something_Serious/blob/master/pics/mm_reward_qrcode.png)
* 感谢大佬的推荐！趴 _(:3」∠)_

## 使用方法

1. 安装[Node.js](https://nodejs.org/)
2. 安装[Git](https://git-scm.com/downloads)
3. 选择并定位到想要安装的目录
4. `git clone https://github.com/Vector000/bilive_client.git`
5. `cd bilive_client`
6. `npm i` 或 `npm install`
7. `npm i -g pm2`(自动更新所需)
8. `npm start`

### 手动更新

1. 定位到目录
2. `git pull`
3. `npm i` 或 `npm install`
4. `npm start`

更新之后可能会出现不兼容的情况，可删去`options/options.json`后重新进行设置

可使用网页设置：[点此进行设置](http://vector000.coding.me/bilive_setting/)(~~tx云国内的解析好像有点问题，可能需要改host~~好像tx云的解析修好了)\
推荐使用`doc/index.html`进行本地设置

## 设置相关

~~服务器挂机用户可通过防火墙设置来开启远程设置，但由此产生的信息泄露及其他风险请自行承担~~

* 现在提供了远程连接数据加密的功能，默认关闭（无密钥）
* 需要打开的用户可以在设置页面中设置密钥（建议最好是直接修改json）

## 服务端相关

* [原作者](https://github.com/lzghzr/)大佬的服务器11月到期，现提供一个备用服务端`ws://47.101.153.223:20080/#ff5f0db2548baecbcd21c7a50ece57a3`，目前续费到12月多，后续应该也会继续续上(无限+1s)，欢迎各种花式投喂

## 使用releases

~~不存在的，不存在的，永远也不会发release的~~
最近有个想法，可能会做release

## Features

* 定时查询挂机信息，支持微信推送
* 自动送礼V2，自动升勋章
* 本地多分区监听(无ws服务端时可用，只支持广播类抽奖)
* 用户被封禁后停抽并通知(每两小时检测)
* 主站任务(登录/观看/投币)，支持指定投币对象
* 云监听服务器，极大降低漏抽
* 多次参与节奏风暴
* 参与大乱斗抽奖功能
* 自动更新
* 购买主播勋章功能
* 查询全站用户信息功能
* PM2 Support

## TO-DO

* 优化更新逻辑
* 做release
