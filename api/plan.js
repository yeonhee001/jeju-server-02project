const express = require('express');
const plan = express.Router();

const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB
const client = new MongoClient(uri);

let collection;

async function dataCtrl(){
    await client.connect();
    const db = client.db('JejuDB');
    collection = db.collection('plan');
}

async function getUser(userId){
    await dataCtrl();
    return await collection.findOne({ userId });
}

plan.get('/user/:userId', async function (req, res) {
    await dataCtrl();

    const userId = req.params.userId;
    const userData = await getUser(userId);

    if (!userData) {
        return res.status(404).json({ message: '해당 유저의 데이터가 없습니다.' });
    }
    
    res.json( userData.allList )
})

plan.get('/user/:userId/:planId', async (req, res) => {
    await dataCtrl();

    const { userId, planId } = req.params;
    const userData = await getUser(userId);

    if (!userData) {
        return res.status(404).json({ message: '유저 없음' });
    }

    const planlist = userData.allList.find(item => item.id === planId);
    if (!planlist) {
        return res.status(404).json({ message: '체크리스트 없음' });
    }

    res.json( planlist );
});

plan.put('/', async function (req, res) {
    await dataCtrl();

    const { userId, newList } = req.body;
    const userData = await getUser(userId);
    
    if (userData) {
        const listIndex = userData.allList.findIndex(list => list.id === newList.id);
        if (listIndex !== -1) {
            // 기존 체크리스트가 있다면 수정
            userData.allList[listIndex] = newList;
            await collection.updateOne(
                { userId },
                { $set: { allList: userData.allList } }
            );
            console.log('저장 저장');
        }
    }
});

// 체크리스트 id 추가
plan.put('/', async function (req, res) {
    await dataCtrl();

    const { userId, planId, checkId } = req.body;
    const userData = await getUser(userId);
    
    if (userData) {
        const planIndex = userData.allList.findIndex(list => list.id === planId);
        if (planIndex !== -1) {
            // planId가 일치하는 데이터의 checkId를 수정
            userData.allList[planIndex].checkId = checkId;
            await collection.updateOne(
                { userId },
                { $set: { allList: userData.allList } }
            );
            console.log(`${userId}님의 여행(${planId})에 체크리스트 아이디(${checkId})가 추가되었습니다!`);
        }
    }
});


module.exports = plan;