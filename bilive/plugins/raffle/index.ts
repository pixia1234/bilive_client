import Lottery from './raffle'
import Plugin, { tools } from '../../plugin'

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
  private _raffle = false
  // 封禁列表
  private _raffleBanList: Map<string, boolean> = new Map()
  private _stormBanList: Map<string, boolean> = new Map()
  // 限制列表
  private _raffleStatus: any = {}
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
    // 非beatStorm类抽奖的全局延迟
    defaultOptions.advConfig['raffleDelay'] = 3000
    defaultOptions.info['raffleDelay'] = {
      description: 'raffle延迟',
      tip: '非节奏风暴抽奖的全局延迟，单位为毫秒(ms)，默认为3000',
      type: 'number'
    }
    whiteList.add('raffleDelay')
     // beatStorm类抽奖的全局延迟
    defaultOptions.advConfig['beatStormDelay'] = 50
    defaultOptions.info['beatStormDelay'] = {
      description: 'beatStorm延迟',
      tip: '节奏风暴抽奖的全局延迟，单位为毫秒(ms)，默认为50',
      type: 'number'
    }
    whiteList.add('beatStormDelay')
    // 小电视抽奖
    defaultOptions.newUserData['smallTV'] = false
    defaultOptions.info['smallTV'] = {
      description: '小电视抽奖',
      tip: '自动参与小电视抽奖',
      type: 'boolean'
    }
    whiteList.add('smallTV')
    // smallTV限制
    defaultOptions.newUserData['smallTVSetting'] = [200, 0]
    defaultOptions.info['smallTVSetting'] = {
      description: 'smallTV限制',
      tip: '每日领取smallTV类抽奖的设置，以\",\"分隔，分别表示每日上限、丢弃概率',
      type: 'numberArray'
    }
    whiteList.add('smallTVSetting')
    // raffle类抽奖
    defaultOptions.newUserData['raffle'] = false
    defaultOptions.info['raffle'] = {
      description: 'raffle类抽奖',
      tip: '自动参与raffle类抽奖',
      type: 'boolean'
    }
    whiteList.add('raffle')
    // raffle限制
    defaultOptions.newUserData['raffleSetting'] = [500, 0]
    defaultOptions.info['raffleSetting'] = {
      description: 'raffle限制',
      tip: '每日领取raffle类抽奖的设置，以\",\"分隔，分别表示每日上限、丢弃概率',
      type: 'numberArray'
    }
    whiteList.add('raffleSetting')
    // lottery类抽奖
    defaultOptions.newUserData['lottery'] = false
    defaultOptions.info['lottery'] = {
      description: 'lottery类抽奖',
      tip: '自动参与lottery类抽奖',
      type: 'boolean'
    }
    whiteList.add('lottery')
    // lottery限制
    defaultOptions.newUserData['lotterySetting'] = [1000, 0]
    defaultOptions.info['lotterySetting'] = {
      description: 'lottery限制',
      tip: '每日领取lottery类抽奖的设置，以\",\"分隔，分别表示每日上限、丢弃概率0',
      type: 'numberArray'
    }
    whiteList.add('lotterySetting')
    // 节奏风暴
    defaultOptions.newUserData['beatStorm'] = false
    defaultOptions.info['beatStorm'] = {
      description: '节奏风暴',
      tip: '自动参与节奏风暴',
      type: 'boolean'
    }
    whiteList.add('beatStorm')
    // beatStorm限制
    defaultOptions.newUserData['beatStormSetting'] = [200, 0]
    defaultOptions.info['beatStormSetting'] = {
      description: 'beatStorm限制',
      tip: '每日领取beatStorm类抽奖的设置，以\",\"分隔，分别表示每日上限、丢弃概率',
      type: 'numberArray'
    }
    whiteList.add('beatStormSetting')
    this.loaded = true
  }
  public async start({ users }: { users: Map<string, User> }) {
    this._refreshRaffleCount(users)
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
    if (cstString === '00:00') this._refreshRaffleCount(users)
    if (cstMin === 0 && cstHour % 12 === 0) {
      this._raffleBanList.clear()
      this._stormBanList.clear()
    }
  }
  public async msg({ message, options, users }: { message: raffleMessage | lotteryMessage | beatStormMessage, options: options, users: Map<string, User> }) {
    if (this._raffle) {
      users.forEach(async (user, uid) => {
        let raffleStatus = this._raffleStatus[uid]
        if (user.captchaJPEG !== '' || !user.userData[message.cmd]) return
        if (this._raffleBanList.get(uid)) return
        if (this._stormBanList.get(uid) && message.cmd === 'beatStorm') return
        if (raffleStatus !== undefined && raffleStatus[message.cmd] >= (<number[]>user.userData[`${message.cmd}Setting`])[0]) return
        const droprate = (<number[]>user.userData[`${message.cmd}Setting`])[1]
        if (droprate !== 0 && Math.random() < droprate / 100) tools.Log(user.nickname, '丢弃抽奖', message.id)
        else {
          const delay = message.cmd === 'beatStorm' ? <number>options.advConfig[`beatStormDelay`] : <number>options.advConfig[`raffleDelay`]
          await tools.Sleep(delay)
          const lottery = new Lottery(message, user)
          lottery
            .on('msg', (msg: pluginNotify) => {
              if (msg.cmd === 'ban') {
                if (msg.data.type === 'raffle') this._raffleBanList.set(msg.data.uid, true)
                else this._stormBanList.set(msg.data.uid, true)
              }
              if (msg.cmd === 'earn') this._checkSetting(msg)
              this.emit('msg', msg)
            })
            .Start()
        }
      })
    }
  }
  private async _refreshRaffleCount(users: Map<string, User>) {
    users.forEach(user => {
      this._raffleStatus[user.uid] = {
        smallTV: 0,
        raffle: 0,
        lottery: 0,
        beatStorm: 0
      }
    })
  }
  private async _checkSetting(msg: pluginNotify) {
    const { uid, type } = msg.data
    let raffleStatus = this._raffleStatus[uid]
    raffleStatus[type]++
  }
}

export default new Raffle()
