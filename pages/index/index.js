//index.js
//获取应用实例
const app = getApp()
//配置相关的变量
const config = app.globalData.config
//api相关的变量
const api = app.globalData.api
const loading = app.globalData.loading
const util = app.globalData.util
const COND_ICON_BASE_URL = config.COND_ICON_BASE_URL
const BG_IMG_BASE_URL = config.BG_IMG_BASE_URL

const regeneratorRuntime = require('../../lib/regenerator')
//微信的chart方法
const wxCharts = require('../../lib/ wxchart')


Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    greetings: '',
    bgImgUrl: BG_IMG_BASE_URL + '/calm.jpg',
    location: '',//坐标
    geoDes: '定位中...', //地理位置描述

    nowWeather:{//实时天气数据
      tmp: 'N/A',//温度
      condTxt: '',//天气状况
      windDir: '',//风向
      windSc: '',//风力
      pres: '',//大气压
      hum: '',//湿度
      pcpn: '',//降雨量
      condIconUrl: `${COND_ICON_BASE_URL}/999.png`,//天气图标
      loc: ''//当地时间
    },
    days: ['今天', '明天', '后天'],
    canvasWidth:0,
    canvasSrc: '',
    dailyWeather: [],//逐日天气数据
    hourlyWeather: [],//逐三小时天气数据
    lifestyle: [],// 生活指数
    canIUse: wx.canIUse('button.open-type.getUserInfo')
  },
  //数据解构
  ...loading,
  onShow(){
    this.init()
  },
  // 初始化信息
  init(){
    this.showLoading()
    this.initWeatherInfo()
    this.initGreetions()
  },
  //初始化问候语
  initGreetions(){
    this.setData({
      greetings: util.getGreetings()
    })
  },
  // 跳转到搜索页
  toSearchPage(){
    wx.navigateTo({
      url: '/pages/searchGeo/searchGeo',
    })
  },
  // 初始化天气
  async initWeatherInfo(){
    //获取地址信息
    await this.getLocation()
    // 获取实时天气
    await this.getNowWeather()
    // 获取近七天天气
    await this.getDailyWeather()
    // 获取三小时天气
    await this.getHourlyWeather()
    // 生活指数
    await this.getLifestyle()
    //关闭loading框
    await this.hideLoading()
  },
  // 获取地理信息
  async getLocation (){
    let position = wx.getStorageSync('POSITION')
    position = position ? JSON.parse(position) : position
    
    if (position) {
      this.setData({
        location: `${position.longitude},${position.latitude}`,
        geoDes: position.title
      })
      return;
    }

    await api.getLocation().then((res) => {
      let {longitude, latitude } = res
      this.setData({
        location: `${longitude},${latitude}`
      })
      this.getGeoDes({
        longitude,
        latitude
      })
    }).catch((err) => {
      console.error(err)
    })
  },
  // 逆地址获取地址描述
  getGeoDes(option) {
    api.reverseGeocoder(option).then((res) => {
      let addressComponet = res.address_component
      let geoDes = `${addressComponet.city}${addressComponet.district}${addressComponet.street_number}`
      this.setData({
        geoDes
      })
    })
  },
  // 获取实时天气
  getNowWeather(){
    return new Promise((resolve, reject) => {
      api.getNowWeather({
        location: this.data.location
      })
        .then((res) => {
          let data = res.HeWeather6[0]
          if(data.status == "ok"){
            this.formatNowWeather(data)
            this.initBgImg(data.now.cond_code)
          }
          resolve()
        })
        .catch((err) => {
          console.error(err)
          reject(err)
        })
    })
  },
  // 格式化实时天气数据
  formatNowWeather(data){
    this.setData({
      nowWeather: {
        parentCity: data.basic.parent_city,
        location: data.basic.location,
        tmp: data.now.tmp,
        condTxt: data.now.cond_txt,
        windDir: data.now.wind_dir,
        windSC: data.now.wind_sc,
        windSpd: data.now.wind_spd,
        pres: data.now.pres,
        hum: data.now.hum,
        pcpn: data.now.pcpn,
        condIconUrl: `${COND_ICON_BASE_URL}/${data.now.cond_code}.png`,
        loc: data.update.loc.slice(5).replace(/-/, '/')
      }
    })
  },
  // 初始化背景
  initBgImg(code){
    let cur = config.bgImgList.find((item) => {
      return item.codes.includes(parseInt(code))
    })
    let url = BG_IMG_BASE_URL + (cur ? `/${cur.name}`:'/calm') + '.jpg'

    this.setData({
      bgImgUrl: url
    })

    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: cur.color,
      animation: {
        duration: 400,
        timingFunc: 'easeIn'
      }
    })
  },
  // 获取近七天天气
  getDailyWeather(){
    return new Promise((resolve, reject) => {
      api.getDailyWeather({
        location: this.data.location
      })
        .then(res => {
          let data = res.HeWeather6[0]
          if(data.status == "ok"){
            this.formatDailyWeather(data.daily_forecast)
            this.getDailyContainer()
          }
          resolve()
        })
        .catch(err => {
          console.error(err)
          reject(err)
        })
    })
  },
  // 格式化近七天天气数据
  formatDailyWeather(data){
    let dailyWeather = data.reduce((pre, cur, index) => {
      let date = cur.date.slice(5).replace(/-/, "/")
      pre.push({
        date: date,
        parseDate: this.data.days[index] ? this.data.days[index] : date,
        condDIconUrl: `${COND_ICON_BASE_URL}/${cur.cond_code_d}.png`,
        condNIconUrl: `${COND_ICON_BASE_URL}/${cur.cond_code_n}.png`,
        condTxtD: cur.cond_txt_d,
        condTxtN: cur.cond_txt_n,
        sr: cur.sr,
        ss: cur.ss,
        tmpMax: cur.tmp_max,
        tmpMin: cur.tmp_min,
        windDir: cur.wind_dir,
        windSc: cur.wind_sc,
        windSpd: cur.wind_spd,
        pres: cur.pres,
        vis: cur.vis
      })
      return pre
    }, [])
    this.setData({dailyWeather})
  },
  // 获取近七天天气容器的宽
  getDailyContainer(){
    const DAY = 7
    let temperatureData = this.formatTemperatureData(this.data.dailyWeather)

    wx.createSelectorQuery().select(".forecast-day")
    .fields({
      size: true
    }).exec(res => {
      this.drawTemperatureLine({
        temperatureData,
        diagramWidth: res[0].width * DAY
      })
    })
  },
  // 绘制气温折线图
  drawTemperatureLine(data){
    let {temperatureData, diagramWidth} = data
    const WIDTH = 375
    let rate = wx.getSystemInfoSync().windowWidth / WIDTH
    this.setData({
      canvasWidth: diagramWidth
    })

    new wxCharts({
      canvasId: 'canvasWeather',
      type: 'line',
      categories: temperatureData.dateArr,
      animation: false,
      config: {
        fontSize: 16 * rate,
        color: "#fff",
        paddingX: 0,
        paddingY: 30 * rate
      },
      series: [{
        name: '最高气温',
        data: temperatureData.tmpMaxArr,
        fontOffset: -8 * rate,
        format(val, name){
          return val + '℃'
        }
      },{
        name: '最低气温',
        data: temperatureData.tmpMinArr,
        fontOffset: -8 * rate,
        format(val, name){
          return val + "℃"
        }
      }],
      xAxis: {
        disableGrid: true
      },
      yAxis: {
        disableGrid: true
      },
      width: diagramWidth,
      height: 200,
      dataLabel: true,
      dataPointShape: true,
      extra: {
        lineStyle: 'curve'
      }
    })
    this.canvasToImg()
  },
  // 将canvas复制到图片
  canvasToImg(){
    setTimeout(() => {
      wx.canvasToTempFilePath({
        canvasId: 'canvasWeather',
        success: res => {
          let shareTempFilePath = res.tempFilePath;
          this.setData({
            canvasSrc: shareTempFilePath
          })
        }
      })
    }, 500)
  },
  // 格式化气温数据用于绘制折线图
  formatTemperatureData(data){
    return data.reduce((pre, cur) => {
      let {date, tmpMax, tmpMin} = cur
      pre.dateArr.push(date)
      pre.tmpMaxArr.push(tmpMax)
      pre.tmpMinArr.push(tmpMin)
      return pre
    }, {
      dateArr: [],
      tmpMaxArr: [],
      tmpMinArr: []
    })
  },
  // 获取三小时天气
  getHourlyWeather(){
    return new Promise((resolve, reject) => {
      api.getHourlyWeather({
        location: this.data.location
      })
        .then(res => {
          let data = res.HeWeather6[0].hourly
          if(data)
            this.formaHourlyWeather(data)
          resolve()
        })
        .catch(err => {
          console.error(err)
          reject(err)
        })
    })
  },
  // 格式化三小时天气数据
  formaHourlyWeather (data){
    let formatData = data.reduce((pre, cur) => {
      pre.push({
        date: cur.time.split(" ")[1],
        condIconUrl: `${COND_ICON_BASE_URL}/${cur.cond_code}.png`,
        condTxt: cur.cond_txt,
        tmp: cur.timp,
        windDir: cur.wind_dir,
        windSc: cur.wind_sc,
        windSpd: cur.wind_spd,
        pres: cur.pres
      })
      return pre
    }, [])

    let gap = 4
    let trip = Math.ceil(formatData.length / gap)
    let hourlyWeather = []
    for (let i = 0; i < trip; i++) {
      hourlyWeather.push(formatData.slice(i * gap, (i + 1) * gap))
    }
    this.setData({hourlyWeather})
  },
  // 获取生活指数
  getLifestyle(){
    return new Promise((resolve, reject) => {
      api.getLifestyle({
        location: this.data.location
      })
        .then((res) => {
          let data = res.HeWeather6[0].lifestyle
          if(data)
            this.formatLifestyle(data)
          resolve()
        })
        .catch(err => {
          console.error(err)
          reject(err)
        })
    })
  },
  //  格式化生活指数
  formatLifestyle (data) {
    const lifestyleImgList = config.lifestyleImgList
    let lifestyle = data.reduce((pre, cur) => {
      pre.push({
        brf: cur.brf,
        txt: cur.txt,
        iconUrl: lifestyleImgList[cur.type].src,
        iconTxt: lifestyleImgList[cur.type].txt
      })
      return pre
    }, [])
    this.setData({lifestyle})
  },

  onLoad: function () {
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    } else if (this.data.canIUse){
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    } else {
      // 在没有 open-type=getUserInfo 版本的兼容处理
      wx.getUserInfo({
        success: res => {
          app.globalData.userInfo = res.userInfo
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          })
        }
      })
    }
  },
  getUserInfo: function(e) {
    app.globalData.userInfo = e.detail.userInfo
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  }
})
