interface Window {
  Options: Options
}
// WebSocket消息
interface message {
  cmd: string
  msg?: string
  ts?: string
  uid?: string
  data?: config | optionsInfo | string[] | userData | utilData
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
interface utilMSG extends message {
  utilID: string
  data: utilData
}
// 应用设置
interface config {
  [index: string]: number | number[] | string | string[]
}
interface userData {
  [index: string]: string | boolean | number
}
interface optionsInfo {
  [index: string]: configInfoData
}
interface configInfoData {
  description: string
  tip: string
  type: string
}
interface utilData {
  [index: string]: utilDataItem
}
interface utilDataItem {
  value: string | boolean | number | number[]
  list?: string[]
  info: configInfoData
}
