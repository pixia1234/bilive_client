interface Window {
  Options: Options
}
// WebSocket消息
interface message {
  cmd: string
  msg?: string
  ts?: string
  uid?: string
  data?: config | optionsInfo | string[] | userData
}
interface logMSG extends message {
  data: string[]
}
interface configMSG extends message {
  data: config
}
interface infoMSG extends message {
  data: optionsInfo
}
interface userMSG extends message {
  data: string[]
}
interface userDataMSG extends message {
  uid: string
  data: userData
  captcha?: string
}
// 应用设置
interface config {
  [index: string]: number | string | number[]
  defaultUserID: number
  listenNumber: number
  eventRooms: number[]
  rafflePause: number[]
  droprate: number
  adminServerChan: string
}
interface userData {
  [index: string]: string | boolean | number
  nickname: string
  userName: string
  passWord: string
  biliUID: number
  accessToken: string
  refreshToken: string
  cookie: string
  status: boolean
  getUserInfo: boolean
  getGiftBag: boolean
  doSign: boolean
  treasureBox: boolean
  silver2coin: boolean
  raffle: boolean
  appraffle: boolean
  raffleLimit: boolean
  ban: string
  eventRoom: boolean
  sendGift: boolean
  sendGiftRoom: number
  autoSend: boolean
  signGroup: boolean
}
interface optionsInfo {
  [index: string]: configInfoData
  defaultUserID: configInfoData
  eventRooms: configInfoData
  rafflePause: configInfoData
  droprate: configInfoData
  adminServerChan: configInfoData
  nickname: configInfoData
  userName: configInfoData
  passWord: configInfoData
  biliUID: configInfoData
  accessToken: configInfoData
  refreshToken: configInfoData
  cookie: configInfoData
  status: configInfoData
  getUserInfo: configInfoData
  getGiftBag: configInfoData
  doSign: configInfoData
  treasureBox: configInfoData
  silver2coin: configInfoData
  raffle: configInfoData
  appraffle: configInfoData
  raffleLimit: configInfoData
  ban: configInfoData
  eventRoom: configInfoData
  sendGift: configInfoData
  sendGiftRoom: configInfoData
  autoSend: configInfoData
  signGroup: configInfoData
}
interface configInfoData {
  description: string
  tip: string
  type: string
}
