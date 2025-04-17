const express = require('express');
const axios = require('axios');
const weather = express.Router();
const { format } = require('date-fns');

const serviceKey = decodeURIComponent("K8Vk28tgFaV3Setxev%2FSjLml%2FGa%2BOdleeiTr7YuEGaq1mvhADIlqD3COKW4t5cP7b2%2FLYZQSsRsOgVfIQSd6HQ%3D%3D");
const now = new Date();
const base_date = format(now, 'yyyyMMdd');


function getUltraSrtNcstBaseTime() {
    // 10분 전
    now.setMinutes(now.getMinutes() - 10);
  
    const baseDate = format(now, 'yyyyMMdd');
    const baseHour = String(now.getHours()).padStart(2, '0');
  
    // base_time은 시간단위만 필요해서 분은 00으로 고정
    const base_time = `${baseHour}00`;
  
    return {
      base_date: baseDate,
      base_time: base_time
    };
  }

weather.get('/', async function (req, res) {
    const getVilageFcst = await axios.get('http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst',{
        params:{
            serviceKey,
            numOfRows : "1000",
            dataType : "JSON",
            base_date : base_date,
            base_time : "0200",
            nx : "52",
            ny : "38",
        }
    })
    const data = getVilageFcst.data.response.body.items.item

    const day = {};
    data?.forEach(item=>{
        if (item.fcstDate !== base_date) return;

        if (!day[base_date]){
            day[base_date] = {
            sky: [],
            pty: [],
            tmx: undefined,
            tmn: undefined,
            }
        }

        if(item.category == "SKY"){
            day[base_date].sky.push(Number(item.fcstValue))
        }
        if(item.category == "PTY"){
            day[base_date].pty.push(Number(item.fcstValue))
        }
        if(item?.category == "TMX"){
            day[base_date].tmx = item.fcstValue;
        }
        if(item?.category == "TMN"){
            day[base_date].tmn = item.fcstValue;
        }  
        });

        const a = [];

        Object.entries(day).forEach(([item, i]) => {
        let sky = "";
        
        if (i.sky.length > 0) {
            switch (Math.max(...i.sky)) {
            case 1: sky = "맑음"; break;
            case 3: sky = "구름 많음"; break;
            case 4: sky = "흐림"; break;
            }
        }
        
        a.push({
            fcstDate: item,
            fcstValue: sky,
            tmn: parseInt(i.tmn),
            tmx: parseInt(i.tmx),
        });
    });  

    const { base_date : Ultradate, base_time : Ultratime } = getUltraSrtNcstBaseTime();
    const getUltraSrtNcst = await axios.get('http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst',{
        params:{
            serviceKey,
            numOfRows : "1000",
            dataType : "JSON",
            base_date : Ultradate,
            base_time : Ultratime,
            nx : "52",
            ny : "38",
        }
    })

    const data2 = getUltraSrtNcst.data.response.body.items.item
    
    const day2 = {
        pty: undefined,
        wsd: undefined,
        tem: undefined,
    };

    data2?.forEach(item => {
        if (item.category === "PTY") day2.pty = Number(item.obsrValue);
        if (item.category === "WSD") day2.wsd = Number(item.obsrValue);
        if (item.category === "T1H") day2.tem = Number(item.obsrValue);
    });

    let skyText = a[0]?.fcstValue || ""; // ex: "구름 많음"
    let tmn = a[0]?.tmn;
    let tmx = a[0]?.tmx;

    let ptyText = ""; // 기본은 빈 문자열
    if (day2.pty > 0) {
        switch (day2.pty) {
            case 1: ptyText = "비"; break;
            case 2: ptyText = "비/눈"; break;
            case 3: ptyText = "눈"; break;
            case 5: ptyText = "빗방울"; break;
            case 6: ptyText = "빗방울 눈날림"; break;
            case 7: ptyText = "눈날림"; break;
        }
    }

    let fcstValue = skyText;
    if (ptyText) {
        fcstValue += ` / ${ptyText}`;
    }

    const result = [{
        fcstDate: a[0]?.fcstDate,
        fcstValue,
        wsd: day2.wsd,
        tmn,
        tmx,
        tem : day2.tem
    }];
    
    console.log(result);
    
    res.json(result)
})

module.exports = weather;