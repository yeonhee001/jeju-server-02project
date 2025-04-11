const express = require('express');
const reply = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const uri = process.env.MONGODB;
const client = new MongoClient(uri);
let collection;

// MongoDB 연결
async function dataCtrl() {
  if (!collection) {
    await client.connect();
    const db = client.db('JejuDB');
    collection = db.collection('reply');
  }
}

// 댓글 가져오기: 특정 postId에 대한 댓글
reply.get('/:postId', async function (req, res) {
  await dataCtrl();

  const postId = req.params.postId;

  try {
    const comments = await collection.find({ postId }).toArray();
    res.status(200).json(comments);
  } catch (err) {
    console.error('댓글 조회 실패:', err);
    res.status(500).json({ error: '댓글 조회 중 오류 발생' });
  }
});

// 댓글 수 가져오기
reply.get('/count/:postId', async function (req, res) {
  await dataCtrl();

  const postId = req.params.postId;

  try {
    const count = await collection.countDocuments({ postId });
    res.status(200).json({ postId, count });
  } catch (err) {
    console.error('댓글 수 조회 실패:', err);
    res.status(500).json({ error: '댓글 수 조회 중 오류 발생' });
  }
});

// 댓글 작성하기
reply.post('/', async function (req, res) {
  await dataCtrl();

  const { postId, userId, username, text, createdAt } = req.body;

  if (!postId || !userId || !text) {
    return res.status(400).json({ error: '필수 데이터 누락' });
  }

  const newComment = {
    postId,
    userId,
    username: username || '익명',
    text,
    createdAt: createdAt || new Date().toISOString(),
  };

  try {
    const result = await collection.insertOne(newComment);
    newComment._id = result.insertedId;
    res.status(201).json(newComment);
  } catch (err) {
    console.error('댓글 저장 실패:', err);
    res.status(500).json({ error: '댓글 저장 중 오류 발생' });
  }
});

// 댓글 삭제하기
reply.delete('/:commentId', async function (req, res) {
  await dataCtrl();

  const commentId = req.params.commentId;

  try {
    const result = await collection.deleteOne({ _id: new ObjectId(commentId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: '댓글을 찾을 수 없습니다' });
    }

    res.status(200).json({ message: '댓글 삭제 성공' });
  } catch (err) {
    console.error('댓글 삭제 실패:', err);
    res.status(500).json({ error: '댓글 삭제 중 오류 발생' });
  }
});

module.exports = reply;