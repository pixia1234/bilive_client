import tools from './lib/tools'
import Online from './online'
import AppClient from './lib/app_client'
import Options, { liveOrigin, apiOrigin, apiVCOrigin, apiLiveOrigin } from './options'
/**
 * Creates an instance of Daily.
 *
 * @class Daily
 * @extends {Online}
 */
class Daily extends Online {
  /**
   * Creates an instance of Daily.
   * @param {string} uid
   * @param {userData} userData
   * @memberof Daily
   */
  constructor(uid: string, userData: userData) {
    super(userData)
    this.uid = uid
  }
  // 存储用户信息
  public uid: string
  // 用户状态
  private _sign = false
  private _treasureBox = false
  private _eventRoom = false
  private _silver2coin = false
  /**
   * 当账号出现异常时, 会返回'captcha'或'stop'
   * 'captcha'为登录需要验证码, 若无法处理需Stop()
   *
   * @returns {(Promise<'captcha' | 'stop' | void>)}
   * @memberof Daily
   */
  public Start(): Promise<'captcha' | 'stop' | void> {
    // @ts-ignore 继承属性
    if (!Options.user.has(this.uid)) Options.user.set(this.uid, this)
    return super.Start()
  }
  /**
   * 停止挂机
   *
   * @memberof Daily
   */
  public Stop() {
    Options.user.delete(this.uid)
    return super.Stop()
  }
  /**
   * 零点重置
   * 为了少几个定时器, 统一由外部调用
   *
   * @memberof Daily
   */
  public async nextDay() {
    // 每天刷新token和cookie
    const refresh = await this.refresh()
    if (refresh.status === AppClient.status.success) {
      this.jar = tools.setCookie(this.cookieString)
      Options.save()
    }
    else if (refresh.status === AppClient.status.error) {
      const status = await this._tokenError()
      if (status !== undefined) return this.Stop()
    }
    this._sign = false
    this._treasureBox = false
    this._eventRoom = false
    this._silver2coin = false
  }
  /**
   * 日常
   *
   * @memberof Daily
   */
  public async daily() {
    await this.sign()
    this.treasureBox()
    this.eventRoom()
    this.silver2coin()
    this.sendGift()
    this.signGroup()
    this.bilibili()
  }
  /**
   * 每日签到
   *
   * @memberof Daily
   */
  public async sign() {
    if (this._sign || !this.userData.doSign) return
    let ok = 0
    // 签到
    const signInfo = await tools.XHR<signInfo>({
      uri: `${apiLiveOrigin}/AppUser/getSignInfo?${AppClient.signQueryBase(this.tokenQuery)}`,
      json: true,
      headers: this.headers
    }, 'Android')
    if (signInfo !== undefined && signInfo.response.statusCode === 200 && signInfo.body.code === 0) {
      ok++
      tools.Log(this.nickname, '每日签到', '已签到')
    }
    // 道具包裹
    const getBagGift = await tools.XHR<getBagGift>({
      uri: `${apiLiveOrigin}/AppBag/getSendGift?${AppClient.signQueryBase(this.tokenQuery)}`,
      json: true,
      headers: this.headers
    }, 'Android')
    if (getBagGift !== undefined && getBagGift.response.statusCode === 200 && getBagGift.body.code === 0) {
      ok++
      tools.Log(this.nickname, '每日签到', '已获取每日包裹')
    }
    if (ok === 2) this._sign = true
  }
  /**
   * 每日宝箱
   *
   * @memberof Daily
   */
  public async treasureBox() {
    if (this._treasureBox || !this.userData.treasureBox) return
    if (new Date().getTime() - this.userData.banTime < 12 * 60 * 60 * 1000) return // 12h
    // 获取宝箱状态,换房间会重新冷却
    const currentTask = await tools.XHR<currentTask>({
      uri: `${apiLiveOrigin}/mobile/freeSilverCurrentTask?${AppClient.signQueryBase(this.tokenQuery)}`,
      json: true,
      headers: this.headers
    }, 'Android')
    if (currentTask !== undefined && currentTask.response.statusCode === 200) {
      if (currentTask.body.code === 0) {
        if (this.userData.ban) {
          tools.sendSCMSG(`${this.nickname} 已解除封禁`)
          this.userData.ban = false
          this.userData.banTime = 0
        }
        await tools.Sleep(currentTask.body.data.minute * 6e4)
        await tools.XHR<award>({
          uri: `${apiLiveOrigin}/mobile/freeSilverAward?${AppClient.signQueryBase(this.tokenQuery)}`,
          json: true,
          headers: this.headers
        }, 'Android')
        this.treasureBox()
      }
      else if (currentTask.body.code === -10017) {
        this._treasureBox = true
        tools.Log(this.nickname, '每日宝箱', '已领取所有宝箱')
      }
      else if (currentTask.body.code === 400) {
        if (!this.userData.ban) {
          tools.sendSCMSG(`${this.nickname} 已被封禁`)
          this.userData.ban = true
        }
        this.userData.banTime = new Date().getTime()
        return
      }
    }
    Options.save()
  }
  /**
   * 每日任务
   *
   * @memberof Daily
   */
  public async eventRoom() {
    if (this._eventRoom || !this.userData.eventRoom) return
    const doubleWatchTask = await tools.XHR<{ code: number }>({ // 做任务
      method: 'POST',
      uri: `${apiLiveOrigin}/activity/v1/task/receive_award`,
      body: `task_id=double_watch_task`,
      jar: this.jar,
      json: true,
      headers: { 'Referer': `${liveOrigin}/p/center/index` }
    })
    if (doubleWatchTask === undefined || doubleWatchTask.response.statusCode !== 200) return
    if (doubleWatchTask.body.code === 0 || doubleWatchTask.body.code === -400)
      tools.Log(this.nickname, '每日任务', '每日任务已完成')
    else tools.Log(this.nickname, '每日任务', doubleWatchTask.body)
  }
  /**
   * 银瓜子兑换硬币
   *
   * @memberof Daily
   */
  public async silver2coin() {
    if (this._silver2coin || !this.userData.silver2coin) return
    const silver2coin = await tools.XHR<silver2coin>({
      method: 'POST',
      uri: `${apiLiveOrigin}/AppExchange/silver2coin?${AppClient.signQueryBase(this.tokenQuery)}`,
      json: true,
      headers: this.headers
    }, 'Android')
    if (silver2coin === undefined || silver2coin.response.statusCode !== 200) return tools.Log(this.nickname, '银瓜子兑换硬币兑换失败')
    if (silver2coin.body.code === 0) {
      this._silver2coin = true
      tools.Log(this.nickname, '银瓜子兑换硬币', '成功兑换 1 个硬币')
    }
    else if (silver2coin.body.code === 403) {
      this._silver2coin = true
      tools.Log(this.nickname, '银瓜子兑换硬币', silver2coin.body.msg)
    }
    else tools.Log(this.nickname, '银瓜子兑换硬币', '兑换失败', silver2coin.body)
  }
  /**
   * 自动送礼
   *
   * @memberof Daily
   */
  public async sendGift() {
    if (!this.userData.sendGift || this.userData.sendGiftRoom === 0) return
    const roomID = this.userData.sendGiftRoom
    // 获取房间信息
    const roomInfo = await tools.XHR<roomInfo>({
      uri: `${apiLiveOrigin}/AppRoom/index?${AppClient.signQueryBase(`room_id=${roomID}`)}`,
      json: true
    }, 'Android')
    if (roomInfo === undefined || roomInfo.response.statusCode !== 200) return
    if (roomInfo.body.code === 0) {
      // masterID
      const mid = roomInfo.body.data.mid
      const room_id = roomInfo.body.data.room_id
      // 获取包裹信息
      const bagInfo = await tools.XHR<bagInfo>({
        uri: `${apiLiveOrigin}/gift/v2/gift/m_bag_list?${AppClient.signQueryBase(this.tokenQuery)}`,
        json: true,
        headers: this.headers
      }, 'Android')
      if (bagInfo === undefined || bagInfo.response.statusCode !== 200) return
      if (bagInfo.body.code === 0) {
        if (bagInfo.body.data.length > 0) {
          for (const giftData of bagInfo.body.data) {
            if (giftData.expireat > 0 && giftData.expireat < 12 * 60 * 60) {
              // expireat单位为分钟, 永久礼物值为0
              const sendBag = await tools.XHR<sendBag>({
                method: 'POST',
                uri: `${apiLiveOrigin}/gift/v2/live/bag_send`,
                body: AppClient.signQueryBase(`bag_id=${giftData.id}&biz_code=live&biz_id=${room_id}&gift_id=${giftData.gift_id}&gift_num=${giftData.gift_num}&ruid=${mid}&uid=${giftData.uid}&rnd=${AppClient.RND}&${this.tokenQuery}`),
                json: true,
                headers: this.headers
              }, 'Android')
              if (sendBag === undefined || sendBag.response.statusCode !== 200) continue
              if (sendBag.body.code === 0) {
                const sendBagData = sendBag.body.data
                tools.Log(this.nickname, '自动送礼', `向房间 ${roomID} 赠送 ${sendBagData.gift_num} 个${sendBagData.gift_name}`)
              }
              else tools.Log(this.nickname, '自动送礼', `向房间 ${roomID} 赠送 ${giftData.gift_num} 个${giftData.gift_name} 失败`, sendBag.body)
              await tools.Sleep(3000)
            }
          }
        }
      }
      else tools.Log(this.nickname, '自动送礼', '获取包裹信息失败', bagInfo.body)
    }
    else tools.Log(this.nickname, '自动送礼', '获取房间信息失败', roomInfo.body)
  }
  /**
   * 自动送礼V2？
   *
   * @memberof Daily
   */
  public async autoSend() {
    if (!this.userData.autoSend) return
    // 获取佩戴勋章信息
    const uid = this.userData.biliUID
    const wearInfo = await tools.XHR<wearInfo>({
      method: `POST`,
      uri: `${apiLiveOrigin}/live_user/v1/UserInfo/get_weared_medal`,
      body: `source=1&uid=${uid}&target_id=11153765&csrf_token=${tools.getCookie(this.jar, 'bili_jct')}`,//使用3号直播间查询
      json: true,
      jar: this.jar,
      headers: this.headers
    })
    if (wearInfo === undefined || wearInfo.response.statusCode !== 200 || wearInfo.body.code !== 0) return
    if (wearInfo.body.data !== null) {
      const room_id = wearInfo.body.data.roominfo.room_id
      const mid = wearInfo.body.data.roominfo.uid
      const day_limit = wearInfo.body.data.day_limit
      const today_feed = parseInt(wearInfo.body.data.today_feed)
      let intimacy_needed = day_limit - today_feed
      if (intimacy_needed === 0) return tools.Log(this.nickname,`亲密度已达上限`)
      // 获取包裹信息
      const bagInfo = await tools.XHR<bagInfo>({
        uri: `${apiLiveOrigin}/gift/v2/gift/m_bag_list?${AppClient.signQueryBase(this.tokenQuery)}`,
        json: true,
        headers: this.headers
      }, 'Android')
      if (bagInfo === undefined || bagInfo.response.statusCode !== 200) return
      if (bagInfo.body.code === 0) {
        if (bagInfo.body.data.length > 0) {
          for (const giftData of bagInfo.body.data) {
            if (giftData.expireat > 0) {
              let gift_value = 0, bag_value = 0, send_num = 0
              switch (giftData.gift_id) {// Gift_Config from http://api.live.bilibili.com/gift/v3/live/gift_config
                case 1: gift_value = 1//辣条
                break
                case 3: gift_value = 99//B坷垃
                break
                case 4: gift_value = 52//喵娘
                break
                case 6: gift_value = 10//亿圆
                break
                case 9: gift_value = 4500//爱心便当
                break
                case 10: gift_value = 19900//蓝白胖次
                break
                case 30054: gift_value = 5000//粉丝卡，什么玩意儿
                break
                default: continue
              }
              bag_value = gift_value * giftData.gift_num
              if (intimacy_needed >= bag_value) send_num = giftData.gift_num
              else send_num = Math.floor(intimacy_needed / gift_value)
              if (send_num > 0) {
                const sendBag = await tools.XHR<sendBag>({
                  method: 'POST',
                  uri: `${apiLiveOrigin}/gift/v2/live/bag_send`,
                  body: AppClient.signQueryBase(`bag_id=${giftData.id}&biz_code=live&biz_id=${room_id}&gift_id=${giftData.gift_id}&gift_num=${send_num}&ruid=${mid}&uid=${giftData.uid}&rnd=${AppClient.RND}&${this.tokenQuery}`),
                  json: true,
                  headers: this.headers
                }, 'Android')
                if (sendBag === undefined || sendBag.response.statusCode !== 200) continue
                if (sendBag.body.code === 0) {
                  const sendBagData = sendBag.body.data
                  tools.Log(this.nickname, '自动送礼V2', `向房间 ${room_id} 赠送 ${send_num} 个${sendBagData.gift_name}`)
                  intimacy_needed = intimacy_needed - send_num * gift_value
                  if (intimacy_needed === 0) return tools.Log(this.nickname,`亲密度已达上限`)
                }
                else tools.Log(this.nickname, '自动送礼V2', `向房间 ${room_id} 赠送 ${send_num} 个${giftData.gift_name} 失败`, sendBag.body)
                await tools.Sleep(5000)
              }
            }
          }
          tools.Log(this.nickname,`已完成送礼`)
        }
        else tools.Log(this.nickname,`包裹空空的`)
      }
      else tools.Log(this.nickname,`获取包裹信息失败`)
    }
    else tools.Log(this.nickname,`获取佩戴勋章信息失败`)
  }
  /**
   * 应援团签到
   *
   * @memberof Daily
   */
  public async signGroup() {
    if (!this.userData.signGroup) return
    // 获取已加入应援团列表
    const linkGroup = await tools.XHR<linkGroup>({
      uri: `${apiVCOrigin}/link_group/v1/member/my_groups?${AppClient.signQueryBase(this.tokenQuery)}`,
      json: true,
      headers: this.headers
    }, 'Android')
    if (linkGroup === undefined || linkGroup.response.statusCode !== 200) return
    if (linkGroup.body.code === 0) {
      if (linkGroup.body.data.list.length > 0) {
        for (const groupInfo of linkGroup.body.data.list) {
          const signGroup = await tools.XHR<signGroup>({
            uri: `${apiVCOrigin}/link_setting/v1/link_setting/sign_in?${AppClient.signQueryBase(`group_id=${groupInfo.group_id}&owner_id=${groupInfo.owner_uid}&${this.tokenQuery}`)}`,
            json: true,
            headers: this.headers
          }, 'Android')
          if (signGroup === undefined || signGroup.response.statusCode !== 200) continue
          if (signGroup.body.data.add_num > 0)
            tools.Log(this.nickname, '应援团签到', `在${groupInfo.group_name}签到获得 ${signGroup.body.data.add_num} 点亲密度`)
          else tools.Log(this.nickname, '应援团签到', `已在${groupInfo.group_name}签到过`)
          await tools.Sleep(3000)
        }
      }
    }
    else tools.Log(this.nickname, '应援团签到', '获取应援团列表失败', linkGroup.body)
  }
  /**
   * 获取个人信息
   *
   * @memberof Daily
   */
  public async getUserInfo() {
    if (!this.userData.getUserInfo) return
    const userInfo = await tools.XHR<userInfo>({
      uri: `${apiLiveOrigin}/User/getUserInfo?ts=${AppClient.TS}`,
      json: true,
      jar: this.jar,
      headers: this.headers
    })
    if (userInfo === undefined || userInfo.response.statusCode !== 200) return
    if (userInfo.body.code === 'REPONSE_OK') {
      const InfoData = userInfo.body.data
      let ban: string = ""
      this.userData.ban ? ban = '已封禁' : ban = '未封禁'
      tools.Log(this.nickname,`ID:${InfoData.uname}  LV${InfoData.user_level} EXP:${InfoData.user_intimacy}/${InfoData.user_next_intimacy} 排名:${InfoData.user_level_rank}`)
      tools.Log(`金瓜子：${InfoData.gold} 银瓜子：${InfoData.silver} 硬币：${InfoData.billCoin} 当前状态：${ban}`);
    }
    else tools.Log(this.nickname,'获取个人信息失败')
    let MedalNum = 0
    const medalInfo = await tools.XHR<medalInfo>({
      uri: `${apiLiveOrigin}/i/api/medal?page=1&pageSize=25`,
      json: true,
      jar: this.jar,
      headers: this.headers
    })
    if (medalInfo === undefined) return
    else {
      if (medalInfo.response.statusCode === 200 && medalInfo.body.code === 0) {
        const MedalData = medalInfo.body.data
        if (MedalData.count === 0) tools.Log(this.nickname,`无勋章`)
        else {
          MedalData.fansMedalList.forEach(Medal => {
  					if (Medal.status === 1) tools.Log(this.nickname,`佩戴勋章:${Medal.medal_name}${Medal.level} 亲密度:${Medal.intimacy}/${Medal.next_intimacy} 排名:${Medal.rank}`)
  					else MedalNum++
  				})
  				if (MedalNum === MedalData.count) tools.Log(this.nickname,`未佩戴勋章`)
        }
      }
      else tools.Log(this.nickname,'获取勋章信息失败')
    }
  }
  /**
   * 主站
   *
   * @memberof Daily
   */
   public async bilibili() {
     if (!this.userData.main) return
     let ts = new Date().getTime()
     let avs: number[] = []
     let mids: number[] = []
     const attentions = await tools.XHR<attentions>({
       uri: `${apiOrigin}/x/relation/followings?vmid=${this.biliUID}&ps=50&order=desc`,
       jar: this.jar,
       json: true,
       headers: { "Host": "api.bilibili.com" }
     })
     if (attentions !== undefined && attentions.body.data.list.length > 0) attentions.body.data.list.forEach(item => mids.push(item.mid))
     if (this.userData.mainCoin && this.userData.mainCoinGroup.length > 0) mids = this.userData.mainCoinGroup
     mids.forEach(async (mid) => {
       const getSummitVideo = await tools.XHR<getSummitVideo>({
         uri: `https://space.bilibili.com/ajax/member/getSubmitVideos?mid=${mid}&pagesize=100&tid=0`,
         json: true
       })
       if (getSummitVideo !== undefined && getSummitVideo.body.data.vlist.length > 0) getSummitVideo.body.data.vlist.forEach(item => {avs.push(item.aid)})
       await tools.Sleep(2000)
     })
     let aid = avs[Math.floor(Math.random()*(avs.length))]
     let cid = await (async function(aid) {
       const getCid = await tools.XHR<any>({
         uri: `https://www.bilibili.com/widget/getPageList?aid=${aid}`,
         json: true
       })
       if (getCid === undefined) return
       let cids = <getCid>({ data: [] })
       cids.data = <cid[]>getCid.body
       return cids.data[0].cid
     }(aid))
     const shareAV = await tools.XHR<shareAV>({
       method: 'POST',
       uri: `https://app.bilibili.com/x/v2/view/share/add`,
       body: AppClient.signQuery(`access_key=${this.accessToken}&aid=${aid}&appkey=${AppClient.appKey}&build=${AppClient.build}&from=7&mobi_app=android&platform=android&ts=${ts}`),
       jar: this.jar,
       json: true,
       headers: { "Host": "app.bilibili.com" }
     }, 'Android')
     if (shareAV !== undefined && shareAV.body.code === 0) tools.Log(this.nickname, `已完成主站分享，经验+5`)
     const avHeart = await tools.XHR<avHeart>({
       method: 'POST',
       uri: `${apiOrigin}/x/report/web/heartbeat`,
       body: `aid=${aid}&cid=${cid}&mid=${this.biliUID}&csrf=${tools.getCookie(this.jar, 'bili_jct')}&played_time=3&realtime=3&start_ts=${ts}&type=3&dt=2&play_type=1`,
       jar: this.jar,
       json: true,
       headers: {
         "Host": "api.bilibili.com",
         "Referer": `https://www.bilibili.com/video/av${aid}`
       }
     })
     if (avHeart !== undefined && avHeart.body.code === 0) tools.Log(this.nickname, `已完成主站观看，经验+5`)
     if (!this.userData.mainCoin) return
     const mainUserInfo = await tools.XHR<mainUserInfo>({
       uri: `https://account.bilibili.com/home/userInfo`,
       jar: this.jar,
       json: true,
       headers: {
         "Referer": `https://account.bilibili.com/account/home`,
         "Host": `account.bilibili.com`
       }
     })
     if (mainUserInfo === undefined) return
     let coins = mainUserInfo.body.data.coins
     const mainReward = await tools.XHR<mainReward>({
       uri: `https://account.bilibili.com/home/reward`,
       jar: this.jar,
       json: true,
       headers: {
         "Referer": `https://account.bilibili.com/account/home`,
         "Host": `account.bilibili.com`
       }
     })
     if (mainReward === undefined) return
     let coins_av = mainReward.body.data.coins_av
     while (coins > 0 && coins_av < 50 && avs.length > 0) {
       let i = Math.floor(Math.random()*(avs.length))
       let aid = avs[i]
       const coinAdd = await tools.XHR<coinAdd>({
         method: 'POST',
         uri: `${apiOrigin}/x/web-interface/coin/add`,
         body: `aid=${aid}&multiply=1&cross_domain=true&csrf=${tools.getCookie(this.jar, 'bili_jct')}`,
         jar: this.jar,
         json: true,
         headers: {
           "Referer": `https://www.bilibili.com/av${aid}`,
           "Origin": "https://www.bilibili.com",
           "Host": `api.bilibili.com`
         }
       })
       if (coinAdd === undefined || coinAdd.body.code === 34005) continue
       if (coinAdd.body.code === 0) {
         coins--
         coins_av = coins_av + 10
       }
       avs.splice(i,1)
       await tools.Sleep(2000)
     }
     tools.Log(this.nickname, `已完成主站投币，经验+${coins_av}`)
   }
}
export default Daily
