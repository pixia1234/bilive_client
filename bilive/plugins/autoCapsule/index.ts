import Plugin, { tools } from '../../plugin'
import { Options as requestOptions } from 'request'

class AutoCapsule extends Plugin {
  constructor() {
    super()
  }
  public name = '自动扭蛋鸡'
  public description = '进行自动扭蛋'
  public version = '0.0.1'
  public author = 'Vector000'
  public loaded = false
  public async load({ defaultOptions, whiteList }: { defaultOptions: options, whiteList: Set<string> }) {
    // 扭蛋
    defaultOptions.newUserData['autoCapsule'] = false
    defaultOptions.info['autoCapsule'] = {
      description: '自动扭蛋',
      tip: '是否启用自动扭蛋功能',
      type: 'boolean'
    }
    whiteList.add('autoCapsule')
    defaultOptions.newUserData['autoColorCapsule'] = false
    defaultOptions.info['autoColorCapsule'] = {
      description: '自动梦幻扭蛋',
      tip: '额外的梦幻扭蛋功能，只有在启动扭蛋功能时此功能才有效',
      type: 'boolean'
    }
    whiteList.add('autoColorCapsule')
    this.loaded = true
  }
  public async start({ users }: { users: Map<string, User> }) {
    users.forEach(user => this._autoCapsule(user))
  }
  public async loop({ cstMin, cstHour, users }: { cstMin: number, cstHour: number, users: Map<string, User> }) {
    // 每天23:30自动进行扭蛋机操作
    if (cstMin === 30 && cstHour % 12 === 11) users.forEach(user => this._autoCapsule(user))
  }
  /**
   * 自动扭蛋机
   * 
   * @private
   * @param {User} user
   */
  private async _autoCapsule(user: User) {
    if (<boolean>!user.userData['autoCapsule']) return
    const check: requestOptions = {
      uri: `https://api.live.bilibili.com/xlive/web-ucenter/v1/capsule/get_detail?from=h5&_=${Date.now()}`,
      jar: user.jar,
      json: true,
      headers: user.headers
    }
    const capsuleCheck = await tools.XHR<getCapsule>(check, 'Android')
    if (capsuleCheck === undefined || capsuleCheck.response.statusCode !== 200 || capsuleCheck.body.code !== 0) return
    const capsuleData = capsuleCheck.body.data
    await this._capsule(user, capsuleData.normal.coin)
    if (<boolean>user.userData['autoColorCapsule'] && capsuleData.colorful.status)
    await this._capsule(user, capsuleData.colorful.coin, 'colorful')
  }
  /**
   * 进行分类扭蛋
   * 
   * @param {User} user 
   * @param {number} coin
   * @param {'normal' | 'colorful'} type 
   */
  private async _capsule(user: User, coin: number, type: 'normal' | 'colorful' = 'normal') {
    const typeStr: string = type === 'normal' ? '普通' : '梦幻'
    if (coin === 0) return tools.Log(`${user.nickname} 无${typeStr}扭蛋`)
    let sentCoin = 0
    let result: { [index: string]: number } = {}
    while (coin > 0) {
      let combo = 1
      if (Math.floor(coin / 100) > 0) combo = 100
      else if (Math.floor(coin / 10) > 0) combo = 10
      let rollResult = await this._rollCapsule(user, combo)
      if (rollResult !== undefined) {
        coin = rollResult.info.normal.coin
        sentCoin += combo
        rollResult.awards.forEach(async item => {
          if (result[item.name] === undefined) result[item.name] = item.num
          else result[item.name] += item.num
        })
      }
      await tools.Sleep(500)
    }
    let tmpMSG: string = '，共获得'
    for (let key in result) tmpMSG += `${key} x ${result[key]} `
    if (tmpMSG === '，共获得') tmpMSG = '，什么都没有抽到'
    tools.Log(`${user.nickname} 已完成 ${sentCoin} 次${typeStr}扭蛋${tmpMSG}`)
  }
  /**
   * 扭蛋机操作
   * 
   * @private
   * @param {User} user
   * @param {number} combo
   */
  private async _rollCapsule(user: User, combo: number, type: 'normal' | 'colorful' = 'normal') {
    const roll: requestOptions = {
      method: 'POST',
      uri: `https://api.live.bilibili.com/xlive/web-ucenter/v1/capsule/open_capsule`,
      body: `_=${Date.now()}&type=${type}&count=${combo}&platform=h5&csrf=${tools.getCookie(user.jar, 'bili_jct')}&csrf_token=${tools.getCookie(user.jar, 'bili_jct')}&visit_id=`,
      json: true,
      jar: user.jar,
      headers: user.headers
    }
    const rollCapsule = await tools.XHR<rollCapsule>(roll, 'Android')
    if (rollCapsule === undefined || rollCapsule.response.statusCode !== 200 || rollCapsule.body.code !== 0) return
    return rollCapsule.body.data
  }
}

interface getCapsule {
  code: number
  msg: string
  ttl: number
  data: getCapsuleData
}
interface getCapsuleData {
  normal: getCapsuleDataType
  colorful: getCapsuleDataType
}
interface getCapsuleDataType {
  status: boolean
  coin: number
  change: number
  progress: getCapsuleTypeProgressData
  rule: string
  gift: getCapsuleDataTypeGift[]
  list: any[]
}
interface getCapsuleTypeProgressData {
  now: number
  max: number
}
interface getCapsuleDataTypeGift {
  name: string
  image: string
  usage: getCapsuleTypeDataGiftUsage
  web_image: string
  mobile_image: string
}
interface getCapsuleTypeDataGiftUsage {
  text: string
  url: string
}
interface rollCapsule {
  code: number
  message: string
  ttl: number
  data: rollCapsuleData
}
interface rollCapsuleData {
  status: boolean
  text: string[]
  isEntity: boolean
  info: rollCapsuleDataInfo
  showTitle: string
  awards: rollCapsuleDataAwards[]
}
interface rollCapsuleDataInfo {
  normal: rollCapsuleDataInfoItem
  colorful: rollCapsuleDataInfoItem
}
interface rollCapsuleDataInfoItem {
  coin: number
  change: number
  progress: getCapsuleTypeProgressData
}
interface rollCapsuleDataAwards extends getCapsuleDataTypeGift {
  num: number
  text: string
}

export default new AutoCapsule()
