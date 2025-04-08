const express = require('express');
const reply = express.Router();

const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB
const client = new MongoClient(uri);

let collection;

async function dataCtrl(){
    await client.connect();
    const db = client.db('JejuDB');
    collection = db.collection('reply');
}

reply.get('/', async function (req, res) {
    
})

module.exports = reply;