import Lottery from './raffle'
import Plugin, { tools } from '../../plugin'
import Options from '../../options'

class Raffle extends Plugin {
  constructor() {
    super()
  }
  public name = '抽奖插件'
  public description = '自动参与抽奖'
  public version = '0.0.4'
  public author = 'Vector000'
  public loaded = false
  // 是否开启抽奖
  private _raffle = true
  // 普通/风暴封禁列表
  private _raffleBanList: Map<string, boolean> = new Map()
  private _stormBanList: Map<string, boolean> = new Map()
  // 风暴限制列表
  private _stormEarn: any = {}
  // 上次raffle时间
  private _lastRaffleTime: number = Date.now()
  public async load({ defaultOptions, whiteList }: { defaultOptions: options, whiteList: Set<string> }) {
    // 抽奖暂停
    defaultOptions.config['rafflePause'] = []
    defaultOptions.info['rafflePause'] = {
      description: '抽奖暂停',
      tip: '在此时间段内不参与抽奖, 24时制, 以\",\"分隔, 只有一个时间时不启用',
      type: 'numberArray'
    }
    whiteList.add('rafflePause')
    // 节奏发包次数
    defaultOptions.advConfig['stormSetting'] = [1000, 5]
    defaultOptions.info['stormSetting'] = {
      description: '节奏设置',
      tip: '节奏风暴的相关设置，以\",\"分隔，第一个参数为发包间隔(ms)，第二个参数为发包次数',
      type: 'numberArray'
    }
    whiteList.add('stormSetting')
    // 节奏并发用户数现在
    defaultOptions.advConfig['stormUserLimit'] = 3
    defaultOptions.info['stormUserLimit'] = {
      description: '节奏用户限制',
      tip: '同一时间允许参与节奏风暴抽奖的用户数量限制',
      type: 'number'
    }
    whiteList.add('stormUserLimit')
    // 非beatStorm类抽奖的全局延迟
    defaultOptions.advConfig['raffleDelay'] = 3000
    defaultOptions.info['raffleDelay'] = {
      description: 'raffle延迟',
      tip: '非节奏风暴抽奖的全局延迟，单位为毫秒(ms)，默认为3000',
      type: 'number'
    }
    whiteList.add('raffleDelay')
     // beatStorm类抽奖的全局延迟
    defaultOptions.advConfig['beatStormDelay'] = 20
    defaultOptions.info['beatStormDelay'] = {
      description: 'beatStorm延迟',
      tip: '节奏风暴抽奖的全局延迟，单位为毫秒(ms)，默认为20',
      type: 'number'
    }
    whiteList.add('beatStormDelay')
    // smallTV/raffle/lottery丢弃概率
    defaultOptions.advConfig['raffleDrop'] = 0
    defaultOptions.info['raffleDrop'] = {
      description: '抽奖丢弃',
      tip: '非节奏风暴抽奖的丢弃概率，0-100(百分比)',
      type: 'number'
    }
    whiteList.add('raffleDrop')
    // beatStorm丢弃概率
    defaultOptions.advConfig['beatStormDrop'] = 0
    defaultOptions.info['beatStormDrop'] = {
      description: '风暴丢弃',
      tip: '节奏风暴抽奖的丢弃概率，0-100(百分比)',
      type: 'number'
    }
    whiteList.add('beatStormDrop')
    // 小电视抽奖
    defaultOptions.newUserData['smallTV'] = false
    defaultOptions.info['smallTV'] = {
      description: '小电视抽奖',
      tip: '自动参与小电视抽奖',
      type: 'boolean'
    }
    whiteList.add('smallTV')
    // raffle类抽奖
    defaultOptions.newUserData['raffle'] = false
    defaultOptions.info['raffle'] = {
      description: '活动抽奖',
      tip: '自动参与活动抽奖',
      type: 'boolean'
    }
    whiteList.add('raffle')
    // lottery类抽奖
    defaultOptions.newUserData['lottery'] = false
    defaultOptions.info['lottery'] = {
      description: '舰队抽奖',
      tip: '自动参与lottery类抽奖',
      type: 'boolean'
    }
    whiteList.add('lottery')
    // 节奏风暴
    defaultOptions.newUserData['beatStorm'] = false
    defaultOptions.info['beatStorm'] = {
      description: '节奏风暴',
      tip: '自动参与节奏风暴',
      type: 'boolean'
    }
    whiteList.add('beatStorm')
    // beatStorm限制
    defaultOptions.newUserData['beatStormLimit'] = 50
    defaultOptions.info['beatStormLimit'] = {
      description: '风暴限制',
      tip: '每日领取节奏风暴类抽奖奖励的限制',
      type: 'number'
    }
    whiteList.add('beatStormLimit')
    // beatStorm优先级
    defaultOptions.newUserData['beatStormPriority'] = 0
    defaultOptions.info['beatStormPriority'] = {
      description: '风暴优先级',
      tip: '各用户领取风暴的优先级，优先级较低的用户会受并发控制而不参与抽奖',
      type: 'number'
    }
    whiteList.add('beatStormPriority')
    // beatStorm领取量
    defaultOptions.newUserData['beatStormTaken'] = 0
    whiteList.add('beatStormTaken')
    // beatStorm刷新时间
    defaultOptions.advConfig['beatStormRefresh'] = Date.now()
    whiteList.add('beatStormRefresh')
    this.loaded = true
  }
  /**
   * 领取数量清零
   * 
   * @param users 
   * @private
   */
  private async _refreshCount(users: Map<string, User>) {
    users.forEach(user => this._stormEarn[user.uid] = 0)
  }
  /**
   * 加载领取数量
   * 
   * @param options 
   * @param users 
   * @private
   */
  private async _loadCount(options: options, users: Map<string, User>) {
    const cst = new Date(Date.now() + 8 * 60 * 60 * 1000)
    const cstHour = cst.getUTCHours()
    const cstMin = cst.getUTCMinutes()
    const cstSec = cst.getUTCSeconds()
    const todaySecondsPassed = cstHour * 3600 + cstMin * 60 + cstSec
    if (Date.now() - <number>options.advConfig['beatStormRefresh'] < todaySecondsPassed * 1000)
      users.forEach(async (user, uid) => this._stormEarn[uid] = user.userData['beatStormTaken'])
  }
  /**
   * 计算优先级，确定用户是否允许抽奖
   * 
   * @param users 
   * @private
   * @returns {number}
   */
  private async _getPriorityLimit(options: options, users: Map<string, User>) {
    let userPriority: Array<number> = new Array()
    users.forEach(async (user, uid) => {
      if (this._raffleBanList.get(uid) || this._stormBanList.get(uid)) return
      if (!user.userData['beatStorm']) return
      if (this._stormEarn[uid] !== undefined && this._stormEarn[uid] >= <number>user.userData['beatStormLimit']) return
      userPriority.push(<number>user.userData['beatStormPriority'])
    })
    let priorityAsc = userPriority.sort(function(a, b){return a - b})
    let order = priorityAsc.length - <number>options.advConfig['stormUserLimit']
    if (order < 0) order = 0
    let priority = priorityAsc[order]
    return priority
  }
  public async start({ options, users }: { options: options, users: Map<string, User> }) {
    this._refreshCount(users)
    this._loadCount(options, users)
  }
  public async loop({ cstMin, cstHour, cstString, options, users }: { cstMin: number, cstHour: number, cstString: string, options: options, users: Map<string, User> }) {
    // 抽奖暂停
    const rafflePause = <number[]>options.config['rafflePause']
    if (rafflePause.length > 1) {
      const start = rafflePause[0]
      const end = rafflePause[1]
      if (start > end && (cstHour >= start || cstHour < end) || (cstHour >= start && cstHour < end)) this._raffle = false
      else this._raffle = true
    }
    else this._raffle = true
    if (cstMin === 0 && cstHour % 12 === 0) {
      this._raffleBanList.clear()
      this._stormBanList.clear()
    }
    if (cstString === '00:00') this._refreshCount(users)
    // 当天数据写入JSON
    users.forEach(async (user, uid) => user.userData['beatStormTaken'] = this._stormEarn[uid])
    options.advConfig['beatStormRefresh'] = Date.now()
    Options.save()
  }
  public async msg({ message, options, users }: { message: raffleMessage | lotteryMessage | beatStormMessage, options: options, users: Map<string, User> }) {
    if (this._raffle) {
      if (message.cmd === 'beatStorm') this._doStorm({message, options, users})
      else {
        if (Date.now() - this._lastRaffleTime < 400) await tools.Sleep(400)
        this._lastRaffleTime = Date.now()
        this._doRaffle({message, options, users})
      }
    }
  }
  /**
   * 进行raffle类抽奖
   * 
   * @param {message, options, users}
   * @private
   */
  private async _doRaffle({ message, options, users }: { message: raffleMessage | lotteryMessage, options: options, users: Map<string, User> }) {
    const delay = <number>options.advConfig['raffleDelay']
    if (delay !== 0) await tools.Sleep(delay)
    for (let [uid, user] of users) {
      if (user.captchaJPEG !== '' || !user.userData[message.cmd]) continue
      if (this._raffleBanList.get(uid)) continue
      const droprate = <number>options.advConfig['raffleDrop']
      if (droprate !== 0 && Math.random() < droprate / 100) {
        tools.Log(user.nickname, '丢弃抽奖', message.id)
        continue
      }
      else {
        const lottery = new Lottery(message, user)
        lottery
          .on('msg', (msg: pluginNotify) => {
            if (msg.cmd === 'ban') this._raffleBanList.set(msg.data.uid, true)
            this.emit('msg', msg)
          })
          .Start()
      }
      await tools.Sleep(100)
    }
  }
  /**
   * 进行beatStorm类抽奖
   * 
   * @param {message, options, users}
   * @private
   */
  private async _doStorm({ message, options, users }: { message: beatStormMessage, options: options, users: Map<string, User> }) {
    const stormPriorityTheshold = await this._getPriorityLimit(options, users)
    users.forEach(async (user, uid) => {
      if (user.captchaJPEG !== '' || !user.userData['beatStorm']) return
      if (this._raffleBanList.get(uid) || this._stormBanList.get(uid)) return
      if (this._stormEarn[uid] !== undefined && this._stormEarn[uid] >= <number>user.userData['beatStormLimit']) return
      if (<number>user.userData['beatStormPriority'] < stormPriorityTheshold) return
      const droprate = <number>options.advConfig['beatStormDrop']
      if (droprate !== 0 && Math.random() < droprate / 100) tools.Log(user.nickname, '丢弃抽奖', message.id)
      else {
        const delay = <number>options.advConfig['beatStormDelay']
        if (delay !== 0) await tools.Sleep(delay)
        const lottery = new Lottery(message, user)
        lottery
          .on('msg', (msg: pluginNotify) => {
            if (msg.cmd === 'ban') this._stormBanList.set(msg.data.uid, true)
            if (msg.cmd === 'earn') this._stormEarn[uid]++
            this.emit('msg', msg)
          })
          .Start()
      }
    })
  }
}

export default new Raffle()
