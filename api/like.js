const express = require('express');
const like = express.Router();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB || "mongodb://localhost:27017";
const client = new MongoClient(uri);
let collection;
let postCollection;

async function connectDB() {
  if (!collection || !postCollection) {
    await client.connect();
    const db = client.db('JejuDB');
    collection = db.collection('like');
    postCollection = db.collection('post');
  }
}

// POST /like - 좋아요 상태 업데이트
like.post('/', async (req, res) => {
  try {
    await connectDB();

    const { postId, userId, liked } = req.body;

    if (!postId || !userId) {
      return res.status(400).json({ error: "postId와 userId가 필요합니다." });
    }

    const filter = { postId, userId };
    const update = { $set: { liked } };
    const options = { upsert: true };

    await collection.updateOne(filter, update, options);

    // 좋아요 수 갱신
    if (liked) {
      await postCollection.updateOne(
        { _id: postId },
        { $inc: { likeCount: 1 } } // 좋아요 수 증가
      );
    } else {
      await postCollection.updateOne(
        { _id: postId },
        { $inc: { likeCount: -1 } } // 좋아요 수 감소
      );
    }

    res.status(200).json({ message: "좋아요 상태가 업데이트되었습니다." });
  } catch (error) {
    console.error("좋아요 업데이트 오류:", error);
    res.status(500).json({ error: "서버 오류" });
  }
});

// GET /like - 유저의 좋아요 상태 가져오기
like.get('/', async (req, res) => {
  try {
    await connectDB();

    const { postId, userId } = req.query;

    if (!postId || !userId) {
      return res.status(400).json({ error: "postId와 userId가 필요합니다." });
    }

    const result = await collection.findOne({ postId, userId });
    res.status(200).json({ liked: result?.liked || false });
  } catch (error) {
    console.error("좋아요 상태 조회 오류:", error);
    res.status(500).json({ error: "서버 오류" });
  }
});

// GET /like/count - 좋아요 수 가져오기
like.get('/count', async (req, res) => {
  try {
    await connectDB();

    const { postId } = req.query;

    if (!postId) {
      return res.status(400).json({ error: "postId가 필요합니다." });
    }

    const count = await collection.countDocuments({ postId, liked: true });
    res.status(200).json({ count });
  } catch (error) {
    console.error("좋아요 개수 조회 오류:", error);
    res.status(500).json({ error: "서버 오류" });
  }
});

module.exports = like;