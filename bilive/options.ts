import { EventEmitter } from 'events'
import fs from 'fs'
import util from 'util'
const FSwriteFile = util.promisify(fs.writeFile)
/**
*
*
* @class Options
* @extends {EventEmitter}
*/
class Options extends EventEmitter {
  constructor() {
    super()
    // 根据npm start参数不同设置不同路径
    this._dirname = __dirname + (process.env.npm_package_scripts_start === 'node build/app.js' ? '/../..' : '/..')
    const blacklist = ['newUserData', 'info', 'apiIPs', 'roomList']
    // 检查是否有options目录
    const hasDir = fs.existsSync(this._dirname + '/options/')
    if (!hasDir) fs.mkdirSync(this._dirname + '/options/')
    // 读取默认设置文件
    const defaultOptionBuffer = fs.readFileSync(this._dirname + '/bilive/options.default.json')
    const defaultOption = <options>JSON.parse(defaultOptionBuffer.toString())
    // 复制默认设置文件到用户设置文件
    const hasFile = fs.existsSync(this._dirname + '/options/options.json')
    const defaultOptionPattern = <options>JSON.parse(JSON.stringify(defaultOption, (key, value) => blacklist.includes(key) ? undefined : value, 2))
    if (!hasFile) fs.writeFileSync(this._dirname + '/options/options.json', JSON.stringify(defaultOptionPattern, null, 2))
    // 读取用户设置文件
    const userOptionBuffer = fs.readFileSync(this._dirname + '/options/options.json')
    const userOption = <options>JSON.parse(userOptionBuffer.toString())
    if (defaultOption === undefined || userOption === undefined) throw new TypeError('文件格式化失败')
    // 根据defaultOption重整userOption数据项，修复升级增加功能后造成的设置文件问题
    for (const key in userOption) {
      if (key !== "user") {
        for (const key1 in defaultOption[key]) if (userOption[key][key1] === undefined) userOption[key][key1] = defaultOption[key][key1]
        for (const key1 in userOption[key]) if (defaultOption[key][key1] === undefined) delete userOption[key][key1]
      }
      else {
        for (const uid in userOption[key]) {
          for (const key1 in defaultOption.newUserData) if (userOption[key][uid][key1] === undefined) userOption[key][uid][key1] = defaultOption.newUserData[key1]
          for (const key1 in userOption[key][uid]) if (defaultOption.newUserData[key1] === undefined) delete userOption[key][uid][key1]
        }
      }
    }
    defaultOption.server = Object.assign({}, defaultOption.server, userOption.server)
    defaultOption.config = Object.assign({}, defaultOption.config, userOption.config)
    for (const uid in userOption.user)
      defaultOption.user[uid] = Object.assign({}, defaultOption.newUserData, userOption.user[uid])
    defaultOption.roomList.forEach(([long, short]) => {
      this.shortRoomID.set(long, short)
      this.longRoomID.set(short, long)
    })
    this._ = defaultOption
    this.save()
  }
  public _: options
  public user: Map<string, User> = new Map()
  private _dirname: string
  public shortRoomID = new Map<number, number>()
  public longRoomID = new Map<number, number>()
  public async save() {
    const blacklist = ['newUserData', 'info', 'apiIPs', 'roomList']
    const error = await FSwriteFile(this._dirname + '/options/options.json'
      , JSON.stringify(this._, (key, value) => blacklist.includes(key) ? undefined : value, 2))
    if (error !== undefined) console.error(`${new Date().toString().slice(4, 24)} :`, error)
    return this._
  }
}
// 自定义一些常量
const liveOrigin = 'https://live.bilibili.com'
const apiOrigin = 'https://api.bilibili.com'
const apiVCOrigin = 'https://api.vc.bilibili.com'
const apiLiveOrigin = 'https://api.live.bilibili.com'
const smallTVPathname = '/gift/v4/smalltv'
const rafflePathname = '/gift/v4/smalltv'
// const rafflePathname = '/activity/v1/Raffle'
const lotteryPathname = '/lottery/v2/Lottery'
const beatStormPathname = '/lottery/v1/Storm'
export default new Options()
export { liveOrigin, apiOrigin, apiVCOrigin, apiLiveOrigin, smallTVPathname, rafflePathname, lotteryPathname, beatStormPathname }
