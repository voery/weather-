//searchGeo.js
const app = getApp()
// const config = app.globalData.config
// const api = app.globalData.api
// const util = app.globalData.util
// const loading = app.globalData.loading
const {config, api, util, loading} = app.globalData
const regeneratorRuntime = require('../../lib/regenerator')
const indexBar = config.indexBar

Page({
  data: {
    initValue: '',
    cityList: [],
    filterCities: [],
    filterLine1: [],
    filterLine2: [],
    indexList: indexBar,
    scrollIntoViewId: 'title_0',
    barIndex: 0,
    suggList: [],
    isShowSugg:false,
    searchCls: 'no-sugg',
    title: null
  },
  ...loading,
  onLoad(){
    this.init()
  },
  async init(){
    await this.showLoading()
    await this.getCityList()
    await this.filterGuess()
    await this.hideLoading()
  },
  // 过滤猜你想找的
  filterGuess(){
    return new Promise((resolve)=>{
      const filterName = ['北京市', '上海市', '广州市', '深圳市', '武汉市']
      const cityName = ['东城区', '黄浦区', '广州市', '深圳市', '武汉市']
      let filterCities = []
      let num = 0;
      this.data.cityList.forEach(item => {
        if (cityName.includes(item.fullname)){
          let c = {...item, fullname:filterName[num]}
          filterCities.push(c)
          num++
        }
      })
      this.setData({
        filterLine1: filterCities.slice(0, 2),
        filterLine2: filterCities.slice(2),
        filterCities
      })
      resolve()
    })
  },
  // 城市列表滚动
  scroll: util.throttle(function () {
    wx.createSelectorQuery().selectAll('.city-list-title')
      .boundingClientRect(rects => {
        let index = rects.findIndex(item => {
          return item.top >= 0
        })
        if (index === -1) {
          index = rects.length
        }
        this.setIndex(index - 1)
      }).exec()
  }, 20),
  setIndex(index){
    if (this.data.barIndex === index){
      return false;
    } else {
      this.setData({
        barIndex: index
      })
    }
  },
  // 点击索引条
  tapIndexItem (event) {
    let id = event.currentTarget.dataset.item
    this.setData({
      scrollIntoViewId: `title_${id === '#'? 0 : id}`
    })

    setTimeout(() => {
      this.setData({
        barIndex: this.data.indexList.findIndex(item => item === id)
      })
    }, 500)
  },
  //获取当前定位
  tapSetCurPos(){
    wx.removeStorageSync('POSITION')
    this.navigateToIndex()
  },
  // 获取城市列表
  getCityList(){
    return new Promise((resolve, reject) => {
      api.getCityList().then(res => {
        this.setData({
          cityList: res
        })
        resolve()
      })
        .catch( err => {
          console.error(err)
          reject(err)
        })
    })
  },
  // 点击城市项
  tapCityItem (event) {
    let {fullname, location} = event.currentTarget.dataset.item;
    wx.setStorageSync(
      'POSITION', 
      JSON.stringify({
        title: fullname,
        longitude: location.lat,
        latitude: location.lng
      })
    )
    this.navigateToIndex()

  },
  // 搜索框聚焦
  focus (){
    this.setData({
      isShowSugg: true
    })
  },
  //输入关键字
  input: util.throttle(function () {
    let val = arguments[0].detail.value
    if (val === ''){
      this.setData({
        suggList: []
      })
      this.changeSearchCls()
      return false
    }

    api.getSuggestion({
      keyword: val
    })
      .then(res => {
        this.setData({
          suggList: res
        })
        this.changeSearchCls()
      })
      .catch(err => {
        console.error(err)
      })
  }, 500),
  // 改变提示样式
  changeSearchCls(){
    this.setData({
      searchCls: this.data.suggList.length ? 'has-sugg' : 'no-sugg'
    })
  },
  // 取消
  cancelSearch(){
    this.setData({
      initValue: '',
      isShowSugg: false,
      searchCls: 'no-sugg',
      suggList: []
    })
  },
  // 点击提示单元项，缓存选择的经纬度
  tapSuggItem(event){
    let {title, location} = event.currentTarget.dataset.item;
    wx.setStorageSync(
      'POSITION',
       JSON.stringify({
         title: title,
         longitude: location.lat,
         latitude: location.lng
      })
    )
    this.navigateToIndex()
  },
  // 跳转到首页
  navigateToIndex(){
    wx.navigateBack({
      url: '/pages/index/index'
    })
  }
})
