const express = require('express');
const kakao = express.Router();
const axios = require('axios');

const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB
const client = new MongoClient(uri);

let collection;

async function dataCtrl(){
    await client.connect();
    const db = client.db('JejuDB');
    collection = db.collection('kakao');
}

kakao.get('/', async function (req, res) {
    const grant_type = 'authorization_code';
    const client_id = 'f86a88750c261ba4c1ffd8113fa7f753';
    const redirect_uri = 'http://localhost:3000/login/authkakao';
    const {code} = req.query;

    // get token
    let kakao_token = await axios({
        method: 'post',
        url: 'https://kauth.kakao.com/oauth/token',
        headers: {
            'Content-Type' : 'application/x-www-form-urlencoded;charset=utf-8'
        },
        data: {
            grant_type, client_id, redirect_uri, code
        }
    })
    let kakao_access_token = kakao_token.data.access_token;

    // get user
    let kakao_user = await axios({
        method: 'get',
        url: 'https://kapi.kakao.com/v2/user/me',
        headers: {
            'Authorization' : `Bearer ${kakao_access_token}`,
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        }
    })

    await dataCtrl();

    // id=user.data.id 찾기. 있으면 1 없으면 0
    let check = await collection.find({id: kakao_user.data.id}).toArray();
    if(!check.length){
        await collection.insertOne({
            id: kakao_user.data.id,
            name: kakao_user.data.properties?.nickname
        });
        console.log('저장되었습니다.');
    }

    res.json( {...kakao_user.data, kakao_access_token} )
})

module.exports = kakao;