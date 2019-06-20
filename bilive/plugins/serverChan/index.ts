import { Options as requestOptions } from 'request'
import Plugin, { tools } from '../../plugin'
import Options from '../../options'

class ServerChan extends Plugin {
  constructor() {
    super()
  }
  public name = 'Server酱'
  public description = '发送消息到Server酱'
  public version = '0.0.1'
  public author = 'lzghzr'
  /**
   * 获取设置
   *
   * @private
   * @type {options}
   * @memberof ServerChan
   */
  public async load({ defaultOptions, whiteList }: {
    defaultOptions: options,
    whiteList: Set<string>
  }): Promise<void> {
    // 管理员Server酱
    defaultOptions.config['adminServerChan'] = ''
    defaultOptions.info['adminServerChan'] = {
      description: 'adminSCKEY',
      tip: '管理员Server酱的SCKEY, 将信息发送到此账号，用于管理员信息',
      type: 'string'
    }
    whiteList.add('adminServerChan')
    // 用户Server酱
    defaultOptions.newUserData['serverChan'] = ''
    defaultOptions.info['serverChan'] = {
      description: 'SCKEY',
      tip: '特定用户的Server酱的SCKEY, 将信息发送到此账号，用于用户信息',
      type: 'string'
    }
    whiteList.add('serverChan')
    this.loaded = true
    tools.on('systemMSG', data => this._onSystem(data))
    tools.on('SCMSG', data => this._SCMSG(data))
    tools.sendSCMSG = (message: string) => {
      const adminServerChan = <string>Options._.config['adminServerChan']
      if (adminServerChan !== '') this._send(adminServerChan, message)
    }
  }
  /**
   * 处理systemMSG，这类信息会在程序中形成Log
   *
   * @private
   * @param {systemMSG} data
   * @memberof ServerChan
   */
  private _onSystem(data: systemMSG) {
    const adminServerChan = <string>Options._.config['adminServerChan']
    if (adminServerChan !== '') this._send(adminServerChan, data.message)
    if (data.user !== undefined) {
      const userServerChan = <string>data.user.userData['serverChan']
      if (userServerChan !== '') this._send(userServerChan, data.message)
    }
  }
  /**
   * 处理SCMSG，这类信息会直接推送，不会产生Log
   *
   * @private
   * @param {({ serverChan: string | undefined, message: string })} { serverChan, message }
   * @memberof ServerChan
   */
  private _SCMSG({ serverChan, message }: { serverChan: string | undefined, message: string }) {
    const server = serverChan || <string>Options._.config['adminServerChan']
    if (server !== '') this._send(server, message)
  }
  /**
   * 发送Server酱消息
   *
   * @private
   * @param {string} serverChan
   * @param {string} message
   * @memberof ServerChan
   */
  private _send(serverChan: string, message: string) {
    const send: requestOptions = {
      method: 'POST',
      uri: `https://sc.ftqq.com/${serverChan}.send`,
      body: `text=bilive_client&desp=${message}`,
      json: true
    }
    tools.XHR<serverChan>(send)
  }
}

/**
 * Server酱
 *
 * @interface serverChan
 */
interface serverChan {
  errno: number
  errmsg: string
  dataset: string
}

export default new ServerChan()