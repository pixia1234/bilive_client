import { Options as requestOptions } from 'request'
import Plugin, { tools, AppClient } from '../../plugin'

class AutoSend extends Plugin {
  constructor() {
    super()
  }
  public name = '自动送礼V2'
  public description = '自动向佩戴勋章的直播间送出礼物'
  public version = '0.0.1'
  public author = 'Vector000'
  public async load({ defaultOptions, whiteList }: { defaultOptions: options, whiteList: Set<string> }) {
    // 自动送礼
    defaultOptions.newUserData['autoSend'] = false
    defaultOptions.info['autoSend'] = {
      description: '自动送礼V2',
      tip: '自动向佩戴勋章的直播间送出礼物',
      type: 'boolean'
    }
    whiteList.add('autoSend')
    this.loaded = true
  }
  public async start({ users }: { users: Map<string, User> }) {
    this._autoSend(users)
  }
  public async loop({ cstMin, cstHour, users }: { cstMin: number, cstHour: number, users: Map<string, User> }) {
    // 每天11:30, 23:30自动送礼
    if (cstMin === 30 && cstHour % 12 === 11) this._autoSend(users)
  }
  /**
   * 自动送礼V2
   *
   * @private
   * @memberof AutoSend
   */
  private _autoSend(users: Map<string, User>) {
    users.forEach(async user => {
      if (!user.userData['autoSend']) return
      // 获取佩戴勋章信息
      const uid = user.userData.biliUID
      const medal: requestOptions = {
        method: `POST`,
        uri: `https://api.live.bilibili.com/live_user/v1/UserInfo/get_weared_medal`,
        body: `source=1&uid=${uid}&target_id=11153765&csrf_token=${tools.getCookie(user.jar, 'bili_jct')}`, // 使用3号直播间查询
        json: true,
        jar: user.jar,
        headers: user.headers
      }
      const wearInfo = await tools.XHR<wearInfo>(medal)
      if (wearInfo === undefined || wearInfo.response.statusCode !== 200 || wearInfo.body.code !== 0) return
      if (wearInfo.body.data !== null) {
        const room_id = wearInfo.body.data.roominfo.room_id
        const mid = wearInfo.body.data.roominfo.uid
        const day_limit = wearInfo.body.data.day_limit
        const today_feed = parseInt(wearInfo.body.data.today_feed)
        let intimacy_needed = day_limit - today_feed
        if (intimacy_needed === 0) return tools.Log(user.nickname, `亲密度已达上限`)
        // 获取包裹信息
        const bag: requestOptions = {
          uri: `https://api.live.bilibili.com/gift/v2/gift/m_bag_list?${AppClient.signQueryBase(user.tokenQuery)}`,
          json: true,
          headers: user.headers
        }
        const bagInfo = await tools.XHR<bagInfo>(bag, 'Android')
        if (bagInfo === undefined || bagInfo.response.statusCode !== 200) return
        if (bagInfo.body.code === 0) {
          if (bagInfo.body.data.length > 0) {
            for (const giftData of bagInfo.body.data) {
              if (giftData.expireat > 0) {
                let gift_value = 0, bag_value = 0, send_num = 0
                switch (giftData.gift_id) { // Gift_Config from http://api.live.bilibili.com/gift/v3/live/gift_config
                  case 1: gift_value = 1 //辣条
                    break
                  case 3: gift_value = 99 //B坷垃
                    break
                  case 4: gift_value = 52 //喵娘
                    break
                  case 6: gift_value = 10 //亿圆
                    break
                  case 9: gift_value = 4500 //爱心便当
                    break
                  case 10: gift_value = 19900 //蓝白胖次
                    break
                  case 30054: gift_value = 5000 //粉丝卡，什么玩意儿
                    break
                  default: continue
                }
                bag_value = gift_value * giftData.gift_num
                if (intimacy_needed >= bag_value) send_num = giftData.gift_num
                else send_num = Math.floor(intimacy_needed / gift_value)
                if (send_num > 0) {
                  const send: requestOptions = {
                    method: 'POST',
                    uri: `https://api.live.bilibili.com/gift/v2/live/bag_send?${AppClient.signQueryBase(user.tokenQuery)}`,
                    body: `uid=${giftData.uid}&ruid=${mid}&gift_id=${giftData.gift_id}&gift_num=${send_num}&bag_id=${giftData.id}&biz_id=${room_id}&rnd=${AppClient.RND}&biz_code=live&jumpFrom=21002`,
                    json: true,
                    headers: user.headers
                  }
                  const sendBag = await tools.XHR<sendBag>(send, 'Android')
                  if (sendBag === undefined || sendBag.response.statusCode !== 200) continue
                  if (sendBag.body.code === 0) {
                    const sendBagData = sendBag.body.data
                    tools.Log(user.nickname, '自动送礼V2', `向房间 ${room_id} 赠送 ${send_num} 个${sendBagData.gift_name}`)
                    intimacy_needed = intimacy_needed - send_num * gift_value
                    if (intimacy_needed === 0) return tools.Log(user.nickname, `亲密度已达上限`)
                  }
                  else tools.Log(user.nickname, '自动送礼V2', `向房间 ${room_id} 赠送 ${send_num} 个${giftData.gift_name} 失败`, sendBag.body)
                  await tools.Sleep(5000)
                }
              }
            }
            tools.Log(user.nickname, `已完成送礼`)
          }
          else tools.Log(user.nickname, `包裹空空的`)
        }
        else tools.Log(user.nickname, `获取包裹信息失败`)
      }
      else tools.Log(user.nickname, `获取佩戴勋章信息失败`)
    })
  }
}
/**
 * 佩戴勋章信息
 *
 * @interface wearInfo
 */
interface wearInfo {
  code: number
  msg: string
  message: string
  data: wearData
}
interface wearData {
  id: number
  uid: number
  target_id: number
  medal_id: number
  score: number
  level: number
  medal_name: string
  intimacy: number
  next_intimacy: number
  day_limit: number
  roominfo: wearRoomInfo
  today_feed: string
}
interface wearRoomInfo {
  room_id: number
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
/**
 * 赠送包裹礼物
 *
 * @interface sendBag
 */
interface sendBag {
  code: number
  msg: string
  message: string
  data: sendBagData
}
interface sendBagData {
  tid: string
  uid: number
  uname: string
  ruid: number
  rcost: number
  gift_id: number
  gift_type: number
  gift_name: string
  gift_num: number
  gift_action: string
  gift_price: number
  coin_type: string
  total_coin: number
  metadata: string
  rnd: string
}
export default new AutoSend()
