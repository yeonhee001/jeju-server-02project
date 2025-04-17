// express 호출
const express = require('express');
const app = express();

require('dotenv').config();

// cors 호출
// Network cors error 제거
const cors = require('cors')

// body-parser 호출
// front쪽 데이터를 서버에서 받기
const bodyParser = require('body-parser');

const check = require('./api/check');
const google = require('./api/google');
const kakao = require('./api/kakao');
const like = require('./api/like');
const triplike = require('./api/triplike');
const naver = require('./api/naver');
const plan = require('./api/plan');
const pickplan = require('./api/pickplan');
const post = require('./api/post');
const reply = require('./api/reply');
const weather = require('./api/weather');
const mainWeather = require('./api/mainWeather');

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use('/check', check)
app.use('/google', google)
app.use('/kakao', kakao)
app.use('/like', like)
app.use('/triplike', triplike)
app.use('/naver', naver)
app.use('/plan', plan)
app.use('/pickplan', pickplan)
app.use('/post', post)
app.use('/reply', reply)
app.use('/weather', weather)
app.use('/mainWeather', mainWeather)

app.listen(4000)