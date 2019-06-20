import fs from 'fs'
import { exec } from 'child_process'
import Plugin, { tools } from '../../plugin'
import Options from '../../options'

class AutoUpdate extends Plugin {
  constructor() {
    super()
  }
  public name = '自动更新'
  public description = '自动更新本地git，配合pm2可实现自动更新'
  public version = '0.0.3'
  public author = 'Vector000'
  public async load() {
    this.loaded = true
  }
  public async start({}, newUser: boolean) {
    if (!newUser) this._checkForUpdate()
  }
  public async loop({ cstMin, cstHour }: { cstMin: number, cstHour: number }) {
    if (cstMin === 0 && cstHour % 12 === 6) this._checkForUpdate()
  }
  // 根目录路径
  private _dirname = __dirname + '/../../..'
  /**
   * 检查当前应用目录是否有对应git仓库
   *
   * @private
   * 
   */
  private async _checkPath(dir: string) {
    if (fs.existsSync(`${dir}/.git`)) return true
    else return false
  }
  /**
   * 运行指定命令，并返回输出
   * 
   * @param {string} cmd
   * @private
   */
  private async execCMD(cmd: string) {
    return new Promise<string | undefined>(resolve => {
      exec(cmd, (error: any, stdout: any, stderr: any) => {
        if (error) {
          tools.ErrorLog(error)
          resolve()
        }
        if (stderr) {
          tools.ErrorLog(stderr)
          resolve()
        }
        resolve(stdout)
      })
    })
  }
  /**
   * git branch, 获取当前的git分支
   * 
   * @private
   */
  private async gitBranch() {
    let branch = await this.execCMD('git rev-parse --abbrev-ref --symbolic-full-name @{u}')
    if (branch === undefined) return tools.ErrorLog(`获取本地分支信息失败`)
    return branch.substr(0, branch.length-1)
  }
  /**
   * 检查更新
   * 
   * @private
   * 
   */
  private async _checkForUpdate() {
    const pathStatus = await this._checkPath(this._dirname)
    if (!pathStatus) return tools.Log(`未发现git仓库，无法进行自动更新`)
    else {
      tools.Log(`正在查询更新......`)
      let branch = await this.gitBranch()
      if (branch === undefined || branch === '') return tools.ErrorLog(`获取本地分支信息失败`)
      let localHash = await this.execCMD('git rev-parse HEAD')
      if (localHash === undefined) return tools.ErrorLog(`获取本地commit信息失败`)
      let fetchStatus = await this.execCMD('git fetch')
      if (fetchStatus === undefined) return tools.ErrorLog(`获取最新版本失败`)
      let remoteHash = await this.execCMD(`git rev-parse ${branch}`)
      if (remoteHash === undefined) return tools.ErrorLog(`获取最新版本信息失败`)
      if (localHash === remoteHash) tools.Log(`当前版本 (${branch}@${localHash.substr(0,8)}) 已是最新版本`)
      else {
        tools.Log(`发现新版本 (${branch}@${remoteHash.substr(0,8)}) 10秒后开始更新`)
        tools.emit('systemMSG', <systemMSG>{
          message: `发现新版本 即将进行自动升级`,
          options: Options._,
        })
        await this.execCMD('git merge')
        tools.Log(`正在后台编译...`)
        await this.execCMD('npm run build')
        let pm2 = await this.execCMD('pm2 restart bilive_client')
        if (pm2 === undefined) tools.Log(`PM2执行错误，无法进行自动更新，请手动更新并检查是否正确安装PM2`)
      }
    }
  }
}

export default new AutoUpdate()