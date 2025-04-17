const express = require('express');
const google = express.Router();
const axios = require('axios');
const qs = require('qs'); 

const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB
const client = new MongoClient(uri);

let collection;

async function dataCtrl(){
    await client.connect();
    const db = client.db('JejuDB');
    collection = db.collection('google');
}

google.get('/', async function (req, res) {
    const grant_type = 'authorization_code';
    const client_id = process.env.GOOGLE_CLIENT_ID;
    const client_secret = process.env.GOOGLE_SECRET;
    const redirect_uri = 'http://localhost:3000/login/authgoogle';

    const code = req.query.code;

    // get token
    const google_token = await axios({
        method: 'post',
        url: 'https://oauth2.googleapis.com/token',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        // data: qs.stringify({ grant_type, client_id, client_secret, redirect_uri, code })
        data: { grant_type, client_id, client_secret, redirect_uri, code }
    })
    let google_access_token = google_token.data.access_token;

    // get user
    const google_user = await axios({
        method: 'get',
        url: 'https://www.googleapis.com/oauth2/v2/userinfo',
        headers: {
            'Authorization' : `Bearer ${google_access_token}`
        }
    })

    await dataCtrl();

    // userId 찾기. 있으면 1 없으면 0
    let check = await collection.find({userId: google_user.data.id}).toArray();
    if(!check.length){
        await collection.insertOne({
            userId: google_user.data.id,
            userName: google_user.data.name,
            userEmail: google_user.data.email
        });
        console.log(`${google_user.data.name}님 구글 로그인 정보가 저장되었습니다.`);
    }

    res.json( {...google_user.data, google_access_token} )
})

module.exports = google;