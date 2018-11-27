import { Options as requestOptions } from 'request'
import Plugin, { tools, AppClient } from '../../plugin'

class GetUserInfo extends Plugin {
  constructor() {
    super()
  }
  public name = '用户信息'
  public description = '定时获取用户信息并推送'
  public version = '0.0.3'
  public author = 'Vector000'
  public async load({ defaultOptions, whiteList }: { defaultOptions: options, whiteList: Set<string> }) {
    defaultOptions.newUserData['getUserInfo'] = true
    defaultOptions.info['getUserInfo'] = {
      description: '用户信息',
      tip: '定时获取用户信息并推送',
      type: 'boolean'
    }
    whiteList.add('getUserInfo')
    this.loaded = true
  }
  public async start({ users }: { users: Map<string, User> }) {
    this._getUserInfo(users)
  }
  public async loop({ cstMin, cstHour, users }: { cstMin: number, cstHour: number, users: Map<string, User> }) {
    if (cstMin === 0 && cstHour % 4 === 0) this._getUserInfo(users) // 每4h查询个人信息
  }
  /**
   * 用户信息
   *
   * @private
   * @memberof GetUserInfo
   */
  private async _getUserInfo(users: Map<string, User>) {
    let rawMsg: any = {} // 原始消息数据
    for (const [uid, user] of users) {
      let tmp: any = {
        biliUID: user.userData.biliUID,
        nickname: user.nickname
      }
      tmp['liveData'] = await this._getLiveInfo(user)
      tmp['medalData'] = await this._getMedalInfo(user)
      tmp['bagData'] = await this._getBagInfo(user)
      rawMsg[uid] = tmp
    }
    await this._logMSGHandler(rawMsg)
    await this._pushMSGHandler(rawMsg)
  }
  /**
   * 获取liveInfo
   *
   * @memberof GetUserInfo
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
   * @memberof GetUserInfo
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
   * @memberof GetUserInfo
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
   * 处理logMSG
   *
   * @memberof GetUserInfo
   */
  private _logMSGHandler(rawMsg: any) {
    let logMsg: string = ''
    for (const uid in rawMsg) {
      let line, live, medal, bag, ban: string = ''
      let user = rawMsg[uid]
      user.ban ? ban = '已封禁' : ban = '未封禁'
      line = `/******************************用户 ${user.nickname} 信息******************************/`
      live = function() {
        if (user.liveData === false) return (`用户信息获取失败`)
        else {
          return (`ID：${user.liveData.uname}  LV${user.liveData.user_level}  \
EXP：${user.liveData.user_intimacy}/${user.liveData.user_next_intimacy} \
(${Math.floor(user.liveData.user_intimacy / user.liveData.user_next_intimacy * 100)}%)  \
排名：${user.liveData.user_level_rank}\n金瓜子：${user.liveData.gold}  \
银瓜子：${user.liveData.silver}  硬币：${user.liveData.billCoin}  当前状态：${ban}`)
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
            tmp += `${giftItem.gift_num}个${giftItem.gift_name}：有效期${expireStr}   `
            if (i % 3 === 0) tmp += '\n'
          }
          return (tmp)
        }
      }()
      logMsg += '\n' + line + '\n' + live + '\n' + medal + '\n' + bag + '\n'
    }
    tools.Log(logMsg)
  }
  /**
   * 处理pushMSG
   *
   * @memberof GetUserInfo
   */
  private _pushMSGHandler(rawMsg: any) {
    let pushMsg: string = ''
    for (const uid in rawMsg) {
      let line, live, medal, bag, ban: string = ''
      let user = rawMsg[uid]
      user.ban ? ban = '已封禁' : ban = '未封禁'
      line = `# 用户 **${user.nickname}** 信息`
      live = function() {
        if (user.liveData === false) return (`## 用户信息获取失败\n`)
        else {
          return (`## 用户信息\n- ID：${user.liveData.uname} LV${user.liveData.user_level}  当前状态：${ban}\n
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
      pushMsg += '\n---\n' + line + '\n---\n' + live + '\n---\n' + medal + '\n---\n' + bag + '\n---\n'
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

export default new GetUserInfo()
