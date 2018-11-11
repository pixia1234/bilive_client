import tools from './lib/tools'
import User from './daily'
import Raffle from './raffle'
import WebAPI from './webapi'
import Listener from './listener'
import Options from './options'
/**
 * 主程序
 *
 * @class BiLive
 */
class BiLive {
  constructor() {}
  // 系统消息监听
  private _Listener!: Listener
  // 是否开启抽奖
  private _raffle = false
  // 全局计时器
  private _lastTime = ''
  public loop!: NodeJS.Timer
  /**
   * 开始主程序
   *
   * @memberof BiLive
   */
  public async Start() {
    await tools.testIP(Options._.apiIPs)
    for (const uid in Options._.user) {
      if (!Options._.user[uid].status) continue
      const user = new User(uid, Options._.user[uid])
      const status = await user.Start()
      if (status !== undefined) user.Stop()
    }
    Options.user.forEach(user => user.getUserInfo()) // 开始挂机时，获取用户信息
    Options.user.forEach(user => user.daily())
    this.loop = setInterval(() => this._loop(), 55 * 1000)
    new WebAPI().Start()
    this.Listener()
  }
  /**
   * 计时器
   *
   * @private
   * @memberof BiLive
   */
  private _loop() {
    const csttime = Date.now() + 8 * 60 * 60 * 1000
    const cst = new Date(csttime)
    const cstString = cst.toUTCString().substr(17, 5) // 'HH:mm'
    if (cstString === this._lastTime) return
    this._lastTime = cstString
    const cstHour = cst.getUTCHours()
    const cstMin = cst.getUTCMinutes()
    if (cstString === '00:10') Options.user.forEach(user => user.nextDay()) // 每天00:10重置任务状态
    if (cstString === '13:58') Options.user.forEach(user => user.sendGift()) // 每天13:58再次自动送礼, 因为一般活动14:00结束
    if (cstMin === 30 && cstHour % 8 === 4) Options.user.forEach(user => user.daily()) // 每天04:30, 12:30, 20:30做日常
    if ((cstHour + 1) % 8 === 0 && cstMin === 30) Options.user.forEach(user => user.autoSend()) // 每天7:30, 15:30, 23:30做自动送礼V2
    if (cstMin === 0) Options.user.forEach(user => user.getUserInfo()) //整点获取用户信息
    const rafflePause = Options._.config.rafflePause // 抽奖暂停
    if (rafflePause.length > 1) {
      const start = rafflePause[0]
      const end = rafflePause[1]
      if (start > end && (cstHour >= start || cstHour < end) || (cstHour >= start && cstHour < end)) this._raffle = false
      else this._raffle = true
    }
    else this._raffle = true
    if (Options._.config.listenMethod !== 1) {
      // 更新监听房间
      this._Listener.updateAreaRoom()
    }
    // 清空ID缓存
    this._Listener.clearAllID()
  }
  /**
   * 监听
   *
   * @memberof BiLive
   */
  public Listener() {
    this._Listener = new Listener()
    this._Listener
      .on('smallTV', (raffleMessage: raffleMessage) => this._Raffle(raffleMessage))
      .on('raffle', (raffleMessage: raffleMessage) => this._Raffle(raffleMessage))
      .on('lottery', (lotteryMessage: lotteryMessage) => this._Raffle(lotteryMessage))
      .on('beatStorm', (beatStormMessage: beatStormMessage) => this._Raffle(beatStormMessage))
      .Start()
  }
  /**
   * 参与抽奖
   *
   * @private
   * @param {raffleMessage | lotteryMessage | beatStormMessage} raffleMessage
   * @memberof BiLive
   */
  private async _Raffle(raffleMessage: raffleMessage | lotteryMessage | beatStormMessage) {
    Options.user.forEach(user => {
      if (!this._raffle && user.userData.raffleLimit) return // 此段时间内不抽奖
      if (user.captchaJPEG !== '' || !user.userData.raffle || user.userData.ban) return // 验证码、手动关闭、被封禁时不抽奖
      if (Math.random() < Options._.config.droprate / 100 && user.userData.raffleLimit) return tools.Log(user.nickname, "随机丢弃", raffleMessage.id) // 随机丢弃
      return new Raffle(raffleMessage, user).Start()
    })
  }
}
export default BiLive
