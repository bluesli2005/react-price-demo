import request from 'koa-request';
import co from 'co';
import Zone from '../schemas/ZoneSchema';

const tjRegions = [
  {
    name: 'hexi',
    cname: '河西',
  },
  {
    name: 'nankai',
    cname: '南开',
  },
  {
    name: 'hedong',
    cname: '河东',
  },
  {
    name: 'hebei',
    cname: '河北',
  },
  {
    name: 'hongqiao',
    cname: '红桥',
  },
];

const tjZonesUrl = 'http://tj.lianjia.com/xiaoqu';

const delayTime = 3 * 60 * 1000; // 毫秒

function getTotalPage(body) {
  const reg = /href="xiaoqu\/".region.*?(\d+)/;
  console.log("reg", reg);
  const rs = reg.exec(body);
  let pageNum = 10;
  if (rs) {
    pageNum = rs[1];
  }
  return pageNum;
}

function getZoneCID(body) {
  const regZoneID = /xiaoqu\/.[0-9]{5,30}/g;
  const allIds = body.match(regZoneID);
  console.log("allIds", allIds);
  const zoneCID = [];
  // 每个小区的id都出现两次，循环时跳过第二次的处理
  for (let x = 0; x < allIds.length; x += 2) {
    allIds[x] = allIds[x].slice(7);
    zoneCID.push(allIds[x]);
  }
  return zoneCID;
}

function getAmountForSale(body) {
  const regAmount = /在售二手房..[0-9]{0,6}/g;
  const rawAmount = body.match(regAmount);
  let amount = 0;
  if (rawAmount && rawAmount.length > 0) {
    amount = rawAmount[0].slice(6);
  } else {
    console.error('在售二手房总数解析错误: ' + body);
  }
  return amount;
}

function getZoneInfo(body) {
  // var reg_name = /<h1>..{2,20}[\u4e00-\u9fa5_0-9_][^\s*|]/g
  const regName = /<h1 class="detailTitle">.{2,20}<\/h1>/g;
  const rawName = body.match(regName);
  console.log('zone=' + rawName);
  let data = [];
  if (rawName) {
    const name = rawName[0].slice(23, -5);
    const regXY = /xiaoqu=..{50}/g;
    let rawXY = body.match(regXY);
    console.log("rawXy",rawXY);
    if (rawXY) {
      rawXY = rawXY[0].slice(9);
      const comma1 = rawXY.indexOf(',');
      const x = rawXY.slice(0, comma1);
      rawXY = rawXY.slice(comma1 + 1);
      const comma2 = rawXY.indexOf(']');
      const y = rawXY.slice(0, comma2);
      const pos = [x, y];
      data = [pos, name];
    } else {
      console.error('小区信息解析错误:　地理位置不存在' );
      const pos = [0, 0];
      data = [pos, name];
    }
  } else {
    console.error('小区信息解析错误: ');
  }

  return data;
}

function* getZonePrice(body, propertyId) {
  // http://sh.lianjia.com/xiaoqu/getStatics.json?propertyId=5011000017872&plateId=611900136
  const regPlate = /plateId...{0,100}/g;
  const reg = /[0-9]{5,20}/g;
  const rawPlateId = body.match(regPlate);
  const plateId = rawPlateId[0].match(reg);
  const baseURL = 'http://sh.lianjia.com/xiaoqu/getStatics.json?propertyId=';
  const dataURL = baseURL + propertyId + '&plateId=' + plateId[0];

  const response = yield request({
    url: dataURL,
  });

  console.log('price url = -----', dataURL);
  const jsonData = JSON.parse(response.body);

  const update = jsonData.updateMonth;
  const avgPrice = jsonData.propertyAvg;
  const monthAvgprice = jsonData.propertyAvgList;
  const monthList = jsonData.monthList;
  const ratioYear = jsonData.propertyAvgYear;
  const ratioMonth = jsonData.propertyAvgMonth;

  const priceData = {
    update,
    avg_price: avgPrice,
    avg_price_list: monthAvgprice,
    month_list: monthList,
    ratio_month: ratioMonth,
    ratio_year: ratioYear,
  };

  return priceData;
}

function delayAPeriod(numberMillis) {
  const now = new Date();
  const exitTime = now.getTime() + numberMillis;
  while (new Date() <= exitTime) {
    // empty
  }
}

function* getZoneList() {
  const size = tjRegions.length;
  for (let i = 0; i < size; i++) {
    const region = tjRegions[i].name;
    console.log(`开始遍历-----${region}----1234`);
    const regionPageUrl = tjZonesUrl + '/' + region;
    const pageResponse = yield request({
      url: regionPageUrl,
    });
    const pageNum = getTotalPage(pageResponse.body);
    console.log(`pageNum------${pageNum}`);
    for (let j = 1; j <= pageNum; j++) {
      try {
        const regionUrl = tjZonesUrl + '/' + region + '/pg' + j + '/';
        console.log('第' + j + '页-----' + regionUrl);

        const response = yield request({
          url: regionUrl,
        });
        const zoneIDs = getZoneCID(response.body);

        for (let k = 0; k < zoneIDs.length; k++) {
          try {
            const zoneUrl = tjZonesUrl + '/' + zoneIDs[k];
            console.log('开始查询小区：' + zoneIDs[k] + '-----' + zoneUrl);

            const zoneResponse = yield request({
              url: zoneUrl,
            });
            const zoneBody = zoneResponse.body;
            const zoneInfo = getZoneInfo(zoneBody);
            //const houseForSale = getAmountForSale(zoneBody);

            //const zoneData = yield getZonePrice(zoneBody, zoneIDs[k]);

            // 新增或更新
            yield Zone.update(
              {
                cid: zoneIDs[k],
              },
              {
                city: 'tianjin',
                district: region,
                name: zoneInfo[1],
                cid: zoneIDs[k],
                x: zoneInfo[0][0],
                y: zoneInfo[0][1],
                amount: 100, //houseForSale,
                xqdata: 20000, //zoneData,
              },
              {
                upsert: true,
              }
            );

            // 延时一段时间，防止请求频率太快被服务器拒绝
            delayAPeriod(500);
          } catch (e) {
            console.error('error1------' + e);
            delayAPeriod(delayTime);
            k--;
          }
        }
      } catch (e) {
        console.error('error2------' + e);
        delayAPeriod(delayTime);
        j--;
      }
    }
  }
}

exports.getVisibleZones = function* getVisibleZones() {
  const swX = this.query.swx;
  const swY = this.query.swy;
  const neX = this.query.nex;
  const neY = this.query.ney;

  const zones = yield Zone.find({
    x: {
      $gt: swX,
      $lt: neX,
    },
    y: {
      $gt: swY,
      $lt: neY,
    },
  }).select('name x y xqdata');

  this.body = {
    zones,
  };
};

exports.searchZones = function* searchZones() {
  const zoneName = this.query.zone_name;
  const reg = new RegExp(`^.*${zoneName}.*$`);
  const zones = yield Zone.find({
    name: reg,
  });

  this.body = {
    zones,
  };
};

exports.crawler = function crawler() {
  co.wrap(getZoneList)();
  this.body = {
    state: 0,
  };
};
