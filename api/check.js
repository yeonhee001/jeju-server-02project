const express = require('express');
const check = express.Router();

const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB
const client = new MongoClient(uri);

let collection;

async function dataCtrl(){
    await client.connect();
    const db = client.db('JejuDB');
    collection = db.collection('check');
}

async function getUser(userId){
    await dataCtrl();
    return await collection.findOne({ userId });
}

// 사용자의 모든 체크리스트 불러오기
check.get('/user/:userId', async (req, res) => {
    await dataCtrl();

    const userId = req.params.userId;
    const userData = await getUser(userId);

    if(!userData) {
        return res.status(404).json({ message: '해당 유저의 데이터가 없습니다.' });
    }

    res.json(userData.allList); 
});

// 특정 체크리스트 세부 내용 불러오기
check.get('/user/:userId/:checkId', async (req, res) => {
    await dataCtrl();

    const { userId, checkId } = req.params;
    const userData = await getUser(userId);

    if(!userData) {
        return res.status(404).json({ message: '유저 없음' });
    }

    const checklist = userData.allList.find(item => item.id === checkId);
    if(!checklist) {
        return res.status(404).json({ message: '체크리스트 없음' });
    }

    res.json(checklist);
});

// 새 체크리스트 추가
check.post('/', async (req, res) => {
    await dataCtrl();

    const { userId, newList } = req.body;
    const userData = await getUser(userId);

    if(userData) {
        // 사용자 데이터가 있을 때
        await collection.updateOne(
            { userId },
            { $push: { allList: newList }}
        );
    } else {
        // 사용자 데이터가 없을 때
        await collection.insertOne({
            userId,
            allList: [newList]
        });
    }

    res.json({ message: '새 체크리스트가 추가되었습니다.' });
});

// 특정 체크리스트 세부 내용 수정
check.put('/', async (req, res) => {
    await dataCtrl();
    
    const { userId, newList } = req.body;
    const userData = await getUser(userId);

    if(userData) {
        const listIndex = userData.allList.findIndex(list => list.id === newList.id);

        if(listIndex !== -1) {
            // 기존 체크리스트가 있다면 수정
            userData.allList[listIndex] = newList;
            await collection.updateOne(
                { userId },
                { $set: { allList: userData.allList } }
            );
            res.json({ message: '체크리스트가 수정되었습니다.' });
        }
    }
});

// 기존 체크리스트 삭제
check.put('/del', async (req, res) => {
    await dataCtrl();

    const { userId, checkId } = req.body;
    const userData = await getUser(userId);

    if(userData) {
        const newAllList = userData.allList.filter(item => item.id !== checkId);

        await collection.updateOne(
            { userId },
            { $set: { allList: newAllList } }
        );
        res.json({ message: '체크리스트가 삭제되었습니다.' });
    } else {
        res.status(404).json({ message: '유저 없음' });
    }
});




module.exports = check;