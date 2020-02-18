import { Options as requestOptions } from 'request'
import Plugin, { tools } from '../../plugin'
class AutoActTask extends Plugin {
  constructor() {
    super()
  }
  public name = '自动活动任务'
  public description = '每天自动进行活动任务（不定期任务）'
  public version = '0.0.1'
  public author = 'Vector000'
  public async load({ defaultOptions, whiteList }: { defaultOptions: options, whiteList: Set<string> }) {
    // 自动签到
    defaultOptions.newUserData['doActTask'] = false
    defaultOptions.info['doActTask'] = {
      description: '自动活动任务',
      tip: '每天自动进行活动任务',
      type: 'boolean'
    }
    whiteList.add('doActTask')
    this.loaded = true
  }
  public async start({ users }: { users: Map<string, User> }) {
    this._doAPIs(users)
  }
  public async loop({ cstMin, cstHour, users }: { cstMin: number, cstHour: number, users: Map<string, User> }) {
    // 每天04:30, 12:30, 20:30做任务
    if (cstMin === 30 && cstHour % 8 === 4) {
      this._doAPIs(users)
    }
  }
  /**
   * 自动任务
   *
   * @private
   * @memberof AutoActTask
   */
  private _doAPIs(users: Map<string, User>) {
    users.forEach(async (user) => {
      if (!user.userData['doActTask']) return
      // 用户actAPI1（LPL签到）
      const actAPI1Description = 'LPL签到'
      const actAPI1: requestOptions = {
        method: 'POST',
        uri: `https://api.live.bilibili.com/xlive/general-interface/v1/lpl-task/MatchSign`,
        body: `room_id=7734200&game_type=25&csrf_token=${tools.getCookie(user.jar, 'bili_jct')}&csrf=${tools.getCookie(user.jar, 'bili_jct')}`,
        jar: user.jar,
        json: true
      }
      tools.XHR<generalCallback>(actAPI1).then(actAPI1Callback => {
        if (actAPI1Callback !== undefined && actAPI1Callback.response.statusCode === 200)
          tools.Log(user.nickname, '活动任务', actAPI1Description, '已完成')
      })
      // 用户actAPI2（LPL分享）
      const actAPI2Description = 'LPL分享'
      const actAPI2: requestOptions = {
        method: 'POST',
        uri: `https://api.live.bilibili.com/xlive/general-interface/v1/lpl-task/MatchShare`,
        body: `game_type=25&csrf_token=${tools.getCookie(user.jar, 'bili_jct')}&csrf=${tools.getCookie(user.jar, 'bili_jct')}`,
        jar: user.jar,
        json: true
      }
      tools.XHR<generalCallback>(actAPI2).then(actAPI2Callback => {
        if (actAPI2Callback !== undefined && actAPI2Callback.response.statusCode === 200) {
          tools.Log(user.nickname, '活动任务', actAPI2Description, '已完成')
        }
      })
      // 用户actAPI3（守望先锋签到）
      const actAPI3Description = '守望先锋签到'
      const actAPI3: requestOptions = {
        method: 'POST',
        uri: `https://api.live.bilibili.com/xlive/general-interface/v1/lpl-task/MatchSign`,
        body: `room_id=7734200&game_type=26&csrf_token=${tools.getCookie(user.jar, 'bili_jct')}&csrf=${tools.getCookie(user.jar, 'bili_jct')}`,
        jar: user.jar,
        json: true
      }
      tools.XHR<generalCallback>(actAPI3).then(actAPI3Callback => {
        if (actAPI3Callback !== undefined && actAPI3Callback.response.statusCode === 200) {
          tools.Log(user.nickname, '活动任务', actAPI3Description, '已完成')
        }
      })
      // 用户actAPI4（守望先锋分享）
      const actAPI4Description = '守望先锋分享'
      const actAPI4: requestOptions = {
        method: 'POST',
        uri: `https://api.live.bilibili.com/xlive/general-interface/v1/lpl-task/MatchShare`,
        body: `game_type=26&csrf_token=${tools.getCookie(user.jar, 'bili_jct')}&csrf=${tools.getCookie(user.jar, 'bili_jct')}`,
        jar: user.jar,
        json: true
      }
      tools.XHR<generalCallback>(actAPI4).then(actAPI4Callback => {
        if (actAPI4Callback !== undefined && actAPI4Callback.response.statusCode === 200) {
          tools.Log(user.nickname, '活动任务', actAPI4Description, '已完成')
        }
      })
    })
  }
}

interface generalCallback {
  code: number
  msg: string
  ttl: number
}

export default new AutoActTask()
