import Plugin from '../../plugin'
import tools from '../../lib/tools'

class UserCheck extends Plugin {
  constructor() {
    super()
  }
  public name = '用户查询'
  public description = '给定UID，查询任意用户的直播等级/勋章情况'
  public version = '0.0.2'
  public author = 'Vector000'
  public async load({ defaultOptions }: { defaultOptions: options }) {
    defaultOptions.util['userCheck'] = {
      info: {
        value: "用户信息查询",
        info: {
          description: "插件名",
          tip: "",
          type: "string"
        }
      },
      users: {
        value: "",
        list: [],
        info: {
          description: "用户列表",
          tip: "从中选择已有用户，查询直播等级/勋章",
          type: "user"
        }
      },
      uid: {
        value: 0,
        info: {
          description: "UID",
          tip: "查询任意用户的直播等级/勋章情况",
          type: "number"
        }
      }
    }
    this.loaded = true
  }
  private msg?: utilMSG
  public async start({ options, users }: { options: options, users: Map<string, User> }) {
    await this.loadUserList(options, users)
  }
  public async interact({ msg }: { msg: utilMSG }) {
    this.msg = msg
    await this.getUserInfo(msg)
  }
  private utilCallback(msg: string) {
    this.emit('interact', {
      cmd: (<utilMSG>this.msg).cmd,
      ts: (<utilMSG>this.msg).ts,
      utilID: (<utilMSG>this.msg).utilID,
      msg
    })
  }
  /**
   * 加载有效用户列表
   * 
   * @param {options} options
   * @param {Map<string, User>} users
   */
  private async loadUserList(options: options, users: Map<string, User>) {
    users.forEach(async user => {
      if (user.userData.status) {
        const userNickname = user.userData.nickname
        const userBiliUID = user.userData.biliUID
        const userListItem: string = `${userNickname}(${userBiliUID})`;
        (<string[]>options.util['userCheck']['users'].list).push(userListItem)
      }
    })
  }
  /**
   * 获取用户信息
   * 
   * @param {utilMSG} msg
   */
  private async getUserInfo(msg: utilMSG) {
    const data = msg.data
    let uid: number = 0
    if (data['users'].value === '') uid = <number>data.uid.value
    else {
      const userStr = <string>data['users'].value
      let arr = userStr.match(/(?<=\().*(?=\))/g)
      if (arr !== null) uid = Number(arr[arr.length-1])
    }
    let out: string = `UID ${uid} 用户信息：\n`
    out += await this.getUserMainInfo(uid)
    await tools.Sleep(500)
    out += await this.getUserLiveInfo(uid)
    await tools.Sleep(500)
    out += await this.getUserMedalInfo(uid)
    this.utilCallback(out)
  }
  /**
   * 获取用户主站信息
   * 
   * @param {number} uid
   */
  private async getUserMainInfo(uid: number) {
    const userInfo = await tools.XHR<userMainInfo>({
      uri: `https://api.live.bilibili.com/user/v2/User/getMultiple?uids[]=${uid}&attributes[]=info`,
      json: true
    })
    if (userInfo === undefined || userInfo.response.statusCode !== 200 || userInfo.body.code !== 0)
      return '主站信息查询失败\n'
    else {
      const info = userInfo.body.data[uid].info
      let msg: string = ``
      msg += `- ID：${info.uname} | | 主站${info.platform_user_level}级\n`
      return msg
    }
  }
  /**
   * 获取用户等级信息
   * 
   * @param {number} uid
   */
  private async getUserLiveInfo(uid: number) {
    const userInfo = await tools.XHR<userLiveInfo>({
      uri: `https://api.live.bilibili.com/user/v2/User/getMultiple?uids[]=${uid}&attributes[]=level`,
      json: true
    })
    if (userInfo === undefined || userInfo.response.statusCode !== 200 || userInfo.body.code !== 0)
      return '直播信息查询失败\n'
    else {
      const level = userInfo.body.data[uid].level
      let msg: string = `- UL${level.user_level}  UP${level.master_level.level}  更新时间：${level.update_time}\n`
      return msg
    }
  }
  /**
   * 获取用户勋章信息
   * 
   * @param {number} uid
   */
  private async getUserMedalInfo(uid: number) {
    const medalInfo = await tools.XHR<userMedalInfo>({
      uri: `https://api.live.bilibili.com/user/v2/User/getMultiple?uids[]=${uid}&attributes[]=medal`,
      json: true
    })
    if (medalInfo === undefined || medalInfo.response.statusCode !== 200 || medalInfo.body.code !== 0)
      return '勋章信息查询失败\n'
    else {
      let wearedMSG: string = ''
      let otherMSG: string = '其他勋章：\n'
      const medals = medalInfo.body.data[uid].medal
      let i: number = 0
      for (const key in medals) {
        let medal = medals[key]
        if (medal.status === 1) 
          wearedMSG += `佩戴勋章：【${medal.medal_name} | ${medal.level}】 (${medal.intimacy}/${medal.next_intimacy})\n`
        else {
          otherMSG += `【${medal.medal_name} | ${medal.level}】 (${medal.intimacy}/${medal.next_intimacy})`
          i++
          if (i % 2 === 0) otherMSG += '\n'
          else otherMSG += ' | | '
        }
      }
      if (wearedMSG === '') wearedMSG = '无佩戴勋章\n'
      return (wearedMSG + otherMSG)
    }
  }
}
interface apiInfo {
  code: number
  message: string
  msg: string
  data: userMainInfoData | userLiveInfoData | userMedalInfoData
}
/**
 * 主站信息查询
 * 
 * @interface userMainInfo
 */
interface userMainInfo extends apiInfo {
  data: userMainInfoData
}
interface userMainInfoData {
  [index: number]: userMainInfoDataItems
}
interface userMainInfoDataItems {
  info: userMainInfoDataInfo
}
interface userMainInfoDataInfo {
  face: string
  gender: number
  identification: number
  mobile_verify: number
  official_verify: userMainInfoDataInfoVerity
  desc: string
  role: number
  type: number
  platform_user_level: number
  rank: string
  uid: number
  uname: string
  vip_type: number
}
interface userMainInfoDataInfoVerity {
  type: number
  desc: string
  role: number
}
/**
 * 直播信息查询
 * 
 * @interface userLiveInfo
 */
interface userLiveInfo extends apiInfo {
  data: userLiveInfoData
}
interface userLiveInfoData {
  [index: number]: userLiveInfoDataItems
}
interface userLiveInfoDataItems {
  level: userLiveInfoDataLevel
}
interface userLiveInfoDataLevel {
  color: number
  cost: number
  master_level: userLiveInfoDataMasterLevel
  rcost: number
  svip: "0" | "1"
  svip_time: string
  uid: number
  update_time: string
  user_level: number
  user_score: number
  vip: "0" | "1"
  vip_time: string
}
interface userLiveInfoDataMasterLevel {
  level: number
  current: [number, number]
  next: [number, number]
  color: number
}
/**
 * 勋章信息查询
 * 
 * @interface userMedalInfo
 */
interface userMedalInfo extends apiInfo {
  data: userMedalInfoData
}
interface userMedalInfoData {
  [index: number]: userMedalInfoDataItems
}
interface userMedalInfoDataItems {
  medal: userMedalInfoDataMedals
}
interface userMedalInfoDataMedals {
  [index: number]: userMedalInfoDataLevel
}
interface userMedalInfoDataLevel {
  ctime: string // 获取时间
  id: string // 勋章ID
  intimacy: number
  is_receive: number
  last_wear_time: number
  level: number
  master_available: string
  master_id: number
  master_status: number
  medal_color: number
  medal_id: number
  medal_name: string
  mtime: string
  next_intimacy: number
  rank: string
  receive_channel: number
  receive_time: string
  reserve1: string
  reserve2: string
  roomid: number
  score: number
  source: number
  status: number
  target_face: string
  target_id: number
  target_name: string
  today_intimacy: string
  uid: number
}

export default new UserCheck()
