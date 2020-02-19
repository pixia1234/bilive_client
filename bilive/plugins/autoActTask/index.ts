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
   * 任务列表
   * 
   * @private
   * @memberof AutoActTask 
   */
  private tasks: task[] = [
    {
      "name": "LPL签到",
      "url": "https://api.live.bilibili.com/xlive/general-interface/v1/lpl-task/MatchSign",
      "bodyStr": "room_id=7734200&game_type=25",
      "endTime": 1585843200000
    },
    {
      "name": "LPL分享",
      "url": "https://api.live.bilibili.com/xlive/general-interface/v1/lpl-task/MatchShare",
      "bodyStr": "game_type=25",
      "endTime": 1585843200000
    },
    {
      "name": "守望先锋签到",
      "url": "https://api.live.bilibili.com/xlive/general-interface/v1/lpl-task/MatchSign",
      "bodyStr": "room_id=7734200&game_type=26",
      "endTime": 1584720000000
    },
    {
      "name": "守望先锋分享",
      "url": "https://api.live.bilibili.com/xlive/general-interface/v1/lpl-task/MatchShare",
      "bodyStr": "game_type=26",
      "endTime": 1584720000000
    }
  ]
  /**
   * 自动任务
   *
   * @private
   * @memberof AutoActTask
   */
  private _doAPIs(users: Map<string, User>) {
    users.forEach(user => {
      if (!user.userData['doActTask']) return
      this.tasks.forEach(async task => {
        if (Date.now() > task.endTime) return
        const taskAPI: requestOptions = {
          method: 'POST',
          uri: task.url,
          body: `${task.bodyStr}&csrf_token=${tools.getCookie(user.jar, 'bili_jct')}&csrf=${tools.getCookie(user.jar, 'bili_jct')}`,
          jar: user.jar,
          json: true
        }
        const taskResult = await tools.XHR<taskXHR>(taskAPI)
        if (taskResult !== undefined && taskResult.response.statusCode === 200) tools.Log(user.nickname, '活动任务', task.name, '已完成')
      })
    })
  }
}

interface task {
  name: string
  url: string
  bodyStr: string
  endTime: number
}
interface taskXHR {
  code: number
  msg: string
  ttl: number
}

export default new AutoActTask()
