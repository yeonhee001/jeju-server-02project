const express = require('express');
const axios = require('axios');
const weather = express.Router();
const { parse, format, subDays } = require('date-fns');

const now = new Date();
const hour = now.getHours();
const minute = now.getMinutes();
const before = hour < 2 || (hour === 2 && minute < 10);
const base_date = format( before ? subDays(now, 1) : now, 'yyyyMMdd');

const serviceKey = decodeURIComponent("K8Vk28tgFaV3Setxev%2FSjLml%2FGa%2BOdleeiTr7YuEGaq1mvhADIlqD3COKW4t5cP7b2%2FLYZQSsRsOgVfIQSd6HQ%3D%3D");

function getBaseTime() {
    const base = new Date(now); // 기준 날짜 복사

    // 새벽 0시 ~ 6시 10분까지는 전날 6시로 설정
    if (hour < 6 || (hour === 6 && minute <= 10)) {
        base.setDate(base.getDate() - 1);
    }

    base.setHours(6, 0, 0, 0); // 시간은 무조건 06:00

    return format(base, 'yyyyMMddHHmm'); // 예: "202504220600"
}

weather.get('/', async function (req, res) {
    const getVilageFcst = await axios.get('http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst',{
        params:{
            serviceKey,
            numOfRows : "1000",
            dataType : "JSON",
            base_date,
            base_time : "0200",
            nx : "52",
            ny : "38",
        }
    })

    const data = getVilageFcst?.data?.response?.body?.items?.item  
    
    const day = {};
    
    data?.sort((a, b) => {
        if (a.fcstDate === b.fcstDate) {
            return a.fcstTime.localeCompare(b.fcstTime);
        }
        return a.fcstDate.localeCompare(b.fcstDate);
    });

    data?.forEach((item)=>{
        let date = item.fcstDate;
        const parsedDate = parse(date, 'yyyyMMdd', new Date());
        date = (parsedDate.getMonth()+1) + '.' + parsedDate.getDate()

        if (!day[date]){
            day[date] = {
            sky: [],
            pty: [],
            tmx: undefined,
            tmn: undefined,
            }
        }

        if(item.category == "SKY"){
            day[date].sky.push(Number(item.fcstValue))
        }
        if(item.category == "PTY"){
            day[date].pty.push(Number(item.fcstValue))
        }
        if(item?.category == "TMX"){
            day[date].tmx = item.fcstValue;
        }
        if(item?.category == "TMN"){
            day[date].tmn = item.fcstValue;
        }

        });

        const a = [];

        Object.entries(day).forEach(([item, i]) => {
        let sky = "";
        let pty = "";
        
        if (i.sky.length > 0) {
            switch (Math.max(...i.sky)) {
            case 1: sky = "맑음"; break;
            case 3: sky = "구름많음"; break;
            case 4: sky = "흐림"; break;
            }
        }
        
        if (i.pty.length > 0) {
            switch (Math.max(...i.pty)) {
            case 1: pty = "비"; break;
            case 2: pty = "비/눈"; break;
            case 3: pty = "눈"; break;
            case 4: pty = "소나기"; break;
            }
        }
        const fcstValue = pty ? `${sky} / ${pty}` : sky;
        
        a.push({
            fcstDate: item,
            fcstValue,
            tmn: parseInt(i.tmn),
            tmx: parseInt(i.tmx),
        });
    });

    const filteredList = a.filter(item => {
    return !(Number.isNaN(item.tmn) && Number.isNaN(item.tmx)); //isNaN 숫자인지, 아닌지 Boolean값으로 알려줌
    });      
    const baseTime = getBaseTime();
    const getMidLandFcst = await axios.get('http://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst',{
        params:{
            serviceKey,
            numOfRows : "1000",
            dataType : "JSON",
            regId : "11G00000",
            tmFc : baseTime,
        }
    })

    const data2 = getMidLandFcst?.data?.response?.body?.items?.item
    
    const wfList = data2?.[0] && Object.entries(data2?.[0])
    .filter(([key, _]) => key.startsWith("wf") && !key.includes("Pm"))
    .reduce((acc, [key, value]) => {
        key = key.replace(/[^0-9]/g, "")
        acc[key] = value;
        
        return acc;
    }, {});

    const getMidTa = await axios.get('http://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa',{
        params:{
            serviceKey, 
            numOfRows : "1000",
            dataType : "JSON",
            regId : "11G00201",
            tmFc : baseTime,
        }
    })

    const data3 = getMidTa?.data?.response?.body?.items?.item

    const tempList = data3?.[0] && Object.entries(data3?.[0])
    .filter(([key, _]) => !["regId", "Low", "High"].some(item=>key.includes(item)))
    .reduce((acc, [key, value]) => {
        acc[key] = value;

        return acc;
    }, {});

    let b = [];
    const mTemp = {};
    for (let i = 4; i <= 10; i++) {
        mTemp[`${i}`] = [tempList[`taMin${i}`], tempList[`taMax${i}`]];
    }

    for (let i in mTemp){

        const mTempDate = new Date(); 
        const dayOffset = Number(i)
        mTempDate.setDate(now.getDate() + dayOffset);

        const date = (mTempDate.getMonth()+1) + '.' + mTempDate.getDate()

        b.push({
            fcstDate : date,
            fcstValue : wfList[i],
            tmn : mTemp[i][0],
            tmx : mTemp[i][1]
        })        
    }
    const allData = filteredList.concat(b)

    res.json(allData)
})

module.exports = weather;
