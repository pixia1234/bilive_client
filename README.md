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
7. `npm start`

### 手动更新

1. 定位到目录
2. `git pull`
3. `npm i` 或 `npm install`
4. `npm start`

更新之后可能会出现不兼容的情况，可删去`options/options.json`后重新进行设置

可使用网页设置：[点此进行设置](http://vector000.coding.me/bilive_setting/)\
推荐使用`doc/index.html`进行本地设置

### 设置相关

~~服务器挂机用户可通过防火墙设置来开启远程设置，但由此产生的信息泄露及其他风险请自行承担~~

* 现在提供了远程连接数据加密的功能，默认关闭（无密钥）
* 需要打开的用户可以在设置页面中设置密钥（建议最好是直接修改json）

## 使用releases

~~不存在的，不存在的，永远也不会发release的~~
最近有个想法，可能会做release

## Features

* 定时查询挂机效益和用户各类信息，支持统计信息sc微信推送
* 支持根据佩戴勋章的每日亲密度自动赠送礼物
* 添加entry_action以部分规避封禁（玄学，没什么卵用）
* 支持本地多分区监听，每个分区默认监听3个房间
* 用户被封禁后停抽并通知(每天检测两次)
* 增添主站任务，适合我这种懒得手动投币的
* 支持连接云监听转发服务器
* 全局统计，可查看当日挂机成果
* 节奏风暴多次发包以提高中奖率(设置过高风险自负)
* 自动更新，免去频繁设置命令行的麻烦

## TO-DO

* 优化更新逻辑
* 增加API
* 做release
