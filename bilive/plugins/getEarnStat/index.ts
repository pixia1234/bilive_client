import { Options as requestOptions } from 'request'
import Plugin, { tools, AppClient } from '../../plugin'
import Options from '../../options'

class GetEarnStat extends Plugin {
  constructor() {
    super()
  }
  public name = '收益统计'
  public description = '获取从开始使用此软件至今的收益（经验、礼物等）'
  public version = '0.0.1'
  public author = 'Vector000'
  public async load({ defaultOptions, whiteList }: { defaultOptions: options, whiteList: Set<string> }) {
    defaultOptions.config['getEarnStatTime'] = ''
    defaultOptions.info['getEarnStatTime'] = {
      description: '汇报收益时间',
      tip: '在这个时间点会统计服务器上所有用户的收益情况, 滚键盘则关闭, 格式: HH:mm',
      type: 'string'
    }
    whiteList.add('getEarnStatTime')
    this.loaded = true
  }
  public async loop({ cstMin, cstString, options, users }: { cstMin: number, cstString: string, options: options, users: Map<string, User> }) {
    if (cstMin % 30 === 0) users.forEach(user => this._getVip(user)) // 每30m刷新一次老爷相关数据，尽量在减少网络占用的同时减少计算误差
    if (cstString === options.config.getEarnStatTime) this._sendEarnStat(users)
  }
  /**
   * 临时加的新方法，后续可能会变
   *
   * @private
   * @memberof GetEarnStat
   */
  public async noti({ cmd, msg, users }: { cmd: string, msg: string, users: Map<string, User> }) {
    if (cmd === 'heartBeat') {
      let user = users.get(msg)
      if (user !== undefined) await this._getExp(user)
    }
  }
  /**
   * vip状态
   *
   * @private
   * @type {Map<string, number>}
   * @memberof GetEarnStat
   */
  private vipStatus: Map<string, number> = new Map()
  /**
   * 查询vip状态
   *
   * @private
   * @type {Map<string, number>}
   * @memberof GetEarnStat
   */
  private async _getVip(user: User) {
    const userInfo: requestOptions = {
      uri: `https://api.live.bilibili.com/User/getUserInfo?ts=${AppClient.TS}`,
      json: true,
      jar: user.jar,
      headers: user.headers
    }
    const getVip = await tools.XHR<userInfo>(userInfo)
    if (getVip === undefined || getVip.response.statusCode !== 200)
      if (this.vipStatus.get(user.uid) === undefined) this.vipStatus.set(user.uid, 0)
      else return
    else if (getVip.body.code === 'REPONSE_OK') {
      if (getVip.body.data.svip === 1) this.vipStatus.set(user.uid, 2)
      else if (getVip.body.data.vip === 1 && getVip.body.data.svip === 0) this.vipStatus.set(user.uid, 1)
      else this.vipStatus.set(user.uid, 0)
    }
  }
  /**
   * 计算经验加成
   *
   * @private
   * @memberof GetEarnStat
   */
  private async _getExp(user: User) {
    if (this.vipStatus.get(user.uid) === undefined) await this._getVip(user)
    if (Date.now() - user.userData.lastHeartTime < 5 * 60 * 1000) return
    if (this.vipStatus.get(user.uid) === 1) user.userData.exp_taken += 6000
    if (this.vipStatus.get(user.uid) === 2) user.userData.exp_taken += 7500
    user.userData.lastHeartTime = Date.now()
    Options.save()
  }
  /**
   * 发送收益情况
   *
   * @private
   * @memberof GetEarnStat
   */
   private _sendEarnStat(users: Map<string, User>) {
     let tmp: string = '# 客户端挂机收益情况\n'
     users.forEach(user => {
       let line0 = `## 用户 *****${user.nickname}***** 收益情况：\n`
       let line1 = `- 获取经验： ${user.userData.exp_taken}\n`
       let line2 = `- 获取瓜子： ${user.userData.gift_taken}\n`
       let line3 = `- 获取亲密： ${user.userData.int_taken}\n`
       tmp += (line0 + line1 + line2 + line3)
     })
     tools.sendSCMSG(tmp)
   }
}

/**
 * 个人信息
 *
 * @interface userInfo
 */
interface userInfo {
  code: string
  data: userInfoData
}
interface userInfoData {
  vip: number
  svip: number
}

export default new GetEarnStat()
