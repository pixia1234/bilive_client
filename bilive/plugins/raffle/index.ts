import Lottery from './raffle'
import Plugin, { tools } from '../../plugin'

class Raffle extends Plugin {
  constructor() {
    super()
  }
  public name = '抽奖插件'
  public description = '自动参与抽奖'
  public version = '0.0.1'
  public author = 'lzghzr'
  public loaded = false
  // 是否开启抽奖
  private _raffle = false
  // 封禁列表
  private _banList: Map<string, boolean> = new Map()
  // 限制列表
  private _raffleStatus: any = {}
  public async load({ defaultOptions, whiteList }: { defaultOptions: options, whiteList: Set<string> }) {
    // 抽奖延时
    defaultOptions.config['raffleDelay'] = 3000
    defaultOptions.info['raffleDelay'] = {
      description: '抽奖延时',
      tip: '活动抽奖, 小电视抽奖的延时, ms',
      type: 'number'
    }
    whiteList.add('raffleDelay')
    // 抽奖暂停
    defaultOptions.config['rafflePause'] = [3, 9]
    defaultOptions.info['rafflePause'] = {
      description: '抽奖暂停',
      tip: '在此时间段内不参与抽奖, 24时制, 以\",\"分隔, 只有一个时间时不启用',
      type: 'numberArray'
    }
    whiteList.add('rafflePause')
    // 抽奖概率
    defaultOptions.config['droprate'] = 0
    defaultOptions.info['droprate'] = {
      description: '丢弃概率',
      tip: '就是每个用户多少概率漏掉1个奖啦，范围0~100',
      type: 'number'
    }
    whiteList.add('droprate')
    // 节奏发包次数
    defaultOptions.config['stormSetting'] = [1000, 5]
    defaultOptions.info['stormSetting'] = {
      description: '节奏设置',
      tip: '节奏风暴的相关设置，以\",\"分隔，第一个参数为发包间隔(ms)，第二个参数为发包次数',
      type: 'numberArray'
    }
    whiteList.add('stormSetting')
    // 小电视抽奖
    defaultOptions.newUserData['smallTV'] = false
    defaultOptions.info['smallTV'] = {
      description: '小电视抽奖',
      tip: '自动参与小电视抽奖',
      type: 'boolean'
    }
    whiteList.add('smallTV')
    // smallTV限制
    defaultOptions.newUserData['smallTVLimit'] = 200
    defaultOptions.info['smallTVLimit'] = {
      description: 'smallTV限制',
      tip: '每日领取smallTV类抽奖的限制，默认为200',
      type: 'number'
    }
    whiteList.add('smallTVLimit')
    // raffle类抽奖
    defaultOptions.newUserData['raffle'] = false
    defaultOptions.info['raffle'] = {
      description: 'raffle类抽奖',
      tip: '自动参与raffle类抽奖',
      type: 'boolean'
    }
    whiteList.add('raffle')
    // raffle限制
    defaultOptions.newUserData['raffleLimit'] = 300
    defaultOptions.info['raffleLimit'] = {
      description: 'raffle限制',
      tip: '每日领取raffle类抽奖的限制，默认为300',
      type: 'number'
    }
    whiteList.add('raffleLimit')
    // lottery类抽奖
    defaultOptions.newUserData['lottery'] = false
    defaultOptions.info['lottery'] = {
      description: 'lottery类抽奖',
      tip: '自动参与lottery类抽奖',
      type: 'boolean'
    }
    whiteList.add('lottery')
    // lottery限制
    defaultOptions.newUserData['lotteryLimit'] = 5000
    defaultOptions.info['lotteryLimit'] = {
      description: 'lottery限制',
      tip: '每日领取lottery类抽奖的限制，默认为5000',
      type: 'number'
    }
    whiteList.add('lotteryLimit')
    // 节奏风暴
    defaultOptions.newUserData['beatStorm'] = false
    defaultOptions.info['beatStorm'] = {
      description: '节奏风暴',
      tip: '自动参与节奏风暴',
      type: 'boolean'
    }
    whiteList.add('beatStorm')
    // beatStorm限制
    defaultOptions.newUserData['beatStormLimit'] = 200
    defaultOptions.info['beatStormLimit'] = {
      description: 'beatStorm限制',
      tip: '每日领取beatStorm类抽奖的限制，默认为200',
      type: 'number'
    }
    whiteList.add('beatStormLimit')
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
    if (cstMin === 0 && cstHour % 12 === 0)  this._banList.clear()
  }
  public async msg({ message, options, users }: { message: raffleMessage | lotteryMessage | beatStormMessage, options: options, users: Map<string, User> }) {
    if (this._raffle) {
      users.forEach(async (user, uid) => {
        let raffleStatus = this._raffleStatus[uid]
        if (user.captchaJPEG !== '' || this._banList.get(uid) || !user.userData[message.cmd]) return
        if (raffleStatus !== undefined && raffleStatus[message.cmd] >= user.userData[`${message.cmd}Limit`]) return
        const droprate = <number>options.config['droprate']
        if (droprate !== 0 && Math.random() < droprate / 100) tools.Log(user.nickname, '丢弃抽奖', message.id)
        else {
          const lottery = new Lottery(message, user)
          lottery
            .on('msg', (msg: pluginNotify) => {
              if (msg.cmd === 'ban') this._banList.set(msg.data.uid, true)
              if (msg.cmd === 'earn') this._checkLimit(msg)
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
  private async _checkLimit(msg: pluginNotify) {
    const { uid, type } = msg.data
    let raffleStatus = this._raffleStatus[uid]
    raffleStatus[type]++
  }
}

export default new Raffle()
