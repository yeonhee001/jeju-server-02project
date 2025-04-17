const express = require('express');
const pickplan = express.Router();

const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB
const client = new MongoClient(uri);

let collection;

async function dataCtrl(){
    await client.connect();
    const db = client.db('JejuDB');
    collection = db.collection('pickplan');
}

pickplan.get('/', async function (req, res) {
    await dataCtrl();
    const result = await collection.find().toArray() //데이터 처리 (가져오기)

    res.json(result)
})

module.exports = pickplan;