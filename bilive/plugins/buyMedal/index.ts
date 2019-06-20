import { Options as requestOptions } from 'request'
import Plugin from '../../plugin'
import tools from '../../lib/tools'

class BuyMedal extends Plugin {
  constructor() {
    super()
  }
  public name = '购买勋章'
  public description = '给定房间号，用银瓜子/硬币购买直播间勋章'
  public version = '0.0.1'
  public author = 'Vector000'
  public async load({ defaultOptions }: { defaultOptions: options }) {
    defaultOptions.util['buyMedal'] = {
      info: {
        value: "购买勋章",
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
          tip: "从中选择已有用户，购买直播间勋章",
          type: "user"
        }
      },
      coin: {
        value: false,
        info: {
          description: "使用硬币购买",
          tip: "勾上则为使用20硬币购买，取消打勾则为使用9900银瓜子购买",
          type: "boolean"
        }
      },
      roomid: {
        value: 0,
        info: {
          description: "房间号",
          tip: "想要购买勋章的主播房间号",
          type: "number"
        }
      }
    }
    this.loaded = true
  }
  // utilMSG缓存
  private msg?: utilMSG
  public async start({ options, users }: { options: options, users: Map<string, User> }) {
    await this.loadUserList(options, users)
  }
  public async interact({ msg, users }: { msg: utilMSG, users: Map<string, User> }) {
    this.msg = msg
    await this.doBuyMedal(msg, users)
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
   * @private
   */
  private async loadUserList(options: options, users: Map<string, User>) {
    users.forEach(async user => {
      if (user.userData.status) {
        const userNickname = user.userData.nickname
        const userBiliUID = user.userData.biliUID
        const userListItem: string = `${userNickname}(${userBiliUID})`;
        (<string[]>options.util['buyMedal']['users'].list).push(userListItem)
      }
    })
  }
  /**
   * 购买勋章
   * 
   * @param {utilMSG} msg
   * @param {Map<string, User>} users
   * @private
   */
  private async doBuyMedal(msg: utilMSG, users: Map<string, User>) {
    const data = msg.data
    let uid: number = 0
    if (data['users'].value === '') uid = <number>data.uid.value
    else {
      const userStr = <string>data['users'].value
      let arr = userStr.match(/(?<=\().*(?=\))/g)
      if (arr !== null) uid = Number(arr[arr.length-1])
    }
    users.forEach(async user => {
      if (user.userData.biliUID === uid) {
        const type = <boolean>data['coin'].value ? 'metal' : 'silver'
        const roomID = <number>data['roomid'].value
        await this.buyMedal(user, type, roomID)
      }
    })
  }
  /**
   * 查询主播UID
   * 
   * @param {utilMSG} msg
   * @param roomID
   * @private
   */
  private async getUPID(roomID: number) {
    const masterID: requestOptions = {
      uri: `https://api.live.bilibili.com/live_user/v1/UserInfo/get_anchor_in_room?roomid=${roomID}`,
      json: true
    }
    const getMasterID = await tools.XHR<getMasterID>(masterID)
    if (getMasterID === undefined || getMasterID.response.statusCode !== 200 || getMasterID.body.code !== 0)
      return 0
    else return getMasterID.body.data.info.uid
  }
  /**
   * 进行购买操作
   * 
   * @param {User} user
   * @param {'metal' | 'silver'} type
   * @param {number} roomID
   */
  private async buyMedal(user: User, type: 'metal' | 'silver', roomID: number) {
    let masterUID: number = await this.getUPID(roomID)
    if (masterUID === 0) this.utilCallback('获取主播UID失败')
    const buy: requestOptions = {
      uri: `https://api.vc.bilibili.com/link_group/v1/member/buy_medal?coin_type=${type}&master_uid=${masterUID}&platform=android`,
      json: true,
      jar: user.jar,
      headers: user.headers
    }
    const buyMedal = await tools.XHR<buyMedal>(buy, 'Android')
    if (buyMedal === undefined || buyMedal.response.statusCode !== 200) this.utilCallback('兑换勋章失败')
    else this.utilCallback(buyMedal.body.msg)
  }
}
interface getMasterID {
  code: number
  data: getMasterIDData
  msg: string
  message: string
}
interface getMasterIDData {
  info: getMasterIDDataInfo
}
interface getMasterIDDataInfo {
  uid: number
}
interface buyMedal {
  code: number
  msg: string
  message: string
}

export default new BuyMedal()