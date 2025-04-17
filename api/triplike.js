const express = require('express');
const triplike = express.Router();

const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB
const client = new MongoClient(uri);

let collection;

async function dataCtrl(){
  await client.connect();
  const db = client.db('JejuDB');
  collection = db.collection('triplike');
}


// 디테일 페이지에서 좋아요 누른거 보여주는 용
triplike.get('/', async function (req, res) {
  await dataCtrl();

  const userId = String(req.query.userId); // ← 문자로 강제 변환
  const postId = req.query.postId;
  const result = await collection.findOne({ userId, postId })

  if (result) {
    res.status(200).json({ liked: result.liked });
  } else {
    res.status(200).json({ liked: false });
  } //리액트에서 이 응답을 보고 liked 상태 파악
})


// 디테일 페이지에서 좋아요 누르고 해제하고 저장하는 용
triplike.post('/', async function (req, res) {
  console.log('POST 요청 받음:', req.body);
  await dataCtrl();

  const userId = String(req.body.userId); // ← 문자로 변환
  const postId = req.body.postId;
  const liked = req.body.liked;
  const query = { userId, postId }

  if(liked) {
    // 좋아요 추가
    await collection.updateOne(query, {
      $set: { userId, postId, liked: true } //사용자와 게시물에 해당하는 도큐먼트(컬렉션에 해당하는 데이터)가 있으면 업뎃
    }, { upsert: true }); //없으면 upsert가 새로 추가해줌
    } else {
    // 좋아요 취소
    await collection.deleteOne(query);
  }
  res.status(200).json({ liked });
})


// 특정 게시물의 전체 총 좋아요 수 가져오는 용 (어플을 사용하는 대상자 전부)
triplike.get('/count', async function (req, res) {
  await dataCtrl();
  const { postId } = req.query;

  const count = await collection.countDocuments({ postId, liked: true });
  // db.collection.countDocuments(query, options) 컬렉션과 일치하는 문서의 수를 반환
  res.status(200).json({ count }); // ex count: 3
});


// 여러 게시물의 좋아요 수를 한번에 가져오는 용 (게시물 각각의 좋아요의 총 수)
triplike.post('/count-mult', async function (req, res){
  await dataCtrl();
  const { postIds } = req.body;

  const results = await Promise.all(postIds.map(async (id) => {
    const count = await collection.countDocuments({ postId: id, liked: true });
    return { postId: id, count }; //각 게시물 id에 대한 좋아요 수 계산하는데 전부 가져올 때 까지 기다림
  }));
  res.status(200).json(results);
})

// 사용자가 좋아요 누른 게시물 목록 전부 가져오기 (하트 눌렀는지 판단하기 위해)
triplike.get('/liked-posts', async function (req, res) {
  await dataCtrl();
  const userId = String(req.query.userId); // ← 문자로 변환
  const likedDocs = await collection.find({ userId, liked: true }).toArray();
  // 사용자가 좋아요 누른 것들 모두 가져오기

  const likedPostIds = likedDocs.map(doc => doc.postId); //게시물 아이디만 추출하기 위해 map 돌려서 배열로 빼냄
  res.status(200).json({ likedPostIds });
});

module.exports = triplike;