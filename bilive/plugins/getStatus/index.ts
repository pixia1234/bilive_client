import { Options as requestOptions } from 'request'
import Plugin, { tools, AppClient } from '../../plugin'

class GetStatus extends Plugin {
  constructor() {
    super()
  }
  public name = '运行统计'
  public description = '定时log并推送运行统计数据'
  public version = '0.0.5'
  public author = 'Vector000'
  // 监听状态
  private listenStatus: any = {
    startTime: 0,
    smallTV: 0,
    raffle: 0,
    lottery: 0,
    beatStorm: 0
  }
  // 监听状态(Daily, 只统计当前0点开始的监听量)
  private todayListenStatus: any = {
    startTime: 0,
    smallTV: 0,
    raffle: 0,
    lottery: 0,
    beatStorm: 0
  }
  // 封禁列表
  private _banList: Map<string, boolean> = new Map()
  // 抽奖统计
  private _raffleStatus: any = {}
  // 抽奖统计(Daily, 只统计当前0点开始的获奖量)
  private _todayRaffleStatus: any = {}
  public async load({ defaultOptions, whiteList }: { defaultOptions: options, whiteList: Set<string> }) {
    defaultOptions.config['getStatus'] = 4
    defaultOptions.info['getStatus'] = {
      description: '查看挂机状态',
      tip: '定时log并推送运行状态数据，输入整数表示时间间隔(h)；若留空，则表示不推送',
      type: 'number'
    }
    whiteList.add('getStatus')
    this.loaded = true
  }
  public async start({ users }: { users: Map<string, User> }) {
    this.clearStatus(this._raffleStatus, users)
    this.clearStatus(this._todayRaffleStatus, users)
    this._banList.clear()
    this.listenStatus.startTime = Date.now()
    this._getStatus(users)
  }
  public async loop({ cstMin, cstHour, cstString, options, users }: { cstMin: number, cstHour: number, cstString: string, options: options, users: Map<string, User> }) {
    let time = <number>options.config.getStatus
    if (cstMin === 0 && cstHour % time === 0) this._getStatus(users)
    if (cstMin === 0 && cstHour % 12 === 0)  this._banList.clear()
    if (cstString === '00:00') {
      this.clearStatus(this._todayRaffleStatus, users)
      for (let key in this.todayListenStatus) {
        this.todayListenStatus[key] = 0
      }
    }
  }
  public async msg({ message }: { message: raffleMessage | lotteryMessage | beatStormMessage }) {
    this.listenStatus[message.cmd]++
    this.todayListenStatus[message.cmd]++
  }
  public async notify({ msg }: { msg: pluginNotify }) {
    let data = msg.data
    if (msg.cmd === 'ban') {
      if (!this._banList.get(data.uid)) {
        this._banList.set(data.uid, true)
        tools.Log(`${msg.data.nickname}已被封禁`)
        tools.sendSCMSG(`${msg.data.nickname}已被封禁`)
      }
    }
    if (msg.cmd === 'earn') {
      let len = this._raffleStatus[data.uid].earned.length
      for (let i = 0; i <= len; i++) {
        if (i === len) {
          this._raffleStatus[data.uid].earned.push({ name: data.name, num: data.num })
          break
        }
        if (data.name === this._raffleStatus[data.uid].earned[i].name) {
          this._raffleStatus[data.uid].earned[i].num += data.num
          break
        }
      }
      let dlen = this._todayRaffleStatus[data.uid].earned.length
      for (let i = 0; i <= dlen; i++) {
        if (i === dlen) {
          this._todayRaffleStatus[data.uid].earned.push({ name: data.name, num: data.num })
          break
        }
        if (data.name === this._todayRaffleStatus[data.uid].earned[i].name) {
          this._todayRaffleStatus[data.uid].earned[i].num += data.num
          break
        }
      }
    }
    if (msg.cmd === 'join') {
      this._raffleStatus[data.uid].joined[data.type]++
      this._todayRaffleStatus[data.uid].joined[data.type]++
    }
  }
  private async clearStatus(status: any, users: Map<string, User>) {
    users.forEach(user => {
      status[user.uid] = {
        earned: [],
        joined: {
          smallTV: 0,
          raffle: 0,
          lottery: 0,
          beatStorm: 0
        }
      }
    })
  }
  /**
   * 用户信息
   *
   * @private
   * @memberof GetStatus
   */
  private async _getStatus(users: Map<string, User>) {
    let rawMsg: any = {} // 原始消息数据
    for (const [uid, user] of users) {
      if (!user.userData.status) continue
      let tmp: any = {
        biliUID: user.userData.biliUID,
        nickname: user.nickname,
        ban: (!this._banList.get(user.uid) || this._banList.get(user.uid) === undefined) ? false : true
      }
      tmp['liveData'] = await this._getLiveInfo(user)
      tmp['medalData'] = await this._getMedalInfo(user)
      tmp['bagData'] = await this._getBagInfo(user)
      tmp['raffleData'] = await this._getRaffleInfo(user)
      rawMsg[uid] = tmp
    }
    this._logMSGHandler(rawMsg)
    this._pushMSGHandler(rawMsg)
  }
  /**
   * 获取liveInfo
   *
   * @memberof GetStatus
   */
  private async _getLiveInfo(user: User) {
    let result: any = null
    const userInfo: requestOptions = {
      uri: `https://api.live.bilibili.com/User/getUserInfo?ts=${AppClient.TS}`,
      json: true,
      jar: user.jar,
      headers: user.headers
    }
    const getUserInfo = await tools.XHR<userInfo>(userInfo)
    if (getUserInfo === undefined || getUserInfo.response.statusCode !== 200) result = false
    else if (getUserInfo.body.code === 'REPONSE_OK') result = getUserInfo.body.data
    return result
  }
  /**
   * 获取medalInfo
   *
   * @memberof GetStatus
   */
  private async _getMedalInfo(user: User) {
    let result: any = null
    const medalInfo: requestOptions = {
      uri: `https://api.live.bilibili.com/i/api/medal?page=1&pageSize=25`,
      json: true,
      jar: user.jar,
      headers: user.headers
    }
    const getMedalInfo = await tools.XHR<medalInfo>(medalInfo)
    if (getMedalInfo === undefined) result = false
    else {
      if (getMedalInfo.response.statusCode === 200 && getMedalInfo.body.code === 0) {
        const medalData = getMedalInfo.body.data
        if (medalData.count === 0) result = 0
        else {
          let medalNum = 0
          medalData.fansMedalList.forEach(medal => {
            if (medal.status === 1) result = medal
            else medalNum++
          })
          if (medalNum === medalData.count) result = -1
        }
      }
      else result = false
    }
    return result
  }
  /**
   * 获取bagInfo
   *
   * @memberof GetStatus
   */
  private async _getBagInfo(user: User) {
    let result: any = null
    const bag: requestOptions = {
      uri: `https://api.live.bilibili.com/gift/v2/gift/m_bag_list?${AppClient.signQueryBase(user.tokenQuery)}`,
      json: true,
      headers: user.headers
    }
    const bagInfo = await tools.XHR<bagInfo>(bag, 'Android')
    if (bagInfo === undefined || bagInfo.response.statusCode !== 200 || bagInfo.body.code !== 0) result = false
    else if (bagInfo.body.data.length === 0) result = 0
    else result = bagInfo.body.data
    return result
  }
  /**
   * 获取raffleInfo
   *
   * @memberof GetStatus
   */
  private async _getRaffleInfo(user: User) {
    let result: any = {
      joinData: {
        total: {},
        today: {}
      },
      earnData: {
        total: {},
        today: {}
      }
    }
    result.joinData.total = this._raffleStatus[user.uid].joined
    result.joinData.today = this._todayRaffleStatus[user.uid].joined
    result.earnData.total = this._raffleStatus[user.uid].earned
    result.earnData.today = this._todayRaffleStatus[user.uid].earned
    return result
  }
  /**
   * 处理logMSG
   *
   * @memberof GetStatus
   */
  private _logMSGHandler(rawMsg: any) {
    let logMsg: string = '\n'
    let headLine: string = `/********************************* bilive_client 运行信息 *********************************/`
    let startTime = new Date()
    startTime.setTime(this.listenStatus.startTime)
    let timeLine: string = `本次挂机开始于 ${startTime}`
    let smallTVLine: string = `共监听到小电视抽奖数：${this.listenStatus.smallTV}(${this.todayListenStatus.smallTV})`
    let raffleLine: string = `共监听到活动抽奖数：${this.listenStatus.raffle}(${this.todayListenStatus.raffle})`
    let lotteryLine: string = `共监听到大航海抽奖数：${this.listenStatus.lottery}(${this.todayListenStatus.lottery})`
    let beatStormLine: string = `共监听到节奏风暴抽奖数：${this.listenStatus.beatStorm}(${this.todayListenStatus.beatStorm})`
    logMsg += headLine + '\n' + timeLine + '\n' + smallTVLine + '\n' + raffleLine + '\n' + lotteryLine + '\n' + beatStormLine
    for (const uid in rawMsg) {
      let line, live, medal, bag, raffle, ban, vip: string = ''
      let user = rawMsg[uid]
      user.ban ? ban = '已封禁' : ban = '未封禁'
      if (user.vip === 0) vip = '不是老爷'
      else if (user.vip === 1 && user.svip === 0) vip = '月费老爷'
      else if (user.svip === 1) vip = '年费老爷'
      line = `/******************************用户 ${user.nickname} 信息******************************/`
      live = function() {
        if (user.liveData === false) return (`用户信息获取失败`)
        else {
          return (`ID：${user.liveData.uname}  LV${user.liveData.user_level}  \
EXP：${user.liveData.user_intimacy}/${user.liveData.user_next_intimacy} \
(${Math.floor(user.liveData.user_intimacy / user.liveData.user_next_intimacy * 100)}%)  \
排名：${user.liveData.user_level_rank}\n金瓜子：${user.liveData.gold}  \
银瓜子：${user.liveData.silver}  硬币：${user.liveData.billCoin}  当前状态：${ban}  ${vip}`)
        }
      }()
      medal = function() {
        if (user.medalData === false) return (`勋章信息获取失败`)
        else if (user.medalData === -1) return (`未佩戴勋章`)
        else if (user.medalData === 0) return (`无勋章`)
        else {
          return (`勋章：${user.medalData.medal_name}${user.medalData.level}  \
EXP：${user.medalData.intimacy}/${user.medalData.next_intimacy} \
(${Math.floor(user.medalData.intimacy / user.medalData.next_intimacy * 100)}%)  \
排名：${user.medalData.rank}`)
        }
      }()
      bag = function() {
        if (user.bagData === false) return (`包裹信息获取失败`)
        else if (user.bagData === 0) return (`包裹空空的`)
        else {
          let tmp: string = ''
          for (let i = 0; i < user.bagData.length; i++) {
            let giftItem = user.bagData[i]
            let expireStr: string = ''
            let expire = user.bagData[i].expireat
            if (expire === 0) expireStr = `永久`
            else if (expire / 3600 < 1) expireStr = `${Math.floor(expire / 60)}分钟`
            else if (expire / (24 * 3600) < 1) expireStr = `${Math.floor(expire / 3600)}小时`
            else expireStr = `${Math.floor(expire / 24 / 3600)}天`
            tmp += `${giftItem.gift_name} x${giftItem.gift_num} (有效期${expireStr})    `
            if ((i + 1) % 3 === 0) tmp += '\n'
          }
          return tmp
        }
      }()
      raffle = function() {
        let tmp: string = '\n本次挂机，此账号共参与抽奖：\n'
        tmp += `smallTV抽奖：${user.raffleData.joinData.total.smallTV}(${user.raffleData.joinData.today.smallTV})\n`
        tmp += `raffle抽奖：${user.raffleData.joinData.total.raffle}(${user.raffleData.joinData.today.raffle})\n`
        tmp += `lottery抽奖：${user.raffleData.joinData.total.lottery}(${user.raffleData.joinData.today.lottery})\n`
        tmp += `beatStorm抽奖：${user.raffleData.joinData.total.beatStorm}(${user.raffleData.joinData.today.beatStorm})\n`
        tmp += `共获得奖励：\n`
        user.raffleData.earnData.total.forEach((earn: any) => tmp += `${earn.name} x${earn.num}\n`)
        tmp += `今日收益：\n`
        user.raffleData.earnData.today.forEach((earn: any) => tmp += `${earn.name} x${earn.num}\n`)
        return tmp
      }()
      logMsg += '\n' + line + '\n' + live + '\n' + medal + '\n' + bag + '\n' + raffle + '\n'
    }
    tools.Log(logMsg)
  }
  /**
   * 处理pushMSG
   *
   * @memberof GetStatus
   */
  private _pushMSGHandler(rawMsg: any) {
    let pushMsg: string = ''
    pushMsg += `# bilive_client 挂机情况报告\n`
    let startTime = new Date()
    startTime.setTime(this.listenStatus.startTime)
    pushMsg += `- 本次挂机开始于 ${startTime}\n`
    pushMsg += `- 共监听到小电视抽奖数：${this.listenStatus.smallTV}(${this.todayListenStatus.smallTV})\n`
    pushMsg += `- 共监听到活动抽奖数：${this.listenStatus.raffle}(${this.todayListenStatus.raffle})\n`
    pushMsg += `- 共监听到大航海抽奖数：${this.listenStatus.lottery}(${this.todayListenStatus.lottery})\n`
    pushMsg += `- 共监听到节奏风暴抽奖数：${this.listenStatus.beatStorm}(${this.todayListenStatus.beatStorm})\n`
    for (const uid in rawMsg) {
      let line, live, medal, bag, raffle, ban, vip: string = ''
      let user = rawMsg[uid]
      user.ban ? ban = '已封禁' : ban = '未封禁'
      if (user.vip === 0) vip = '不是老爷'
      else if (user.vip === 1 && user.svip === 0) vip = '月费老爷'
      else if (user.svip === 1) vip = '年费老爷'
      line = `# 用户 *****${user.nickname}***** 信息\n`
      live = function() {
        if (user.liveData === false) return (`## 用户信息获取失败\n`)
        else {
          return (`## 用户信息\n- ID：${user.liveData.uname} LV${user.liveData.user_level}  ${vip}  当前状态：${ban}\n
- EXP：${user.liveData.user_intimacy}/${user.liveData.user_next_intimacy} (${Math.floor(user.liveData.user_intimacy / user.liveData.user_next_intimacy * 100)}%) \
排名：${user.liveData.user_level_rank}\n- 金瓜子：${user.liveData.gold}  银瓜子：${user.liveData.silver}  硬币：${user.liveData.billCoin}\n`)
        }
      }()
      medal = function() {
        if (user.medalData === false) return (`## 勋章信息获取失败\n`)
        else if (user.medalData === -1) return (`## 未佩戴勋章\n`)
        else if (user.medalData === 0) return (`## 无勋章\n`)
        else {
          return (`## 勋章信息\n- 勋章：${user.medalData.medal_name}${user.medalData.level} EXP：${user.medalData.intimacy}/${user.medalData.next_intimacy} \
(${Math.floor(user.medalData.intimacy / user.medalData.next_intimacy * 100)}%) 排名：${user.medalData.rank}\n`)
        }
      }()
      bag = function() {
        if (user.bagData === false) return (`## 包裹信息获取失败\n`)
        else if (user.bagData === 0) return (`## 包裹空空的\n`)
        else {
          let tmp: string = '## 包裹信息\n名称|数量|有效期\n---|:--:|---:\n'
          for (let i = 0; i < user.bagData.length; i++) {
            let giftItem = user.bagData[i]
            let expireStr: string = ''
            let expire = user.bagData[i].expireat
            if (expire === 0) expireStr = `永久`
            else if (expire / 3600 < 1) expireStr = `${Math.floor(expire / 60)}分钟`
            else if (expire / (24 * 3600) < 1) expireStr = `${Math.floor(expire / 3600)}小时`
            else expireStr = `${Math.floor(expire / 24 / 3600)}天`
            tmp += `${giftItem.gift_name}|${giftItem.gift_num}|${expireStr}\n`
          }
          return (tmp)
        }
      }()
      raffle = function() {
        let tmp: string = '## 抽奖情况\n'
        tmp += `- smallTV抽奖：${user.raffleData.joinData.total.smallTV}(${user.raffleData.joinData.today.smallTV})\n`
        tmp += `- raffle抽奖：${user.raffleData.joinData.total.raffle}(${user.raffleData.joinData.today.raffle})\n`
        tmp += `- lottery抽奖：${user.raffleData.joinData.total.lottery}(${user.raffleData.joinData.today.lottery})\n`
        tmp += `- beatStorm抽奖：${user.raffleData.joinData.total.beatStorm}(${user.raffleData.joinData.today.beatStorm})\n`
        tmp += `### 共获得奖励：\n`
        user.raffleData.earnData.total.forEach((earn: any) => tmp += `- ${earn.name} x${earn.num}\n`)
        tmp += `### 今日收益：\n`
        user.raffleData.earnData.today.forEach((earn: any) => tmp += `- ${earn.name} x${earn.num}\n`)
        return tmp
      }()
      pushMsg += '\n---\n' + line + '\n---\n' + live + '\n---\n' + medal + '\n---\n' + bag + '\n---\n' + raffle + '\n---\n'
    }
    tools.sendSCMSG(pushMsg)
  }
}

/**
 * 个人信息
 *
 * @interface userInfo
 */
interface userInfo {
  code: string
  msg: string
  data: userInfoData
}
interface userInfoData {
  uname: string
  silver: number
  gold: number
  user_level: number
  user_intimacy: number
  user_next_intimacy: number
  user_level_rank: number
  billCoin: number
  vip: number
  svip: number
}
/**
 * 勋章信息
 *
 * @interface medalInfo
 */
interface medalInfo {
  code: number
  msg: string
  data: medalInfoData
}
interface medalInfoData {
  medalCount: number
  count: number
  fansMedalList: medalInfoDataInfo[]
}
interface medalInfoDataInfo {
  status: number
  level: number
  intimacy: number
  next_intimacy: number
  medal_name: string
  rank: number
  target_id: number
  uid: number
}
/**
 * 包裹信息
 *
 * @interface bagInfo
 */
interface bagInfo {
  code: number
  msg: string
  message: string
  data: bagInfoData[]
}
interface bagInfoData {
  id: number
  uid: number
  gift_id: number
  gift_num: number
  expireat: number
  gift_type: number
  gift_name: string
  gift_price: string
  img: string
  count_set: string
  combo_num: number
  super_num: number
}

export default new GetStatus()
