const express = require('express');
const naver = express.Router();
const axios = require('axios');

const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB
const client = new MongoClient(uri);

let collection;

async function dataCtrl(){
    await client.connect();
    const db = client.db('JejuDB');
    collection = db.collection('naver');
}

// 네이버 로그인
naver.get('/', async function (req, res) {
    const grant_type = 'authorization_code';
    const client_id = process.env.NAVER_CLIENT_ID;
    const client_secret = process.env.NAVER_SECRET;
    const redirect_uri = `${process.env.REACT_APP_APIURL}/login/authnaver`;

    const code = req.query.code;

    // get token
    let naver_token = await axios({
        method: 'post',
        url: 'https://nid.naver.com/oauth2.0/token',
        headers: {
            'Content-Type' : 'application/x-www-form-urlencoded;charset=utf-8'
        },
        params: {
            grant_type, client_id, client_secret, redirect_uri, code
        }
    })
    let naver_access_token = naver_token.data.access_token;

    // get uer
    let naver_user = await axios({
        method: 'get',
        url: 'https://openapi.naver.com/v1/nid/me',
        headers: {
            'Authorization' : `Bearer ${naver_access_token}`
        }
    })
    
    await dataCtrl();

    // userId 찾기. 있으면 1 없으면 0
    let check = await collection.find({userId: naver_user.data.response.id}).toArray();
    if(!check.length){
        await collection.insertOne({
            userId: naver_user.data.response.id,
            userName: naver_user.data.response.name,
            userEmail: naver_user.data.response.email,
        });
        console.log(`${naver_user.data.response.name}님 네이버 로그인 정보가 저장되었습니다.`);
    }

    res.json( {...naver_user.data.response, naver_access_token} )
})

// 네이버 로그아웃
naver.get('/logout', async function (req, res) {
    const access_token = req.query.token;
    const client_id = process.env.NAVER_CLIENT_ID;
    const client_secret = process.env.NAVER_SECRET;

    if (!access_token) {
        return res.status(400).json({ error: 'Access token missing' });
    }

    try {
        const logoutRes = await axios.get('https://nid.naver.com/oauth2.0/token', {
            params: {
                grant_type: 'delete',
                client_id,
                client_secret,
                access_token,
                service_provider: 'NAVER'
            }
        });

        res.json({ success: true, data: logoutRes.data });
    } catch (err) {
        console.error('[NAVER 로그아웃 실패]', err.response?.data || err.message);
        res.status(500).json({ error: 'Logout failed', detail: err.message });
    }
});

module.exports = naver;