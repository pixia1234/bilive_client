import tools from './lib/tools'
import AppClient from './lib/app_client'
import Options, { liveOrigin, apiLiveOrigin, smallTVPathname, rafflePathname, lotteryPathname, beatStormPathname } from './options'
/**
 * 自动参与抽奖
 *
 * @class Raffle
 */
class Raffle {
  /**
   * 创建一个 Raffle 实例
   * @param {raffleMessage | lotteryMessage | beatStormMessage} raffleMessage
   * @memberof Raffle
   */
  constructor(raffleMessage: raffleMessage | lotteryMessage | beatStormMessage, user: User) {
    this._raffleMessage = raffleMessage
    this._user = user
  }
  /**
   * 抽奖设置
   *
   * @private
   * @type {raffleMessage | lotteryMessage}
   * @memberof Raffle
   */
  private _raffleMessage: raffleMessage | lotteryMessage | beatStormMessage
  /**
   * 抽奖用户
   *
   * @private
   * @type {User}
   * @memberof Raffle
   */
  private _user: User
  /**
   * 抽奖地址
   *
   * @private
   * @type {string}
   * @memberof Raffle
   */
  private _url!: string
  /**
   * 开始抽奖
   *
   * @memberof Raffle
   */
  public async Start() {
    const { roomID } = this._raffleMessage
    if (this._raffleMessage.cmd !== 'beatStorm') {
      await tools.XHR({
        method: 'POST',
        uri: `${apiLiveOrigin}/room/v1/Room/room_entry_action`,
        body:  `room_id=${roomID}&platform=pc&csrf_token=${tools.getCookie(this._user.jar, 'bili_jct')}`,
        jar: this._user.jar,
        json: true,
        headers: { 'Referer': `${liveOrigin}/${tools.getShortRoomID(roomID)}` }
      })
      await tools.Sleep(Options._.config.raffleDelay)
    }
    switch (this._raffleMessage.cmd) {
      case 'smallTV':
        this._url = apiLiveOrigin + smallTVPathname
        this._Raffle()
        break
      case 'raffle':
        this._url = apiLiveOrigin + rafflePathname
        this._Raffle()
        break
      case 'lottery':
        this._url = apiLiveOrigin + lotteryPathname
        this._Lottery()
        break
      case 'beatStorm':
        this._url = apiLiveOrigin + beatStormPathname
        this._BeatStorm()
        break
      default: break
    }
  }
  /**
   * 抽奖Raffle
   *
   * @private
   * @memberof Raffle
   */
  private async _Raffle() {
    if (!this._user.userData.appRaffle) {
      const { id, roomID, time, title } = this._raffleMessage
      const raffleJoin = await tools.XHR<raffleJoin>({
        uri: `${apiLiveOrigin}/gift/v3/smalltv/join?roomid=${roomID}&raffleId=${id}`,
        jar: this._user.jar,
        json: true,
        headers: { 'Referer': `${liveOrigin}/${tools.getShortRoomID(roomID)}` }
      })
      if (raffleJoin === undefined || raffleJoin.response.statusCode !== 200) return
      if (raffleJoin.body.code === 0) {
        if (this._user.userData.ban === true) {
          tools.sendSCMSG(`${this._user.nickname} 已解除封禁`)
          this._user.userData.ban = false
          this._user.userData.banTime = 0
        }
        await tools.Sleep(time * 1000 + 15 * 1000)
        this._RaffleReward()
      }
      else tools.Log(this._user.nickname, title, id, raffleJoin.body)
      if (raffleJoin.body.code === 400 && raffleJoin.body.msg === '访问被拒绝') {
        if (this._user.userData.ban === false) {
          tools.sendSCMSG(`${this._user.nickname} 已被封禁`)
          this._user.userData.ban = true
        }
        this._user.userData.banTime = new Date().getTime()
      }
      Options.save()
    }
    else this._RaffleAward()
  }
  /**
   * 获取抽奖结果
   *
   * @private
   * @memberof Raffle
   */
  private async _RaffleAward() {
    const { id, roomID, title, type } = this._raffleMessage
    const raffleAward = await tools.XHR<raffleAward>({
      method: 'POST',
      uri: `${this._url}/getAward`,
      body: AppClient.signQueryBase(`${this._user.tokenQuery}&raffleId=${id}&roomid=${roomID}&type=${type}`),
      jar: this._user.jar,
      json: true,
      headers: this._user.headers
    }, 'Android')
    if (raffleAward === undefined || raffleAward.response.statusCode !== 200) return
    if (raffleAward.body.code === -401) {
      await tools.Sleep(30 * 1000)
      this._RaffleAward()
    }
    else if (raffleAward.body.code === 0) {
      if (this._user.userData.ban === true) {
        tools.sendSCMSG(`${this._user.nickname} 已解除封禁`)
        this._user.userData.ban = false
        this._user.userData.banTime = 0
      }
      const gift = raffleAward.body.data
      if (gift.gift_num === 0) tools.Log(this._user.nickname, `抽奖 ${id}`, raffleAward.body.msg)
      else {
        const msg = `${this._user.nickname} ${title} ${id} 获得 ${gift.gift_num} 个${gift.gift_name}`
        tools.Log(msg)
        if (gift.gift_name.includes('小电视')) tools.sendSCMSG(msg)
      }
    }
    else tools.Log(this._user.nickname, title, id, raffleAward.body)
    if (raffleAward.body.code === 400 && raffleAward.body.msg === '访问被拒绝') {
      if (this._user.userData.ban === false) {
        tools.sendSCMSG(`${this._user.nickname} 已被封禁`)
        this._user.userData.ban = true
      }
      this._user.userData.banTime = new Date().getTime()
    }
    Options.save()
  }
  /**
   * 获取抽奖结果(v3 only)
   *
   * @private
   * @memberof Raffle
   */
  private async _RaffleReward() {
    const { id, roomID, title } = this._raffleMessage
    const raffleReward = await tools.XHR<raffleReward>({
      uri: `${apiLiveOrigin}/gift/v3/smalltv/notice?roomid=${roomID}&raffleId=${id}`,
      jar: this._user.jar,
      json: true,
      headers: { 'Referer': `${liveOrigin}/${tools.getShortRoomID(roomID)}` }
    })
    if (raffleReward === undefined || raffleReward.response.statusCode !== 200) return
    if (raffleReward.body.code === -400 || raffleReward.body.data.status === 3) {
      await tools.Sleep(30 * 1000)
      this._RaffleReward()
    }
    else {
      const gift = raffleReward.body.data
      if (gift.gift_num === 0) tools.Log(this._user.nickname, `抽奖 ${id}`, raffleReward.body.msg)
      else {
        const msg = `${this._user.nickname} ${title} ${id} 获得 ${gift.gift_num} 个${gift.gift_name}`
        tools.Log(msg)
        if (gift.gift_name.includes('小电视')) tools.sendSCMSG(msg)
      }
    }
  }
  /**
   * 抽奖Lottery
   *
   * @memberof Raffle
   */
  private async _Lottery() {
    const { id, roomID, title, type } = this._raffleMessage
    await tools.Sleep(60 * 1000)
    const lotteryReward = await tools.XHR<lotteryReward>({
      method: 'POST',
      uri: `${this._url}/join`,
      body: AppClient.signQueryBase(`${this._user.tokenQuery}&id=${id}&roomid=${roomID}&type=${type}`),
      jar: this._user.jar,
      json: true,
      headers: this._user.headers
    }, 'Android')
    if (lotteryReward !== undefined && lotteryReward.response.statusCode === 200) {
      if (lotteryReward.body.code === 0) tools.Log(this._user.nickname, title, id, lotteryReward.body.data.message)
      else tools.Log(this._user.nickname, title, id, lotteryReward.body)
    }
  }
  /**
   * 抽奖BeatStorm
   *
   * @memberof Raffle
   */
  private async _BeatStorm() {
    if (!this._user.userData.beatStorm) return
    const { id, roomID, title } = this._raffleMessage
    const joinStorm = await tools.XHR<joinStorm>({
      method: 'POST',
      uri: `${this._url}/join`,
      body: `id=${id}&color=16777215&captcha_token=&captcha_phrase=&roomid=${roomID}&csrf_token=${tools.getCookie(this._user.jar, 'bili_jct')}`,
      jar: this._user.jar,
      json: true,
      headers: this._user.headers
    })
    if (joinStorm !== undefined && joinStorm.response.statusCode === 200) {
      if (joinStorm.body.code === 0) {
        let content = joinStorm.body.data
        tools.Log(this._user.nickname, title, id, `${content.mobile_content} 获得 ${content.gift_num} 个${content.gift_name}`)
      }
      else tools.Log(this._user.nickname, title, id, joinStorm.body.msg)
    }
  }
}
export default Raffle
