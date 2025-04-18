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

//여행 일정 리스트
plan.get('/user/:userId', async function (req, res) {
    await dataCtrl();

    const userId = req.params.userId;
    const userData = await getUser(userId);

    if (!userData) {
        return res.status(404).json({ message: '해당 유저의 데이터가 없습니다.' });
    }
    
    res.json( userData.allList )
})

//여행 일정 디테일
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

//여행 추가
plan.post('/', async function (req, res) {
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
    const updatedUser = await getUser(userId);
    res.json(updatedUser.allList);
})

// 기존 일정 수정
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
    return  res.status(200).json({
        message: '수정완료',
      });
})

//삭제
plan.delete('/del', async function (req, res) {
    await dataCtrl();

    const {id, userId} = req.query
    const update = await collection.updateOne(
        { userId: userId },  // userId로 찾기
        { $pull: { allList: { id: id } } }  // allList 배열에서 id로 항목 제거
    );
    
    res.json(update)
})


module.exports = plan;